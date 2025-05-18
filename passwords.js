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

document.addEventListener("DOMContentLoaded", async () => {
  const listEl = document.getElementById("passwordList");

  const { token } = await chrome.storage.local.get("token");
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

    data.forEach(item => {
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

      entry.innerHTML = `
        <div class="font-medium text-gray-800">${item.site || "no name site"}</div>
        <div class="detail hidden mt-2 text-sm text-gray-600">
          <p><strong>Encrypted Data：</strong>${item.encrypted_data}</p>
          <p><strong>IV：</strong>${item.iv}</p>
        </div>
      `;

      const passwordInput = document.createElement("input");
      passwordInput.type = "text";
      passwordInput.readOnly = true;
      passwordInput.className = "ml-2 px-2 py-1 border rounded text-sm bg-gray-100";
      passwordInput.style.width = "120px";
      passwordInput.placeholder = "password open";

      passwordInput.addEventListener("click", async (e) => {
        if (passwordInput.value) {
          passwordInput.select();
          try {
            await navigator.clipboard.writeText(passwordInput.value);
            showToast("copied!");
          } catch {
            showToast("fail");
          }
          return;
        }
        const { masterKey } = await chrome.storage.local.get("masterKey");
        if (!masterKey) return;
        const encKeyData = base64ToArrayBuffer(masterKey);
        const encryptedData = {
          ciphertext: base64ToArrayBuffer(item.encrypted_data),
          iv: base64ToArrayBuffer(item.iv)
        };
        try {
          const plain = await decrypt(encryptedData, encKeyData);
          const { password } = JSON.parse(plain);
          passwordInput.value = password;
          passwordInput.select();
          await navigator.clipboard.writeText(password);
          showToast("copied!");
        } catch {
          showToast("fail");
        }
      });

      entry.appendChild(categoryInput);
      entry.appendChild(passwordInput);

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