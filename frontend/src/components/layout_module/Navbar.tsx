'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 主導航欄組件
 * 在所有已認證頁面中顯示
 * 固定在頁面頂部
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
    <div className="h-16"> {/* 這個空間確保導航欄不會覆蓋內容 */}
      <nav className="bg-background border-b border-border shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold mr-8">
                Lanbitou 密碼管理器
              </Link>
              
              <Link 
                href="/vault" 
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/vault') 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                密碼管理
              </Link>
              <Link 
                href="/setup" 
                className={`px-3 py-2 rounded-md transition-colors ${
                  isActive('/setup') 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                群組管理
              </Link>
            </div>
            
            <div className="flex items-center">
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
    </div>
  );
} 