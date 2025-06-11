/**
 * JWT 處理工具
 * 
 * 實現 JWT 解析、驗證和管理功能
 */

/**
 * JWT 解析後的載荷類型
 */
export interface JwtPayload {
  sub: string;      // 用戶ID
  exp?: number;     // 過期時間（UNIX 時間戳，秒）
  iat?: number;     // 簽發時間（UNIX 時間戳，秒）
  [key: string]: unknown; // 其他自定義欄位
}

/**
 * 解析 JWT 令牌
 * 只解析 payload 部分，不進行簽名驗證（由後端處理）
 */
export function parseJwt(token: string): JwtPayload {
  try {
    // 分割 token 獲取 payload 部分 (索引 1)
    const base64Payload = token.split('.')[1];
    // 將 base64url 轉換為普通 base64
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    // 解碼 payload
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    console.error('JWT 解析失敗');
    throw new Error('無效的 JWT 令牌');
  }
}

/**
 * 檢查 JWT 是否有效（未過期）
 */
export function isJwtValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const payload = parseJwt(token);
    const currentTime = Math.floor(Date.now() / 1000); // 當前時間（秒）
    
    // 檢查是否有過期時間且未過期
    return payload.exp ? payload.exp > currentTime : false;
  } catch {
    return false;
  }
}

/**
 * 獲取 JWT 中的用戶 ID
 */
export function getUserIdFromJwt(token: string): string | null {
  try {
    const payload = parseJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * 計算 JWT 剩餘有效時間（秒）
 */
export function getJwtRemainingTime(token: string): number {
  try {
    const payload = parseJwt(token);
    if (!payload.exp) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = payload.exp - currentTime;
    
    return remainingTime > 0 ? remainingTime : 0;
  } catch {
    return 0;
  }
}

/**
 * 是否需要刷新 JWT（剩餘時間小於指定閾值）
 */
export function shouldRefreshJwt(token: string, thresholdSeconds: number = 300): boolean {
  return getJwtRemainingTime(token) < thresholdSeconds;
} 