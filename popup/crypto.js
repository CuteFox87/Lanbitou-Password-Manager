// 加密工具類 for Chrome 擴充功能

// 常量設定
const PBKDF2_ITERATIONS = 600000; // 推導迭代次數
const LOGIN_KEY_SALT = "lanbitou-login-salt"; // 固定的登入金鑰鹽值
const LOGIN_KEY_LENGTH = 32; // 登入金鑰長度（字節）
const ENC_KEY_LENGTH = 32; // 加密密鑰長度（字節）
const IV_LENGTH = 12; // 初始向量長度（字節）

/**
 * 生成指定長度的隨機字節數組
 */
function generateRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * 使用 PBKDF2 從主密碼推導登入金鑰（Base64字串）
 */
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

    return arrayBufferToBase64(derivedBits);
  } catch (error) {
    console.error('登入金鑰推導失敗:', error);
    throw new Error('登入金鑰推導失敗');
  }
}

/**
 * 使用 PBKDF2 從主密碼和數據鹽值推導加密密鑰（ArrayBuffer）
 */
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

    return derivedBits;
  } catch (error) {
    console.error('加密密鑰推導失敗:', error);
    throw new Error('加密密鑰推導失敗');
  }
}

/**
 * 導入 AES-GCM 加密密鑰
 */
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

/**
 * 使用 AES-GCM 加密數據
 * 回傳 {ciphertext: base64, iv: base64}
 */
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
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer)
    };
  } catch (error) {
    console.error('加密失敗:', error);
    throw new Error('加密失敗');
  }
}

/**
 * 使用 AES-GCM 解密數據
 * encryptedData: {ciphertext: base64, iv: base64}
 */
async function decrypt(encryptedData, encKeyData) {
  try {
    const key = await importEncryptionKey(encKeyData);
    const cipherBuffer = base64ToArrayBuffer(encryptedData.ciphertext);
    const ivBuffer = base64ToArrayBuffer(encryptedData.iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(ivBuffer)
      },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('解密失敗:', error);
    throw new Error('解密失敗');
  }
}

/**
 * ArrayBuffer 轉 Base64 字符串
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Base64 字符串轉 ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 安全清除內存中的敏感數據
 */
function clearSensitiveData(data) {
  if (data) {
    crypto.getRandomValues(data);
    data.fill(0);
  }
}

// 讓全域可用
window.generateRandomBytes = generateRandomBytes;
window.deriveLoginKey = deriveLoginKey;
window.deriveEncryptionKey = deriveEncryptionKey;
window.importEncryptionKey = importEncryptionKey;
window.encrypt = encrypt;
window.decrypt = decrypt;
window.arrayBufferToBase64 = arrayBufferToBase64;
window.base64ToArrayBuffer = base64ToArrayBuffer;
window.clearSensitiveData = clearSensitiveData;