/**
 * 加密工具類
 * 
 * 實現基於 Web Crypto API 的加密功能：
 * - PBKDF2 密鑰推導：將使用者的「主密碼」轉化為高強度的對稱金鑰
 * - AES-GCM 加解密
 * - 安全隨機數生成
 */

// 常量設定
const PBKDF2_ITERATIONS = 600000; // 推導迭代次數
const LOGIN_KEY_SALT = "lanbitou-login-salt"; // 固定的登入金鑰鹽值
const LOGIN_KEY_LENGTH = 32; // 登入金鑰長度（字節）
const ENC_KEY_LENGTH = 32; // 加密密鑰長度（字節）
const IV_LENGTH = 12; // 初始向量長度（字節）

// 類型定義
export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
}

/**
 * 生成指定長度的隨機字節數組
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * 使用 PBKDF2 從主密碼推導登入金鑰
 * 這個金鑰將發送到伺服器進行驗證
 * 使用固定的鹽值確保多次生成相同結果
 */
export async function deriveLoginKey(masterPassword: string): Promise<string> {
  try {
    // 將密碼轉換為二進制格式
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(masterPassword);
    const salt = encoder.encode(LOGIN_KEY_SALT);
    
    // 從密碼導入密鑰
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // 推導登入金鑰
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      LOGIN_KEY_LENGTH * 8 // 轉換為位
    );
    
    // 轉換為 Base64 字符串以便發送給伺服器
    return arrayBufferToBase64(derivedBits);
  } catch (error) {
    console.error('登入金鑰推導失敗:', error);
    throw new Error('登入金鑰推導失敗');
  }
}

/**
 * 使用 PBKDF2 從主密碼和數據鹽值推導加密密鑰
 * 這個密鑰只在客戶端使用，用於加密和解密數據
 */
export async function deriveEncryptionKey(
  masterPassword: string, 
  dataSalt: string // 從伺服器獲取的 Base64 編碼數據鹽值
): Promise<ArrayBuffer> {
  try {
    // 將密碼轉換為二進制格式
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(masterPassword);
    const salt = base64ToArrayBuffer(dataSalt);
    
    // 從密碼導入密鑰
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // 推導加密密鑰
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      ENC_KEY_LENGTH * 8 // 轉換為位
    );
    
    return derivedBits;
  } catch (error) {
    console.error('加密密鑰推導失敗:', error);
    throw new Error('加密密鑰推導失敗');
  }
}

/**
 * 從二進制導入 AES-GCM 加密密鑰
 */
export async function importEncryptionKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: ENC_KEY_LENGTH * 8 // 轉換為位
    },
    false, // 不可導出
    ['encrypt', 'decrypt']
  );
}

/**
 * 使用 AES-GCM 加密數據
 */
export async function encrypt(data: string, encKeyData: ArrayBuffer): Promise<EncryptedData> {
  try {
    // 生成隨機初始向量
    const iv = generateRandomBytes(IV_LENGTH);
    
    // 導入加密密鑰
    const key = await importEncryptionKey(encKeyData);
    
    // 將數據轉換為二進制
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // 加密數據
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
      iv: iv.buffer as ArrayBuffer
    };
  } catch (error) {
    console.error('加密失敗:', error);
    throw new Error('加密失敗');
  }
}

/**
 * 使用 AES-GCM 解密數據
 */
export async function decrypt(
  encryptedData: EncryptedData, 
  encKeyData: ArrayBuffer
): Promise<string> {
  try {
    // 導入加密密鑰
    const key = await importEncryptionKey(encKeyData);
    
    // 解密數據
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(encryptedData.iv)
      },
      key,
      encryptedData.ciphertext
    );
    
    // 將二進制轉換為字符串
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('解密失敗:', error);
    throw new Error('解密失敗');
  }
}

/**
 * 將 ArrayBuffer 轉換為 Base64 字符串
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 將 Base64 字符串轉換為 ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/**
 * 安全清除內存中的敏感數據
 */
export function clearSensitiveData(data: Uint8Array | null): void {
  if (data) {
    crypto.getRandomValues(data); // 用隨機數覆蓋
    data.fill(0); // 再用零填充
  }
} 