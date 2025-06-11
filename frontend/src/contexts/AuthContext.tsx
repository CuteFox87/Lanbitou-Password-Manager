'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import * as cryptoUtils from '@/lib/crypto';
import * as apiClient from '@/lib/api';
import { isJwtValid } from '@/lib/jwt';

// 使用者資訊類型
type User = {
  id: number;
  email: string;
};

// 認證上下文類型
type AuthContextType = {
  user: User | null;
  token: string | null;
  encryptionKey: ArrayBuffer | null; // 加密密鑰
  isFirstTimeLogin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, passwordHint?: string) => Promise<boolean>;
  logout: () => void;
  setFirstTimeLoginCompleted: () => void;
  error: string | null;
};

// 創建認證上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認證提供者組件屬性
type AuthProviderProps = {
  children: ReactNode;
};

// 本地存儲鍵
const TOKEN_KEY = 'lanbitou_auth_token';
const USER_KEY = 'lanbitou_user';
const FIRST_TIME_LOGIN_KEY = 'lanbitou_first_time_login';
const ENCRYPTION_KEY_KEY = 'lanbitou_encryption_key'; // 臨時存儲加密密鑰 (安全實現應使用記憶體)
const DATA_SALT_KEY = 'lanbitou_data_salt'; // 存儲數據鹽值

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<ArrayBuffer | null>(null);
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 登出函數
  const logout = useCallback(() => {
    // 1. 清除加密密鑰
    setEncryptionKey(null);
    sessionStorage.removeItem(ENCRYPTION_KEY_KEY);
    
    // 2. 清除令牌和用戶信息
    apiClient.clearAuthData();
    localStorage.removeItem(USER_KEY);
    
    // 3. 重置狀態
    setUser(null);
    setToken(null);
    setError(null);
    setIsFirstTimeLogin(false);
    
    // 4. 導向登入頁面
    router.push('/login');
  }, [router]);

  // 檢查使用者是否已登入
  useEffect(() => {
    const checkAuthStatus = () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      // 嘗試從 sessionStorage 獲取臨時存儲的加密密鑰
      const storedEncKeyBase64 = sessionStorage.getItem(ENCRYPTION_KEY_KEY);
      const storedEncKey = storedEncKeyBase64 ? 
        cryptoUtils.base64ToArrayBuffer(storedEncKeyBase64) : null;

      if (storedToken && isJwtValid(storedToken) && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setEncryptionKey(storedEncKey);
        
        // 檢查是否首次登入 (透過本地標記)
        const firstTimeLogin = localStorage.getItem(FIRST_TIME_LOGIN_KEY) === 'true';
        setIsFirstTimeLogin(firstTimeLogin);
      } else if (storedToken && !isJwtValid(storedToken)) {
        // Token 已過期，清除存儲
        logout();
      }
      
      setIsLoading(false);
    };

    checkAuthStatus();
  }, [logout]);

  // 註冊函數
  const register = async (email: string, password: string, passwordHint?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('註冊進程開始：註冊用戶', email);
      
      // 1. 從主密碼推導登入金鑰 (使用 PBKDF2)
      const loginKey = await cryptoUtils.deriveLoginKey(password);
      
      // 2. 發送電子郵件和登入金鑰到後端
      console.log('發送註冊請求，使用登入金鑰');
      const response = await apiClient.register(email, loginKey);
      
      // 3. 保存從伺服器返回的數據鹽值
      const { data_salt } = response;
      localStorage.setItem(`${DATA_SALT_KEY}_${email}`, data_salt);
      
      // 如果提供了密碼提示，保存它
      if (passwordHint) {
        localStorage.setItem(`lanbitou_password_hint_${email}`, passwordHint);
      }
      
      console.log('註冊成功，已保存數據鹽值');
      setIsLoading(false);
      
      // 返回註冊成功
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '註冊時發生錯誤';
      console.error('註冊失敗:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  // 登入函數
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('登入進程開始：檢查用戶', email);
      
      // 1. 從主密碼推導登入金鑰 (使用 PBKDF2)
      const loginKey = await cryptoUtils.deriveLoginKey(password);
      
      // 2. 發送電子郵件和登入金鑰到後端
      console.log('發送登入請求，使用登入金鑰');
      const response = await apiClient.login(email, loginKey);
      
      // 3. 登入成功，處理伺服器回應
      const { token: jwtToken, user_id, data_salt, is_first_login } = response;
      
      // 4. 保存數據鹽值和JWT令牌
      localStorage.setItem(`${DATA_SALT_KEY}_${email}`, data_salt);
      apiClient.storeToken(jwtToken);
      
      // 5. 從主密碼和數據鹽值推導加密密鑰 (用於E2EE加密)
      console.log('從主密碼和數據鹽值生成加密密鑰');
      const encKeyData = await cryptoUtils.deriveEncryptionKey(password, data_salt);
      
      // 6. 存儲加密密鑰（用於本地加密）
      sessionStorage.setItem(ENCRYPTION_KEY_KEY, cryptoUtils.arrayBufferToBase64(encKeyData));
      
      // 7. 存儲用戶信息
      const userData = { id: user_id, email };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      
      // 8. 確保狀態更新在路由導航前完成
      setToken(jwtToken);
      setEncryptionKey(encKeyData);
      setUser(userData);
      setIsFirstTimeLogin(is_first_login);
      localStorage.setItem(FIRST_TIME_LOGIN_KEY, is_first_login.toString());
      
      // 9. 設置一個短暫延遲，確保狀態已更新後再進行導航
      setTimeout(() => {
        // 無論是否首次登入，都導向到首頁
        router.push('/'); 
        setIsLoading(false);
      }, 100);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登入時發生錯誤';
      console.error('登入失敗:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  // 設置首次登入完成
  const setFirstTimeLoginCompleted = () => {
    setIsFirstTimeLogin(false);
    localStorage.setItem(FIRST_TIME_LOGIN_KEY, 'false');
  };

  // 提供上下文值
  const contextValue: AuthContextType = {
    user,
    token,
    encryptionKey,
    isFirstTimeLogin,
    isAuthenticated: !!token && isJwtValid(token),
    isLoading,
    login,
    register,
    logout,
    setFirstTimeLoginCompleted,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定義Hook以使用認證上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必須在AuthProvider內使用');
  }
  return context;
};
