/**
 * API 客戶端
 * 
 * 封裝與後端 API 的通信方法
 */

import { isJwtValid, shouldRefreshJwt } from './jwt';
import { arrayBufferToBase64, base64ToArrayBuffer } from './crypto';

// API 基礎 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// 確保 API URL 有正確的格式
console.log('當前 API 基礎 URL:', API_BASE_URL);

// 檢查 API 可用性
(async function checkApiAvailability() {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'GET',
      mode: 'cors',
    });
    console.log(`API 可用性檢查結果: ${response.status}`);
  } catch (error) {
    console.error('API 可用性檢查失敗:', error);
    console.warn('請確保後端伺服器已啟動並且允許跨域請求 (CORS)');
  }
})();

// 本地存儲鍵
const TOKEN_KEY = 'lanbitou_auth_token';
const USER_SALT_KEY = 'lanbitou_user_salt';

// 錯誤類型
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// 用戶註冊請求類型
export interface RegisterRequest {
  email: string;
  password: string; // 這裡是密碼雜湊，不是明文密碼
}

// 用戶登入請求類型
export interface LoginRequest {
  email: string;
  password: string; // 這裡是密碼雜湊，不是明文密碼
}

// 用戶登入響應類型
export interface LoginResponse {
  token: string;
  user_id: number;
  data_salt: string;
  is_first_login: boolean;
}

// 密碼存儲請求類型
export interface PasswordStoreRequest {
  site: string;
  encrypted_data: string;
  iv: string;
}

// 後端密碼條目類型
export interface PasswordEntry {
  id: number;
  site: string;
  encrypted_data: string;
  iv: string;
  owner_id: number;
}

/**
 * 通用 API 請求方法
 */
async function apiRequest<T>(
  endpoint: string, 
  method: string = 'GET', 
  data?: unknown,
  requiresAuth: boolean = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log(`正在發送 ${method} 請求到: ${url}`);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 如果需要身份驗證，添加 JWT
  if (requiresAuth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !isJwtValid(token)) {
      throw new ApiError('身份驗證已過期，請重新登入', 401);
    }
    
    headers['Authorization'] = `Bearer ${token}`;
    
    // 檢查是否需要刷新 token
    if (shouldRefreshJwt(token)) {
      // TODO: 實現 token 刷新邏輯
      console.log('Token 即將過期，應該刷新');
    }
  }
  
  try {
    console.log('請求數據:', data);
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      mode: 'cors', // 明確指定 CORS 模式
    });
    
    console.log(`API 響應狀態: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // 如果是 401，清除本地存儲的 token
      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
      }
      
      // 嘗試解析錯誤訊息
      let errorMessage = '請求失敗';
      try {
        const errorData = await response.json();
        errorMessage = errorData.msg || errorMessage;
        console.error('API 錯誤響應:', errorData);
      } catch {
        // 無法解析 JSON，嘗試獲取文本
        try {
          const errorText = await response.text();
          console.error('API 錯誤響應文本:', errorText);
        } catch {
          // 無法獲取文本，使用預設錯誤訊息
          console.error('無法獲取錯誤響應內容');
        }
      }
      
      throw new ApiError(errorMessage, response.status);
    }
    
    const result = await response.json();
    console.log('API 響應數據:', result);
    return result as T;
  } catch (error) {
    console.error('API請求錯誤:', error);
    if (error instanceof ApiError) {
      throw error;
    } else if (error instanceof Error) {
      throw new ApiError(error.message, 0);
    } else {
      throw new ApiError('未知錯誤', 0);
    }
  }
}

/**
 * 用戶註冊
 */
export async function register(email: string, loginKey: string): Promise<{ data_salt: string }> {
  try {
    console.log('正在發送註冊請求，電子郵件:', email);
    const response = await apiRequest<{ msg: string; data_salt: string }>('/register', 'POST', { 
      email, 
      login_key: loginKey // 發送從PBKDF2推導的登入金鑰
    });
    console.log('註冊成功，收到數據鹽值');
    return { data_salt: response.data_salt };
  } catch (error) {
    console.error('註冊失敗:', error);
    throw error;
  }
}

/**
 * 用戶登入
 */
export async function login(email: string, loginKey: string): Promise<LoginResponse> {
  try {
    console.log('正在發送登入請求，電子郵件:', email);
    const response = await apiRequest<LoginResponse>('/login', 'POST', { 
      email, 
      login_key: loginKey // 發送從PBKDF2推導的登入金鑰
    });
    console.log('登入成功');
    return response;
  } catch (error) {
    console.error('登入失敗:', error);
    throw error;
  }
}

/**
 * 獲取用戶信息
 */
export async function getUserInfo(): Promise<{ id: number; email: string }> {
  return await apiRequest<{ id: number; email: string }>('/user-info', 'GET', undefined, true);
}

/**
 * 獲取所有密碼
 */
export async function getPasswords(): Promise<PasswordEntry[]> {
  try {
    console.log('正在獲取密碼列表');
    const response = await apiRequest<PasswordEntry[]>('/passwords', 'GET', undefined, true);
    console.log(`成功獲取 ${response.length} 個密碼條目`);
    return response;
  } catch (error) {
    console.error('獲取密碼列表失敗:', error);
    throw error;
  }
}

/**
 * 儲存新密碼
 */
export async function storePassword(passwordData: PasswordStoreRequest): Promise<{ msg: string }> {
  try {
    console.log('正在儲存新密碼');
    const response = await apiRequest<{ msg: string }>('/storage', 'POST', passwordData, true);
    console.log('密碼儲存成功');
    return response;
  } catch (error) {
    console.error('儲存密碼失敗:', error);
    throw error;
  }
}

/**
 * 更新密碼
 */
export async function updatePassword(
  passwordId: number | string, 
  passwordData: PasswordStoreRequest
): Promise<{ msg: string }> {
  try {
    console.log(`正在更新密碼 ID: ${passwordId}`);
    const response = await apiRequest<{ msg: string }>(
      `/storage/${passwordId}`, 
      'PUT', 
      passwordData, 
      true
    );
    console.log('密碼更新成功');
    return response;
  } catch (error) {
    console.error('更新密碼失敗:', error);
    throw error;
  }
}

/**
 * 刪除密碼
 */
export async function deletePassword(passwordId: number | string): Promise<{ msg: string }> {
  try {
    console.log(`正在刪除密碼 ID: ${passwordId}`);
    const response = await apiRequest<{ msg: string }>(
      `/storage/${passwordId}`, 
      'DELETE', 
      undefined, 
      true
    );
    console.log('密碼刪除成功');
    return response;
  } catch (error) {
    console.error('刪除密碼失敗:', error);
    throw error;
  }
}

/**
 * 儲存用戶鹽值到本地存儲
 */
export function storeUserSalt(email: string, salt: ArrayBuffer): void {
  const saltBase64 = arrayBufferToBase64(salt);
  localStorage.setItem(`${USER_SALT_KEY}_${email}`, saltBase64);
}

/**
 * 從本地存儲獲取用戶鹽值
 */
export function getUserSalt(email: string): ArrayBuffer | null {
  const saltBase64 = localStorage.getItem(`${USER_SALT_KEY}_${email}`);
  if (!saltBase64) return null;
  return base64ToArrayBuffer(saltBase64);
}

/**
 * 儲存 JWT 令牌到本地存儲
 */
export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 從本地存儲獲取 JWT 令牌
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 清除存儲的身份驗證信息（登出）
 */
export function clearAuthData(): void {
  localStorage.removeItem(TOKEN_KEY);
  // 注意：不要清除用戶鹽值，因為它需要用於後續登入
} 