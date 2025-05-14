'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/layout_module/card';
import { Section } from '@/components/layout_module/section';
import { useAuth } from '@/contexts/AuthContext';
import * as apiClient from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const { login, isAuthenticated, isFirstTimeLogin, error: authError, isLoading } = useAuth();
  const router = useRouter();

  // 已登入用戶重定向
  useEffect(() => {
    if (isAuthenticated) {
      console.log('用戶已認證，檢查是否首次登入:', isFirstTimeLogin);
      
      // 添加短暫延遲，確保狀態已完全更新
      setTimeout(() => {
        // 無論是否首次登入，都導向到首頁
        console.log('導向首頁');
        router.push('/');
      }, 100);
    }
  }, [isAuthenticated, isFirstTimeLogin, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('開始登入流程，嘗試登入使用者:', email);
    
    // 使用 AuthContext 的登入函數
    const success = await login(email, password);
    
    if (success) {
      console.log('登入成功');
      // 導向邏輯在 useEffect 中處理
    } else {
      console.error('登入失敗', authError);
      // 增加登入嘗試次數
      setLoginAttempts(prevAttempts => prevAttempts + 1);
      
      // 如果多次嘗試失敗，考慮延遲或其他安全措施
      if (loginAttempts >= 3) {
        console.warn('多次登入失敗，可能需要額外安全措施');
        // 這裡可以添加延遲登入、CAPTCHA 或其他安全機制
      }
    }
  };

  // 每次訪問頁面清除登入嘗試計數
  useEffect(() => {
    // 重置登入嘗試次數
    setLoginAttempts(0);
    
    // 在這裡可以預先檢查是否有該帳戶已存儲的鹽值
    const checkSavedCredentials = async () => {
      if (email) {
        const hasSavedSalt = apiClient.getUserSalt(email) !== null;
        if (!hasSavedSalt) {
          console.log('新帳戶登入或此設備首次登入');
        }
      }
    };
    
    checkSavedCredentials();
  }, []);

  // 重置密碼功能
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setResetStatus('請填寫電子郵件和新密碼');
      return;
    }
    
    try {
      // 發送重置密碼請求到後端
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetStatus('密碼已重置，請使用新密碼登入');
        setIsResetting(false);
        // 如果開發模式下直接返回了令牌，可以自動登入
        if (data.token) {
          console.log('直接使用重置後的令牌登入');
          // 這裡可以實現自動登入邏輯
        }
      } else {
        setResetStatus(`密碼重置失敗: ${data.msg}`);
      }
    } catch (error) {
      setResetStatus('重置過程中發生錯誤，請稍後再試');
      console.error('重置密碼錯誤:', error);
    }
  };

  return (
    <Section spacing="lg" className="py-12">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
            Lanbitou 密碼管理器
            </CardTitle>
            <CardDescription className="text-center">
              {isResetting ? '重置您的密碼' : '請登入您的帳戶'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {authError && !isResetting && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <p><strong>登入失敗：</strong> {authError}</p>
                {loginAttempts >= 2 && (
                  <div className="mt-2 text-xs space-y-1">
                    <p>請確認您使用的是正確的憑證。如果您剛剛註冊了新帳戶：</p>
                    <ul className="list-disc pl-5">
                      <li>請使用相同的瀏覽器和設備登入</li>
                      <li>如果您清除了瀏覽器資料，可能需要重新註冊</li>
                      <li>請確保不要手動輸入密碼，使用您註冊時設定的密碼</li>
                    </ul>
                    <p className="mt-2">
                      <button 
                        type="button" 
                        className="text-primary hover:underline"
                        onClick={() => setIsResetting(true)}
                      >
                        重置密碼
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {resetStatus && (
              <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-600">
                {resetStatus}
              </div>
            )}

            {isResetting ? (
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    電子郵件
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    新密碼
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setIsResetting(false);
                      setResetStatus(null);
                    }}
                  >
                    返回登入
                  </button>
                  
                  <button
                    type="submit"
                    className="btn"
                  >
                    重置密碼
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    電子郵件
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    主密碼
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    輸入您註冊時設定的主密碼，該密碼用於產生登入憑證及數據加密密鑰。我們採用「零知識」架構，您的主密碼從不以明文形式傳輸或儲存。
                    <strong className="block mt-1 text-primary">請務必牢記此密碼，它將用於加密您的所有密碼條目且無法找回！</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label 
                      htmlFor="remember-me" 
                      className="text-sm text-muted-foreground"
                    >
                      記住我
                    </label>
                  </div>

                  <div>
                    <button 
                      type="button"
                      onClick={() => setIsResetting(true)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      忘記密碼?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn w-full"
                  disabled={isLoading}
                >
                  {isLoading ? '登入中...' : '登入'}
                </button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              還沒有帳戶?{' '}
              <Link 
                href="/register" 
                className="font-medium text-primary hover:underline"
              >
                立即註冊
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Section>
  );
}

