function showToast(msg) {
  let toast = document.getElementById("lanbitou-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "lanbitou-toast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "24px", right: "24px",
      background: "#333", color: "#fff", padding: "10px 18px",
      borderRadius: "8px", fontSize: "15px", zIndex: "99999", opacity: "0.95"
    });
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 1500);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

async function encrypt(data, encKeyData) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', encKeyData, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data));
  return { ciphertext, iv: iv.buffer };
}

async function decrypt(encryptedData, encKeyData) {
  const key = await crypto.subtle.importKey('raw', encKeyData, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) }, key, encryptedData.ciphertext
  );
  return new TextDecoder().decode(decryptedBuffer);
}

document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const site = site.value, account = account.value, password = password.value;
  const { token, masterKey } = await chrome.storage.local.get(["token", "masterKey"]);
  if (!token || !masterKey) return showToast("Please login");
  const encKeyData = base64ToArrayBuffer(masterKey);
  const { ciphertext, iv } = await encrypt(JSON.stringify({ account, password }), encKeyData);
  await fetch("http://localhost:5000/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ site, encrypted_data: arrayBufferToBase64(ciphertext), iv: arrayBufferToBase64(iv) })
  });
  showToast("create success");
  location.reload();
});

document.addEventListener("DOMContentLoaded", async () => {
  const listEl = passwordList, searchInput = searchInput;
  const { token, masterKey } = await chrome.storage.local.get(["token", "masterKey"]);
  if (!token) return listEl.textContent = "Please login";
  let data = [];
  try {
    const res = await fetch("http://localhost:5000/storage", { headers: { Authorization: `Bearer ${token}` } });
    data = await res.json();
    if (!res.ok) throw new Error(data.msg || "loading failed");
  } catch (err) {
    listEl.textContent = "error：" + err.message;
    return;
  }
  const { categories = {} } = await chrome.storage.local.get("categories");

  async function renderList(filter = "") {
    listEl.innerHTML = "";
    for (const item of data) {
      let account = "", password = "";
      try {
        if (masterKey) {
          const encKeyData = base64ToArrayBuffer(masterKey);
          const encryptedData = {
            ciphertext: base64ToArrayBuffer(item.encrypted_data),
            iv: base64ToArrayBuffer(item.iv)
          };
          const obj = JSON.parse(await decrypt(encryptedData, encKeyData));
          account = obj.account || ""; password = obj.password || "";
        }
      } catch {}
      if (filter && !(item.site || "").toLowerCase().includes(filter.toLowerCase())) continue;

      const entry = document.createElement("div");
      entry.className = "bg-white border rounded-lg p-3 shadow mb-2 cursor-pointer transition hover:bg-gray-100";
      entry.innerHTML = `
        <div class="font-medium text-gray-800">${item.site || "no name site"}</div>
        <div class="text-sm text-gray-600">account：<span class="account">${account}</span></div>
        <div class="text-sm text-gray-600">password：<input type="text" class="pw" value="${password}" readonly style="width:120px; background:#f3f4f6; border-radius:4px; border:1px solid #ddd; padding:2px 6px;" /></div>
        <div class="detail hidden mt-2 text-sm text-gray-600">
          <p><strong>Encrypted Data：</strong>${item.encrypted_data}</p>
          <p><strong>IV：</strong>${item.iv}</p>
        </div>
      `;

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

      const editBtn = document.createElement("button");
      editBtn.textContent = "edit";
      editBtn.className = "ml-2 text-blue-600";
      editBtn.onclick = async (e) => {
        e.stopPropagation();
        const { masterKey } = await chrome.storage.local.get("masterKey");
        if (!masterKey) return showToast("No masterKey");
        const encKeyData = base64ToArrayBuffer(masterKey);
        const newAccount = prompt("new username", account);
        const newPassword = prompt("new password", password);
        if (!newAccount || !newPassword) return;
        const { ciphertext, iv } = await encrypt(JSON.stringify({ account: newAccount, password: newPassword }), encKeyData);
        await fetch(`http://localhost:5000/storage/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ site: item.site, encrypted_data: arrayBufferToBase64(ciphertext), iv: arrayBufferToBase64(iv) })
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
    }
  }

  renderList();
  if (searchInput) searchInput.addEventListener("input", () => renderList(searchInput.value));
});