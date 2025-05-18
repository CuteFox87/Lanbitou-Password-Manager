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
import { Navbar } from '@/components/layout_module/Navbar';
import { getToken, getPasswords, storePassword, updatePassword, deletePassword, ApiError } from '@/lib/api';
import { encrypt, decrypt, base64ToArrayBuffer, arrayBufferToBase64 } from '@/lib/crypto';

// 密碼項目類型
type PasswordEntry = {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  owner_id?: number;
};

// 前端解密後存儲的密碼條目
type DecryptedPassword = {
  id: string;
  site: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  owner_id?: number;
};

export default function VaultPage() {
  const { isAuthenticated, isLoading: authLoading, encryptionKey } = useAuth();
  const router = useRouter();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<PasswordEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  
  // 新增/編輯表單狀態
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    username: '',
    password: '',
    url: '',
    notes: ''
  });
  
  // 未登入用戶重定向至登入頁
  useEffect(() => {
    console.log('正在檢查vault頁面認證狀態:', {
      isLoading: authLoading,
      isAuthenticated,
      hasEncryptionKey: !!encryptionKey
    });

    if (!authLoading) {
      if (!isAuthenticated) {
        console.log('未認證，重定向到登入頁');
        router.push('/login');
      } else if (!encryptionKey) {
        console.log('缺少加密密鑰，重新登入獲取密鑰');
        // 如果沒有加密密鑰，也重定向到登入頁，強制重新登入
        router.push('/login');
      } else {
        // 載入密碼
        fetchPasswords();
      }
    }
  }, [authLoading, isAuthenticated, encryptionKey, router]);
  
  // 獲取並解密密碼列表
  const fetchPasswords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!encryptionKey) {
        throw new Error('缺少加密密鑰，無法解密資料');
      }
      
      // 使用 API 方法獲取密碼列表
      const data = await getPasswords();
      
      const decryptedPasswords = await Promise.all(
        data.map(async (item) => {
          try {
            // 解密資料
            const decryptedData = await decrypt(
              {
                ciphertext: base64ToArrayBuffer(item.encrypted_data),
                iv: base64ToArrayBuffer(item.iv)
              },
              encryptionKey
            );
            
            // 解析 JSON 資料
            const parsedData = JSON.parse(decryptedData);
            
            return {
              id: item.id.toString(),
              title: item.site,
              username: parsedData.username || '',
              password: parsedData.password || '',
              url: parsedData.url || '',
              notes: parsedData.notes || '',
              owner_id: item.owner_id
            };
          } catch (error) {
            console.error('解密密碼失敗:', error, item);
            // 解密失敗時顯示部分資訊
            return {
              id: item.id.toString(),
              title: item.site,
              username: '解密失敗',
              password: '解密失敗',
              url: '',
              notes: '資料解密失敗，可能是由於密鑰不正確',
              owner_id: item.owner_id
            };
          }
        })
      );
      
      setPasswords(decryptedPasswords);
    } catch (error) {
      console.error('獲取密碼列表失敗:', error);
      setError(error instanceof Error ? error.message : '獲取密碼列表失敗');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 處理表單輸入改變
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // 重置表單
  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      username: '',
      password: '',
      url: '',
      notes: ''
    });
    setShowPassword(false);
    setShowAddPassword(false);
  };
  
  // 開始編輯密碼
  const handleEdit = (password: PasswordEntry) => {
    setFormData({
      id: password.id,
      title: password.title,
      username: password.username,
      password: password.password,
      url: password.url || '',
      notes: password.notes || ''
    });
    setCurrentPassword(password);
    setIsEditing(true);
    setShowPassword(false);
  };
  
  // 處理新增密碼
  const handleAddPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!encryptionKey) {
      setError('缺少加密密鑰，無法加密資料');
      return;
    }
    
    try {
      // 準備要加密的資料
      const dataToEncrypt = JSON.stringify({
        username: formData.username,
        password: formData.password,
        url: formData.url,
        notes: formData.notes
      });
      
      // 加密資料
      const encryptedData = await encrypt(dataToEncrypt, encryptionKey);
      
      // 準備發送到伺服器的資料
      const requestData = {
        site: formData.title,
        encrypted_data: arrayBufferToBase64(encryptedData.ciphertext),
        iv: arrayBufferToBase64(encryptedData.iv)
      };
      
      // 使用 API 儲存密碼
      await storePassword(requestData);
      
      // 重新獲取密碼列表
      await fetchPasswords();
      
      // 關閉對話框並重置表單
      setIsAddingNew(false);
      resetForm();
    } catch (error) {
      console.error('新增密碼失敗:', error);
      setError(error instanceof Error ? error.message : '新增密碼失敗');
    }
  };
  
  // 處理編輯密碼
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!encryptionKey) {
      setError('缺少加密密鑰，無法加密資料');
      return;
    }
    
    try {
      // 準備要加密的資料
      const dataToEncrypt = JSON.stringify({
        username: formData.username,
        password: formData.password,
        url: formData.url,
        notes: formData.notes
      });
      
      // 加密資料
      const encryptedData = await encrypt(dataToEncrypt, encryptionKey);
      
      // 準備發送到伺服器的資料
      const requestData = {
        site: formData.title,
        encrypted_data: arrayBufferToBase64(encryptedData.ciphertext),
        iv: arrayBufferToBase64(encryptedData.iv)
      };
      
      // 使用 API 更新密碼
      await updatePassword(formData.id, requestData);
      
      // 重新獲取密碼列表
      await fetchPasswords();
      
      // 關閉對話框並重置表單
      setIsEditing(false);
      setCurrentPassword(null);
      resetForm();
    } catch (error) {
      console.error('更新密碼失敗:', error);
      setError(error instanceof Error ? error.message : '更新密碼失敗');
    }
  };
  
  // 處理刪除密碼
  const handleDeletePassword = async (id: string) => {
    if (!confirm('確定要刪除這個密碼嗎？此操作無法撤銷。')) {
      return;
    }
    
    try {
      // 使用 API 刪除密碼
      await deletePassword(id);
      
      // 重新獲取密碼列表
      await fetchPasswords();
    } catch (error) {
      console.error('刪除密碼失敗:', error);
      setError(error instanceof Error ? error.message : '刪除密碼失敗');
    }
  };
  
  // 處理複製到剪貼簿
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('已複製到剪貼簿'))
      .catch(err => console.error('複製失敗:', err));
  };
  
  // 切換密碼可見性
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // 切換添加密碼可見性
  const toggleAddPasswordVisibility = () => {
    setShowAddPassword(!showAddPassword);
  };
  
  // 載入中或未認證時不渲染頁面內容
  if (authLoading || !isAuthenticated) {
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
      (entry.url && entry.url.toLowerCase().includes(searchLower))
    );
  });
  
  return (
    <>
      <Navbar />
      <Section spacing="lg" className="py-12">
        <div className="mx-auto max-w-5xl">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">所有密碼庫</CardTitle>
                  <CardDescription>
                    管理您存儲的所有密碼
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="btn"
                    onClick={() => {
                      resetForm();
                      setIsAddingNew(true);
                    }}
                  >
                    新增密碼
                  </button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* 錯誤訊息 */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  <p>{error}</p>
                </div>
              )}
              
              {/* 載入中提示 */}
              {isLoading && (
                <div className="text-center py-4">
                  <p>正在載入密碼資料...</p>
                </div>
              )}
              
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
              {!isLoading && filteredPasswords.length > 0 ? (
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
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleCopy(entry.password)}
                        >
                          複製密碼
                        </button>
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEdit(entry)}
                        >
                          編輯
                        </button>
                        <button 
                          className="btn btn-sm btn-outline btn-error"
                          onClick={() => handleDeletePassword(entry.id)}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !isLoading && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? '沒有找到符合的密碼' : '您的密碼庫是空的'}
                    </p>
                    {!searchTerm && (
                      <button 
                        className="btn mt-4"
                        onClick={() => {
                          resetForm();
                          setIsAddingNew(true);
                        }}
                      >
                        添加您的第一個密碼
                      </button>
                    )}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
      
      {/* 添加新密碼彈窗 */}
      {isAddingNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">添加新密碼</h2>
            <form onSubmit={handleAddPassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">標題</label>
                  <input 
                    type="text" 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">用戶名/電子郵件</label>
                  <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">密碼</label>
                  <div className="relative">
                    <input 
                      type={showAddPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10" 
                      required
                    />
                    <button 
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={toggleAddPasswordVisibility}
                    >
                      {showAddPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">網址</label>
                  <input 
                    type="url" 
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">附註</label>
                  <input 
                    type="text" 
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsAddingNew(false)}
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="btn"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 編輯密碼彈窗 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">編輯密碼</h2>
            <form onSubmit={handleUpdatePassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">標題</label>
                  <input 
                    type="text" 
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">用戶名/電子郵件</label>
                  <input 
                    type="text" 
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">密碼</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10" 
                      required
                    />
                    <button 
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm mb-1">網址</label>
                  <input 
                    type="url" 
                    name="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">附註</label>
                  <input 
                    type="text" 
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setIsEditing(false);
                    setCurrentPassword(null);
                  }}
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="btn"
                >
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 