document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const error = document.getElementById("error");
    error.textContent = "";

    try {
        const login_key = await deriveLoginKey(password);

        const res = await fetch("http://localhost:5000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, login_key })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.msg || "login fail");
        }

        const token = data.token;
        const dataSalt = data.data_salt;

        const masterKey = await deriveEncryptionKey(password, dataSalt);
        const masterKeyBase64 = arrayBufferToBase64(masterKey);

        await chrome.storage.local.set({ token, masterKey: masterKeyBase64 });

        window.location.href = "passwordList.html";
    }
    catch (err) {
        error.textContent = err.message;
    }
});

const PBKDF2_ITERATIONS = 600000;
const LOGIN_KEY_SALT = "lanbitou-login-salt";
const LOGIN_KEY_LENGTH = 32;
const ENC_KEY_LENGTH = 32;

async function deriveLoginKey(masterPassword) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(masterPassword);
    const salt = encoder.encode(LOGIN_KEY_SALT);
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        LOGIN_KEY_LENGTH * 8
    );
    return arrayBufferToBase64(derivedBits);
}

async function deriveEncryptionKey(masterPassword, dataSalt) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(masterPassword);
    const salt = base64ToArrayBuffer(dataSalt);
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(salt),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        ENC_KEY_LENGTH * 8
    );
    return derivedBits;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}