/**
 * API 路由身份驗證工具
 * 用於驗證 Supabase JWT Token 並取得用戶資訊
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 創建服務端 Supabase 客戶端（用於驗證 JWT）
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // 服務端不需要存儲配置
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * 從請求頭中提取 JWT Token
 */
function extractTokenFromRequest(request: NextRequest): string | null {
  // 嘗試從 Authorization header 獲取
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // 移除 "Bearer " 前綴
  }

  // 如果沒有 Authorization header，嘗試從 cookie 獲取（Supabase 會自動設置）
  // 注意：在 API Route 中，cookie 需要通過 headers 訪問
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    // 解析 cookie 尋找 Supabase session
    // Supabase 的 session cookie 名稱通常是 'sb-<project-ref>-auth-token'
    // 但在 API Route 中，我們使用 Authorization header 更標準
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('sb-') && cookie.includes('auth-token')) {
        const match = cookie.match(/sb-[^-]+-auth-token=([^;]+)/);
        if (match && match[1]) {
          // 注意：cookie 中的 token 可能是編碼過的，需要解碼
          return decodeURIComponent(match[1]);
        }
      }
    }
  }

  return null;
}

/**
 * 驗證 JWT Token 並取得用戶資訊
 * @returns 驗證成功返回用戶資訊，失敗返回 null
 */
export async function verifyAuthToken(request: NextRequest): Promise<{
  user: { id: string; email: string };
  error: null;
} | {
  user: null;
  error: { message: string; status: number };
}> {
  const supabase = createServerSupabaseClient();
  
  if (!supabase) {
    return {
      user: null,
      error: {
        message: 'Supabase client not configured',
        status: 500,
      },
    };
  }

  // 從請求中提取 token
  const token = extractTokenFromRequest(request);

  if (!token) {
    return {
      user: null,
      error: {
        message: 'Missing authorization token',
        status: 401,
      },
    };
  }

  try {
    // 使用 Supabase 驗證 JWT token
    // 方法 1：如果 token 是完整的 session，使用 setSession
    // 方法 2：如果 token 是 access_token，使用 getUser
    
    // 先嘗試使用 getUser（適用於 access_token）
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);

    if (getUserError || !user) {
      // 如果 getUser 失敗，可能是因為 token 格式不對
      // 嘗試從 cookie 或其他方式獲取 session
      // 或者返回錯誤
      console.warn('⚠️ [API Auth] Token 驗證失敗:', getUserError?.message || 'No user found');
      
      return {
        user: null,
        error: {
          message: 'Invalid or expired token',
          status: 401,
        },
      };
    }

    // 驗證成功
    if (!user.email) {
      return {
        user: null,
        error: {
          message: 'User email not found',
          status: 401,
        },
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      error: null,
    };
  } catch (error) {
    console.error('❌ [API Auth] Token 驗證異常:', error);
    return {
      user: null,
      error: {
        message: 'Token verification failed',
        status: 401,
      },
    };
  }
}

/**
 * API 路由身份驗證中間件
 * 使用範例：
 * 
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const auth = await verifyApiAuth(request);
 *   if (auth.error) {
 *     return NextResponse.json(
 *       { error: auth.error.message },
 *       { status: auth.error.status }
 *     );
 *   }
 *   
 *   // 使用 auth.user.id 或 auth.user.email
 *   // ... 您的 API 邏輯
 * }
 * ```
 */
export async function verifyApiAuth(request: NextRequest) {
  return await verifyAuthToken(request);
}
