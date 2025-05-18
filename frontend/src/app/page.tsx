'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent
} from '@/components/layout_module/card';
import { Section } from '@/components/layout_module/section';
import { Navbar } from '@/components/layout_module/Navbar';
import { getPasswords } from '@/lib/api';
import { decrypt, base64ToArrayBuffer } from '@/lib/crypto';

// 弱密碼檢查的規則
const isWeakPassword = (password: string): boolean => {
  // 檢查密碼長度是否小於8
  if (password.length < 8) return true;
  
  // 檢查是否只包含數字或只包含字母
  const onlyDigits = /^\d+$/.test(password);
  const onlyLetters = /^[a-zA-Z]+$/.test(password);
  
  // 檢查是否包含常見弱密碼模式
  const commonPatterns = [
    'password', '123456', 'qwerty', 'admin', 
    '111111', '123123', '654321', 'abcdef'
  ];
  
  const hasCommonPattern = commonPatterns.some(pattern => 
    password.toLowerCase().includes(pattern)
  );
  
  return onlyDigits || onlyLetters || hasCommonPattern;
};

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, encryptionKey } = useAuth();
  const router = useRouter();
  const [passwordStats, setPasswordStats] = useState({
    total: 0,
    weak: 0,
    reused: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // 未登入用戶重定向至登入頁
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  // 載入密碼統計
  useEffect(() => {
    async function loadPasswordStats() {
      if (!isAuthenticated || !encryptionKey) return;
      
      try {
        setIsLoadingStats(true);
        const passwordEntries = await getPasswords();
        
        // 密碼總數
        const total = passwordEntries.length;
        
        // 解密密碼並分析
        const decryptedPasswords = await Promise.all(
          passwordEntries.map(async (entry) => {
            try {
              const decryptedData = await decrypt(
                {
                  ciphertext: base64ToArrayBuffer(entry.encrypted_data),
                  iv: base64ToArrayBuffer(entry.iv)
                },
                encryptionKey
              );
              
              const parsedData = JSON.parse(decryptedData);
              return {
                id: entry.id.toString(),
                site: entry.site,
                password: parsedData.password || ''
              };
            } catch (error) {
              console.error('解密密碼失敗:', error, entry);
              return {
                id: entry.id.toString(),
                site: entry.site,
                password: ''
              };
            }
          })
        );
        
        // 弱密碼計數
        const weakCount = decryptedPasswords.filter(item => 
          item.password && isWeakPassword(item.password)
        ).length;
        
        // 重複使用的密碼計數
        const passwordCounts: Record<string, number> = {};
        
        decryptedPasswords.forEach(item => {
          if (item.password) {
            passwordCounts[item.password] = (passwordCounts[item.password] || 0) + 1;
          }
        });
        
        const reusedCount = Object.values(passwordCounts)
          .filter(count => count > 1)
          .reduce((sum, count) => sum + count, 0);
        
        setPasswordStats({
          total,
          weak: weakCount,
          reused: reusedCount
        });
      } catch (error) {
        console.error('獲取密碼統計失敗:', error);
      } finally {
        setIsLoadingStats(false);
      }
    }
    
    loadPasswordStats();
  }, [isAuthenticated, encryptionKey]);
  
  // 載入中或未認證時不渲染頁面內容
  if (isLoading || !isAuthenticated) {
    return (
      <Section spacing="lg" className="py-12">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="py-8">
              <p className="text-center">正在載入...</p>
            </CardContent>
          </Card>
        </div>
      </Section>
    );
  }
  
  return (
    <>
      <Navbar />
      
      <Section spacing="lg" className="py-12">
        <div className="mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                歡迎，{user?.email}
              </CardTitle>
              <CardDescription>
                您的 Lanbitou 密碼管理器儀表板
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/vault" className="block">
                  <div className="bg-blue-500/20 rounded-lg p-4 text-center hover:bg-blue-500/30 transition-colors">
                    <h3 className="text-xl font-semibold">
                      {isLoadingStats ? '載入中...' : passwordStats.total}
                    </h3>
                    <p className="text-sm text-muted-foreground">密碼總數</p>
                  </div>
                </Link>
                
                <div className="bg-yellow-500/20 rounded-lg p-4 text-center">
                  <h3 className="text-xl font-semibold">
                    {isLoadingStats ? '載入中...' : passwordStats.weak}
                  </h3>
                  <p className="text-sm text-muted-foreground">弱密碼</p>
                </div>
                
                <div className="bg-red-500/20 rounded-lg p-4 text-center">
                  <h3 className="text-xl font-semibold">
                    {isLoadingStats ? '載入中...' : passwordStats.reused}
                  </h3>
                  <p className="text-sm text-muted-foreground">重複使用</p>
                </div>
              </div>
              
              {passwordStats.weak > 0 || passwordStats.reused > 0 ? (
                <div className="mt-6 p-4 bg-amber-100 rounded-lg">
                  <h4 className="font-medium mb-2">安全建議</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {passwordStats.weak > 0 && (
                      <li>
                        您有 {passwordStats.weak} 個弱密碼。建議使用強密碼，至少8位，包含大小寫字母、數字和特殊符號。
                      </li>
                    )}
                    {passwordStats.reused > 0 && (
                      <li>
                        您有 {passwordStats.reused} 個重複使用的密碼。對不同網站使用不同的密碼可以提高安全性。
                      </li>
                    )}
                  </ul>
                  <div className="mt-3">
                    <Link href="/vault" className="text-sm text-blue-600 hover:underline">
                      前往密碼庫更新
                    </Link>
                  </div>
                </div>
              ) : passwordStats.total > 0 && !isLoadingStats ? (
                <div className="mt-6 p-4 bg-green-100 rounded-lg">
                  <h4 className="font-medium">做得好！</h4>
                  <p className="text-sm mt-1">
                    您的密碼都很強壯且沒有重複使用。繼續保持良好的密碼衛生習慣！
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}