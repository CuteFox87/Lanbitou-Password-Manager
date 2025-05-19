function showToast(msg) {
  let toast = document.getElementById("lanbitou-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "lanbitou-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 18px";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "15px";
    toast.style.zIndex = "99999";
    toast.style.opacity = "0.95";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 1500);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < bytes.byteLength; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function encrypt(data, encKeyData) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw',
    encKeyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );
  return {
    ciphertext,
    iv: iv.buffer
  };
}

async function decrypt(encryptedData, encKeyData) {
  const key = await crypto.subtle.importKey(
    'raw',
    encKeyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(encryptedData.iv)
    },
    key,
    encryptedData.ciphertext
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const site = document.getElementById("site").value;
  const account = document.getElementById("account").value;
  const password = document.getElementById("password").value;
  const { token, masterKey } = await chrome.storage.local.get(["token", "masterKey"]);
  if (!token || !masterKey) return showToast("Please login");

  const encKeyData = base64ToArrayBuffer(masterKey);
  const plain = JSON.stringify({ account, password });
  const { ciphertext, iv } = await encrypt(plain, encKeyData);

  await fetch("http://localhost:5000/storage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      site,
      encrypted_data: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv)
    })
  });
  showToast("create success");
  location.reload();
});

document.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("passwordList");

  const { token, masterKey } = await chrome.storage.local.get(["token", "masterKey"]);
  if (!token) {
    listEl.textContent = "Please login";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/storage", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || "loading failed");

    listEl.innerHTML = "";

    const { categories = {} } = await chrome.storage.local.get("categories");

    data.forEach(async item => {
      const entry = document.createElement("div");
      entry.className = "bg-white border rounded-lg p-3 shadow mb-2 cursor-pointer transition hover:bg-gray-100";

      const categoryInput = document.createElement("input");
      categoryInput.type = "text";
      categoryInput.placeholder = "fenlei";
      categoryInput.className = "mt-2 px-2 py-1 border rounded text-sm";
      categoryInput.value = categories[item.site] || "";

      categoryInput.addEventListener("change", async (e) => {
        const { categories = {} } = await chrome.storage.local.get("categories");
        categories[item.site] = e.target.value;
        await chrome.storage.local.set({ categories });
      });

      let account = "";
      let password = "";
      try {
        if (masterKey) {
          const encKeyData = base64ToArrayBuffer(masterKey);
          const encryptedData = {
            ciphertext: base64ToArrayBuffer(item.encrypted_data),
            iv: base64ToArrayBuffer(item.iv)
          };
          const plain = await decrypt(encryptedData, encKeyData);
          const obj = JSON.parse(plain);
          account = obj.account || "";
          password = obj.password || "";
        }
      } catch {}

      entry.innerHTML = `
        <div class="font-medium text-gray-800">${item.site || "no name site"}</div>
        <div class="text-sm text-gray-600">帳號：<span class="account">${account}</span></div>
        <div class="text-sm text-gray-600">密碼：<input type="text" class="pw" value="${password}" readonly style="width:120px; background:#f3f4f6; border-radius:4px; border:1px solid #ddd; padding:2px 6px;" /></div>
        <div class="detail hidden mt-2 text-sm text-gray-600">
          <p><strong>Encrypted Data：</strong>${item.encrypted_data}</p>
          <p><strong>IV：</strong>${item.iv}</p>
        </div>
      `;

      const editBtn = document.createElement("button");
      editBtn.textContent = "edit";
      editBtn.className = "ml-2 text-blue-600";
      editBtn.onclick = async (e) => {
        e.stopPropagation();
        const { masterKey } = await chrome.storage.local.get("masterKey");
        if (!masterKey) return showToast("No masterKey");
        const encKeyData = base64ToArrayBuffer(masterKey);
        const encryptedData = {
          ciphertext: base64ToArrayBuffer(item.encrypted_data),
          iv: base64ToArrayBuffer(item.iv)
        };
        let oldAccount = account;
        let oldPassword = password;
        const newAccount = prompt("new username", oldAccount);
        const newPassword = prompt("new password", oldPassword);
        if (!newAccount || !newPassword) return;
        const plain = JSON.stringify({ account: newAccount, password: newPassword });
        const { ciphertext, iv } = await encrypt(plain, encKeyData);
        await fetch(`http://localhost:5000/storage/${item.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            site: item.site,
            encrypted_data: arrayBufferToBase64(ciphertext),
            iv: arrayBufferToBase64(iv)
          })
        });
        showToast("update");
        location.reload();
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "ml-2 text-red-600";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Delete?")) return;
        await fetch(`http://localhost:5000/storage/${item.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Delete");
        location.reload();
      };

      entry.querySelector(".pw").onclick = async function () {
        this.select();
        try {
          await navigator.clipboard.writeText(this.value);
          showToast("copied!");
        } catch {
          showToast("fail");
        }
      };

      entry.appendChild(categoryInput);
      entry.appendChild(editBtn);
      entry.appendChild(delBtn);

      entry.addEventListener("click", () => {
        const detailEl = entry.querySelector(".detail");
        detailEl.classList.toggle("hidden");
      });

      listEl.appendChild(entry);
    });

  } catch (err) {
    listEl.textContent = "error：" + err.message;
  }
});