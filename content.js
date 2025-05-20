document.addEventListener('submit', async function(e) {
  const form = e.target;
  const passwordInput = form.querySelector('input[type="password"]');
  const userInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');
  if (passwordInput && userInput) {
    const username = userInput.value;
    const password = passwordInput.value;

    const { masterKey } = await chrome.storage.local.get("masterKey");
    if (!masterKey) return;

    const encKeyData = base64ToArrayBuffer(masterKey);

    const plain = JSON.stringify({ account: username, password });
    const { ciphertext, iv } = await encrypt(plain, encKeyData);

    chrome.runtime.sendMessage({
      action: "save_password_encrypted",
      site: window.location.hostname,
      encrypted_data: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv)
    });
  }
}, true);

const IV_LENGTH = 12;

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
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

async function importEncryptionKey(keyData) {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data, encKeyData) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await importEncryptionKey(encKeyData);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  );
  return {
    ciphertext,
    iv: iv.buffer
  };
}

function insertAutofillButton() {
  if (document.getElementById("lanbitou-autofill-btn")) return; // 避免重複插入
  const btn = document.createElement("button");
  btn.id = "lanbitou-autofill-btn";
  btn.textContent = "自動填入密碼";
  btn.style.position = "fixed";
  btn.style.right = "24px";
  btn.style.bottom = "24px";
  btn.style.zIndex = "99999";
  btn.style.padding = "10px 18px";
  btn.style.background = "#2563eb";
  btn.style.color = "#fff";
  btn.style.border = "none";
  btn.style.borderRadius = "8px";
  btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "16px";
  btn.style.fontWeight = "bold";
  btn.style.opacity = "0.92";
  btn.onmouseenter = () => btn.style.opacity = "1";
  btn.onmouseleave = () => btn.style.opacity = "0.92";
  document.body.appendChild(btn);

  btn.addEventListener("click", autofillPassword);
}

async function autofillPassword() {
  const site = window.location.hostname;
  const { token, masterKey } = await chrome.storage.local.get(["token", "masterKey"]);
  if (!token || !masterKey) return;

  const res = await fetch("http://localhost:5000/storage", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const data = await res.json();

  const entry = data.find(item => item.site === site);
  if (!entry) return;

  const encKeyData = base64ToArrayBuffer(masterKey);
  const encryptedData = {
    ciphertext: base64ToArrayBuffer(entry.encrypted_data),
    iv: base64ToArrayBuffer(entry.iv)
  };
  let plain;
  try {
    plain = await decrypt(encryptedData, encKeyData);
  } catch (e) {
    return;
  }
  let account, password;
  try {
    ({ account, password } = JSON.parse(plain));
  } catch (e) {
    return;
  }

  const userInput = document.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');
  const passwordInput = document.querySelector('input[type="password"]');
  if (userInput) userInput.value = account;
  if (passwordInput) passwordInput.value = password;
}

window.addEventListener("DOMContentLoaded", insertAutofillButton);