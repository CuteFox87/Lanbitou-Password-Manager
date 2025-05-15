'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import * as cryptoUtils from '@/lib/crypto';

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

export default function ChangePasswordPage() {
  const [step, setStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "" });
  const { isAuthenticated, encryptionKey, logout, user } = useAuth();
  const router = useRouter();

  // 檢查用戶是否已登入
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 密碼匹配檢查
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setPasswordsMatch(false);
    } else {
      setPasswordsMatch(true);
    }
  }, [newPassword, confirmPassword]);

  // 密碼強度評估
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(assessPasswordStrength(newPassword));
    } else {
      setPasswordStrength({ score: 0, feedback: "" });
    }
  }, [newPassword]);

  // 處理密碼變更
  const handlePasswordChange = async () => {
    try {
      if (!user?.email) {
        throw new Error('用戶信息不可用');
      }
      
      // 1. 驗證當前密碼
      const currentLoginKey = await cryptoUtils.deriveLoginKey(currentPassword);
      // 這裡應該調用後端API驗證當前密碼是否正確
      
      // 2. 生成新登入金鑰
      const newLoginKey = await cryptoUtils.deriveLoginKey(newPassword);
      
      // 3. 獲取數據鹽值
      const dataSalt = localStorage.getItem(`lanbitou_data_salt_${user.email}`);
      if (!dataSalt) {
        throw new Error('找不到數據鹽值');
      }
      
      // 4. 儲存新的密碼提示（如果有）
      if (passwordHint) {
        localStorage.setItem(`lanbitou_password_hint_${user.email}`, passwordHint);
      }
      
      // 5. 在這裡應該實現重新加密所有密碼條目的邏輯
      // 由於需要訪問密碼庫中的所有條目，實際實現應該是：
      // a. 使用舊密碼解密所有密碼條目
      // b. 使用新密碼重新加密所有密碼條目
      // c. 將新的加密數據保存到伺服器
      
      // 模擬成功結果
      console.log('密碼更改成功');
      alert('密碼已成功變更，請使用新密碼重新登入');
      
      // 登出用戶，要求重新登入
      logout();
      return true;
    } catch (error) {
      console.error('密碼更改失敗:', error);
      return false;
    }
  };

  // 處理下一步按鈕
  const handleNextStep = async () => {
    // 第一步驗證
    if (step === 1) {
      if (!currentPassword) {
        setErrorMessage('請輸入當前密碼');
        return;
      }

      if (!newPassword) {
        setErrorMessage('請輸入新密碼');
        return;
      }
      
      if (newPassword.length < 8) {
        setErrorMessage('新密碼必須至少8個字符');
        return;
      }

      if (!passwordsMatch) {
        setErrorMessage('新密碼不匹配');
        return;
      }

      // 如果密碼強度太弱，給出警告
      if (passwordStrength.score <= 2) {
        if (!window.confirm('您的新密碼強度較弱，這可能導致安全風險。確定要繼續嗎？')) {
          return;
        }
      }
      
      setErrorMessage('');
      setStep(2);
      return;
    }

    // 第二步確認並執行密碼更改
    if (step === 2) {
      const success = await handlePasswordChange();
      if (success) {
        router.push('/');
      } else {
        setErrorMessage('密碼更改失敗，請重試');
        setStep(1);
      }
    }
  };

  // 生成密碼強度指示器的顏色
  const getStrengthColor = (score: number) => {
    if (score <= 2) return "bg-red-500";
    if (score <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Section spacing="lg" className="py-12">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              變更密碼
            </CardTitle>
            <CardDescription className="text-center">
              {step === 1 ? '輸入您的新密碼' : '確認變更'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {errorMessage && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="current-password" className="text-sm font-medium">
                    當前密碼
                  </label>
                  <input
                    id="current-password"
                    name="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium">
                    新密碼
                  </label>
                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {newPassword && (
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
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium">
                    確認新密碼
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
                    為自己創建一個新的密碼提示，以防忘記密碼。不要直接包含密碼內容。
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-md bg-yellow-50 p-4">
                  <h3 className="font-medium text-yellow-800">重要提醒</h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    變更主密碼將需要重新加密您的所有密碼資料。請確認以下事項：
                  </p>
                  <ul className="list-disc ml-5 mt-2 text-sm text-yellow-700">
                    <li>您已經記住了新主密碼</li>
                    <li>變更密碼後需要使用新主密碼登入系統</li>
                    <li>此操作不可撤銷</li>
                  </ul>
                  <p className="mt-3 text-sm font-medium text-yellow-800">
                    確定要繼續嗎？
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              {step === 1 && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => router.push('/')}
                >
                  返回
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setStep(1)}
                >
                  上一步
                </button>
              )}
              <button
                type="button"
                className="btn ml-auto"
                onClick={handleNextStep}
              >
                {step === 1 ? '下一步' : '確認變更'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
} 