'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/layout_module/card';
import { Section } from '@/components/layout_module/section';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  
  // 未登入用戶重定向至登入頁
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
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
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <h3 className="text-xl font-semibold">0</h3>
                <p className="text-sm text-muted-foreground">密碼總數</p>
              </div>
              
              <div className="bg-warning/10 rounded-lg p-4 text-center">
                <h3 className="text-xl font-semibold">0</h3>
                <p className="text-sm text-muted-foreground">弱密碼</p>
              </div>
              
              <div className="bg-destructive/10 rounded-lg p-4 text-center">
                <h3 className="text-xl font-semibold">0</h3>
                <p className="text-sm text-muted-foreground">重複使用</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>密碼庫</CardTitle>
              <CardDescription>
                管理您的所有密碼
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-muted-foreground">
                安全地存儲和管理您的所有帳戶密碼。
              </p>
              <p className="text-sm mt-2 font-semibold text-primary">
                點擊下方按鈕進入您的密碼庫，開始管理您的密碼
              </p>
            </CardContent>
            
            <CardFooter>
              <Link 
                href="/vault" 
                className="btn btn-primary w-full text-lg py-2"
              >
                前往密碼庫
              </Link>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>帳戶設置</CardTitle>
              <CardDescription>
                管理您的帳戶和安全設置
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-muted-foreground">
                更改主密碼、管理雙因素認證等帳戶設置。
              </p>
            </CardContent>
            
            <CardFooter>
              <Link 
                href="/setup" 
                className="btn btn-secondary w-full"
              >
                帳戶設置
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Section>
  );
}