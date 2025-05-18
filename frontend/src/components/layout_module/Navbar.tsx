'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 主導航欄組件
 * 在所有已認證頁面中顯示
 */
export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  
  // 如果用戶未認證，不顯示導航欄
  if (!isAuthenticated) {
    return null;
  }
  
  // 檢查當前路徑以高亮顯示活動項
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };
  
  return (
    <nav className="bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Lanbitou 密碼管理器
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/vault" 
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive('/vault') 
                  ? 'bg-accent/20 font-medium' 
                  : 'hover:bg-accent/20'
              }`}
            >
              密碼管理
            </Link>
            <Link 
              href="/setup" 
              className={`px-3 py-2 rounded-md transition-colors ${
                isActive('/setup') 
                  ? 'bg-accent/20 font-medium' 
                  : 'hover:bg-accent/20'
              }`}
            >
              群組管理
            </Link>
            <button 
              onClick={() => logout && logout()}
              className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 