const PBKDF2_ITERATIONS = 600000;
const LOGIN_KEY_SALT = "lanbitou-login-salt";
const LOGIN_KEY_LENGTH = 32;
const ENC_KEY_LENGTH = 32;
const IV_LENGTH = 12;

function generateRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveLoginKey(masterPassword) {
  try {
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

    return arrayBufferToBase64(derivedBits); // 回傳 base64 字串
  } catch (error) {
    console.error('登入金鑰推導失敗:', error);
    throw new Error('登入金鑰推導失敗');
  }
}

async function deriveEncryptionKey(masterPassword, dataSalt) {
  try {
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

    return derivedBits; // 直接回傳 ArrayBuffer
  } catch (error) {
    console.error('加密密鑰推導失敗:', error);
    throw new Error('加密密鑰推導失敗');
  }
}

async function importEncryptionKey(keyData) {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: ENC_KEY_LENGTH * 8
    },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data, encKeyData) {
  try {
    const iv = generateRandomBytes(IV_LENGTH);
    const key = await importEncryptionKey(encKeyData);
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
      ciphertext: ciphertext, // ArrayBuffer
      iv: iv.buffer           // ArrayBuffer
    };
  } catch (error) {
    console.error('加密失敗:', error);
    throw new Error('加密失敗');
  }
}

async function decrypt(encryptedData, encKeyData) {
  try {
    const key = await importEncryptionKey(encKeyData);

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
  } catch (error) {
    console.error('解密失敗:', error);
    throw new Error('解密失敗');
  }
}

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

function clearSensitiveData(data) {
  if (data) {
    crypto.getRandomValues(data);
    data.fill(0);
  }
}

window.generateRandomBytes = generateRandomBytes;
window.deriveLoginKey = deriveLoginKey;
window.deriveEncryptionKey = deriveEncryptionKey;
window.importEncryptionKey = importEncryptionKey;
window.encrypt = encrypt;
window.decrypt = decrypt;
window.arrayBufferToBase64 = arrayBufferToBase64;
window.base64ToArrayBuffer = base64ToArrayBuffer;
window.clearSensitiveData = clearSensitiveData;