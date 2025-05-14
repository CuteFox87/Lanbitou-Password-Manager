'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/layout_module/card';
import { Section } from '@/components/layout_module/section';
import Link from 'next/link';

// 密碼項目類型
type PasswordEntry = {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  created: number;
  updated: number;
};

export default function VaultPage() {
  const { isAuthenticated, isLoading, encryptionKey } = useAuth();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 未登入用戶重定向至登入頁
  useEffect(() => {
    console.log('正在檢查vault頁面認證狀態:', {
      isLoading,
      isAuthenticated,
      hasEncryptionKey: !!encryptionKey
    });

    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('未認證，重定向到登入頁');
        router.push('/login');
      } else if (!encryptionKey) {
        console.log('缺少加密密鑰，重新登入獲取密鑰');
        // 如果沒有加密密鑰，也重定向到登入頁，強制重新登入
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, encryptionKey, router]);
  
  // 載入密碼資料 (這裡會實際實現API調用和解密)
  useEffect(() => {
    // 模擬密碼數據，實際實現中應該從API獲取加密數據並解密
    const mockPasswords: PasswordEntry[] = [
      {
        id: '1',
        title: 'Gmail',
        username: 'user@gmail.com',
        password: '********',
        url: 'https://gmail.com',
        created: Date.now(),
        updated: Date.now()
      },
      {
        id: '2',
        title: 'Facebook',
        username: 'user@example.com',
        password: '********',
        url: 'https://facebook.com',
        created: Date.now(),
        updated: Date.now()
      }
    ];
    
    setPasswords(mockPasswords);
  }, [encryptionKey]);
  
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
  
  // 過濾密碼
  const filteredPasswords = passwords.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.title.toLowerCase().includes(searchLower) ||
      entry.username.toLowerCase().includes(searchLower) ||
      entry.url.toLowerCase().includes(searchLower)
    );
  });
  
  return (
    <Section spacing="lg" className="py-12">
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">密碼庫</CardTitle>
                <CardDescription>
                  管理您存儲的所有密碼
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Link 
                  href="/"
                  className="btn btn-outline"
                >
                  返回首頁
                </Link>
                <button 
                  className="btn"
                  onClick={() => setIsAddingNew(true)}
                >
                  新增密碼
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* 搜尋框 */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="搜尋密碼..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* 密碼列表 */}
            {filteredPasswords.length > 0 ? (
              <div className="space-y-4">
                {filteredPasswords.map(entry => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-md border border-border hover:bg-accent/20 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {entry.title.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium">{entry.title}</h3>
                        <p className="text-sm text-muted-foreground">{entry.username}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-sm btn-secondary">複製</button>
                      <button className="btn btn-sm btn-outline">編輯</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? '沒有找到符合的密碼' : '您的密碼庫是空的'}
                </p>
                {!searchTerm && (
                  <button 
                    className="btn mt-4"
                    onClick={() => setIsAddingNew(true)}
                  >
                    添加您的第一個密碼
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 添加新密碼彈窗 - 簡化版，實際實現時應更完善 */}
      {isAddingNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">添加新密碼</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">標題</label>
                <input type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-1">用戶名/電子郵件</label>
                <input type="text" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-1">密碼</label>
                <input type="password" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-1">網址</label>
                <input type="url" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button 
                className="btn btn-outline"
                onClick={() => setIsAddingNew(false)}
              >
                取消
              </button>
              <button className="btn">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
} 