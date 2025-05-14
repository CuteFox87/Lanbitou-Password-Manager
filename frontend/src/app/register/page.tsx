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

// 密碼強度評估
const assessPasswordStrength = (password: string): { score: number; feedback: string } => {
  let score = 0;
  let feedback = "";

  // 長度檢查
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // 複雜度檢查
  if (/[A-Z]/.test(password)) score += 1;  // 大寫字母
  if (/[a-z]/.test(password)) score += 1;  // 小寫字母
  if (/[0-9]/.test(password)) score += 1;  // 數字
  if (/[^A-Za-z0-9]/.test(password)) score += 1;  // 特殊字符

  // 根據分數提供反饋
  if (score <= 2) {
    feedback = "弱：建議使用更複雜的密碼";
  } else if (score <= 4) {
    feedback = "中等：可以再增加一些複雜度";
  } else {
    feedback = "強：這是一個強密碼";
  }

  return { score, feedback };
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [formError, setFormError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" });
  const { register, isAuthenticated, isFirstTimeLogin, error: authError, isLoading } = useAuth();
  const router = useRouter();

  // 已登入用戶重定向
  useEffect(() => {
    if (isAuthenticated) {
      // 無論是否首次登入，都導向到首頁
      router.push('/');
    }
  }, [isAuthenticated, isFirstTimeLogin, router]);

  // 密碼匹配檢查
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordsMatch(false);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);

  // 密碼強度評估
  useEffect(() => {
    if (password) {
      setPasswordStrength(assessPasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: "" });
    }
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setRegistrationSuccess(false);

    // 驗證輸入
    if (!email || !password || !confirmPassword) {
      setFormError('請填寫所有必填欄位');
      return;
    }

    if (password.length < 8) {
      setFormError('密碼必須至少8個字符');
      return;
    }

    if (!passwordsMatch) {
      setFormError('密碼不匹配');
      return;
    }

    // 如果密碼強度太弱，給出警告但允許繼續
    if (passwordStrength.score <= 2) {
      if (!window.confirm('您的密碼強度較弱，這可能導致安全風險。確定要繼續嗎？')) {
        return;
      }
    }

    // 使用 AuthContext 的註冊函數，傳遞密碼提示
    const success = await register(email, password, passwordHint);

    if (success) {
      console.log('註冊成功');
      setRegistrationSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPasswordHint('');
    }
  };

  // 生成密碼強度指示器的顏色
  const getStrengthColor = (score: number) => {
    if (score <= 2) return "bg-red-500";
    if (score <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (registrationSuccess) {
    return (
      <Section spacing="lg" className="py-12">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                註冊成功
              </CardTitle>
              <CardDescription className="text-center">
                您的藍筆頭密碼管理器帳戶已創建
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="mb-6 rounded-md bg-green-100 p-4 text-green-800">
                <p>您的帳戶已成功創建。請使用您設定的主密碼登入。</p>
                <p className="mt-2 text-sm">主密碼是您剛才設定的密碼，用於：</p>
                <ul className="list-disc ml-5 mt-1 text-sm">
                  <li>身份驗證 - 系統不儲存您的主密碼，只儲存其衍生值</li>
                  <li>數據加密 - 所有密碼條目採用端到端加密，伺服器永不見明文</li>
                </ul>
                <p className="mt-2 text-xs font-semibold">請牢記您的主密碼，它無法恢復！</p>
              </div>
              
              <Link 
                href="/login" 
                className="btn w-full block text-center"
              >
                前往登入
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>
    );
  }

  return (
    <Section spacing="lg" className="py-12">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              註冊帳戶
            </CardTitle>
            <CardDescription className="text-center">
              建立您的藍筆頭密碼管理器帳戶
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {(formError || authError) && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError || authError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleRegister}>
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
                  密碼
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
                {password && (
                  <div className="mt-1">
                    <div className="flex items-center gap-1 mb-1">
                      {[1, 2, 3, 4, 5, 6].map((index) => (
                        <div 
                          key={index} 
                          className={`h-1 flex-1 rounded-sm ${
                            index <= passwordStrength.score 
                              ? getStrengthColor(passwordStrength.score) 
                              : "bg-gray-200"
                          }`} 
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {passwordStrength.feedback}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  密碼必須至少8個字符，建議使用大小寫字母、數字和特殊符號組合
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  確認密碼
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={`w-full rounded-md border ${!passwordsMatch ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {!passwordsMatch && (
                  <p className="text-xs text-destructive">
                    密碼不匹配
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password-hint" className="text-sm font-medium">
                  密碼提示 (選填)
                </label>
                <input
                  id="password-hint"
                  name="password-hint"
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  為自己創建一個密碼提示，以防忘記密碼。不要直接包含密碼內容。
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  註冊帳戶代表您同意我們的
                  <Link href="/terms" className="font-medium text-primary hover:underline">
                    服務條款
                  </Link>
                  {' '}和{' '}
                  <Link href="/privacy" className="font-medium text-primary hover:underline">
                    隱私政策
                  </Link>
                </p>
              </div>

              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-600">
                <h4 className="font-medium">主密碼非常重要</h4>
                <p className="mt-1 text-xs">
                  您設定的密碼將作為「主密碼」，用於加密您的所有密碼資料。
                  我們採用零知識架構，伺服器不存儲您的主密碼，因此：
                </p>
                <ul className="list-disc ml-5 mt-1 text-xs">
                  <li>請設定一個強密碼並確保您能記住</li>
                  <li>忘記主密碼將無法恢復您的資料</li>
                  <li>任何人都無法重設您的主密碼</li>
                </ul>
              </div>

              <button
                type="submit"
                className="btn w-full"
                disabled={isLoading}
              >
                {isLoading ? '註冊中...' : '註冊'}
              </button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              已有帳戶?{' '}
              <Link 
                href="/login" 
                className="font-medium text-primary hover:underline"
              >
                登入
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Section>
  );
} 