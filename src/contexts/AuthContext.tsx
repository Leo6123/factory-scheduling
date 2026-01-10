"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, TABLES } from '@/lib/supabase';
import { User, UserRole, getPermissions, Permissions } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  permissions: Permissions;
  hasPermission: (permission: keyof Permissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 從 Supabase 用戶獲取角色（從資料庫 user_profiles 表或使用默認角色）
  // 強制從資料庫獲取，不使用緩存
  const getUserRole = async (supabaseUser: SupabaseUser): Promise<UserRole> => {
    if (!supabase) {
      console.warn('⚠️ Supabase 未初始化，使用默認角色 viewer');
      return 'viewer';
    }

    // 設定超時保護（2 秒，更快響應，避免阻塞）
    const TIMEOUT_MS = 2000;
    
    try {
      console.log('🔍 [Auth] 開始獲取用戶角色，用戶 ID:', supabaseUser.id, 'Email:', supabaseUser.email);
      
      // 創建超時 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('獲取用戶角色超時（2 秒），使用默認角色'));
        }, TIMEOUT_MS);
      });

      // 嘗試從 user_profiles 表獲取角色（帶超時保護，不使用緩存）
      // 只選擇需要的欄位，使用 maybeSingle() 避免找不到記錄時報錯
      // 使用 id 查詢（主鍵，最快）
      const queryPromise = supabase
        .from('user_profiles')
        .select('role')  // 只選擇 role 欄位，減少數據傳輸
        .eq('id', supabaseUser.id)
        .maybeSingle();

      const result = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]) as { data: any; error: any };

      if (result.error) {
        console.warn('⚠️ [Auth] 查詢 user_profiles 失敗:', result.error.message, result.error.code);
        
        // 如果是表不存在或權限錯誤，立即返回默認角色
        if (result.error.code === '42P01' || 
            result.error.code === 'PGRST301' ||
            result.error.message?.includes('does not exist') || 
            result.error.message?.includes('relation') ||
            result.error.message?.includes('permission') || 
            result.error.message?.includes('RLS')) {
          console.warn('⚠️ [Auth] 可能是表不存在或 RLS 政策問題，使用默認角色 operator');
          return 'operator';
        }
        
        // 其他錯誤，使用默認角色
        console.warn('⚠️ [Auth] 獲取用戶角色失敗，使用默認角色 operator');
        return 'operator';
      }

      // maybeSingle 返回 null 如果找不到記錄
      if (result.data === null || !result.data) {
        console.warn('⚠️ [Auth] user_profiles 中沒有該用戶記錄（ID:', supabaseUser.id, '），使用默認角色 operator');
        console.warn('💡 請執行 supabase_set_admin_now.sql 為用戶創建 user_profiles 記錄');
        return 'operator';
      }

      if (result.data?.role) {
        const role = result.data.role as UserRole;
        console.log('✅ [Auth] 獲取用戶角色成功:', role, 'Email:', supabaseUser.email);
        return role;
      }

      // 如果沒有 role 欄位，使用默認角色
      console.warn('⚠️ [Auth] user_profiles 記錄中沒有 role 欄位，使用默認角色 operator');
      return 'operator';
      
    } catch (error: any) {
      console.error('❌ [Auth] 獲取用戶角色異常:', error.message || error);
      // 發生異常時（包括超時），立即返回默認角色
      if (error.message?.includes('超時')) {
        console.warn('⚠️ [Auth] 獲取角色超時（3 秒），使用默認角色 operator');
        console.warn('💡 這可能是因為資料庫查詢太慢，請檢查 Supabase 狀態');
      }
      return 'operator'; // 安全默認角色
    }
  };

  // 更新用戶狀態
  const updateUser = async (supabaseUser: SupabaseUser | null, currentSession: Session | null) => {
    if (!supabaseUser || !currentSession) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    // 設定超時保護（10 秒，縮短總超時時間）
    const TIMEOUT_MS = 10000;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (!isCompleted) {
        isCompleted = true;
        setLoading(false);
      }
    };

    try {
      console.log('🔄 開始更新用戶狀態，Email:', supabaseUser.email);
      
      // 創建超時 Promise（總超時 10 秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('更新用戶狀態超時（10 秒），使用默認角色'));
        }, TIMEOUT_MS);
      });

      // 獲取用戶角色（帶超時保護，getUserRole 內部已有 5 秒超時）
      const rolePromise = getUserRole(supabaseUser);
      const role = await Promise.race([
        rolePromise,
        timeoutPromise,
      ]) as UserRole;

      // 清除超時
      cleanup();

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role,
        createdAt: supabaseUser.created_at,
      });
      setSession(currentSession);
      console.log('✅ 用戶狀態更新成功，Email:', supabaseUser.email, '角色:', role);
    } catch (error: any) {
      // 清除超時
      cleanup();
      
      console.error('❌ 更新用戶狀態失敗:', error.message || error);
      
      // 即使失敗，也設定用戶（使用默認角色），這樣用戶才能繼續使用系統
      console.warn('⚠️ 使用默認角色 operator，讓用戶可以繼續使用系統');
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: 'operator', // 使用安全的默認角色
        createdAt: supabaseUser.created_at,
      });
      setSession(currentSession);
      
      if (error.message?.includes('超時')) {
        console.warn('⚠️ 更新用戶狀態超時，已使用默認角色 operator');
      }
    } finally {
      // 確保 loading 狀態被重置（即使發生異常）
      console.log('✅ 重置 loading 狀態');
      setLoading(false);
    }
  };

  // 初始化：檢查現有會話
  useEffect(() => {
    if (!supabase) {
      console.warn('⚠️ Supabase 未初始化，跳過身份驗證');
      setLoading(false);
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // 設定總超時保護（15 秒）
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ 身份驗證初始化超時（15 秒），設定為未登入狀態');
        setLoading(false);
        setUser(null);
        setSession(null);
      }
    }, 15000);

    // 獲取當前會話
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        // 清除超時
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (error) {
          console.error('❌ 獲取會話失敗:', error);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('✅ 找到現有會話，用戶:', session.user.email);
          updateUser(session.user, session);
        } else {
          console.log('ℹ️ 沒有現有會話');
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        
        // 清除超時
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        console.error('❌ 獲取會話異常:', error);
        setLoading(false);
      });

    // 監聽認證狀態變化（跨分頁同步）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 認證狀態變化:', event, session?.user?.email || '已登出');
      
      if (session?.user) {
        // 檢查 session 是否有效（單裝置登入檢查）
        if (!supabase) {
          console.warn('⚠️ Supabase 未初始化，跳過 session 檢查');
          await updateUser(session.user, session);
          return;
        }

        // 單裝置登入檢查（如果已設置 device_sessions 表）
        try {
          const rpcResult = await supabase.rpc('is_session_valid', {
            p_session_token: session.access_token,
          });
          
          const { data: isValid, error: checkError } = rpcResult;

          if (checkError) {
            // 如果函數不存在，跳過檢查（兼容舊版本）
            if (checkError.message?.includes('does not exist') || 
                checkError.code === '42883' ||
                checkError.code === 'P0001') {
              console.log('ℹ️ is_session_valid 函數不存在，跳過單裝置登入檢查');
            } else {
              console.warn('⚠️ 檢查 session 有效性失敗:', checkError);
            }
            // 即使檢查失敗，也繼續（降級處理）
          } else if (isValid === false) {
            console.warn('⚠️ Session 無效（可能在其他裝置登入），強制登出');
            // Session 無效，強制登出
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setLoading(false);
            // 重新導向到登入頁
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return;
          }
        } catch (err: any) {
          // 如果 RPC 函數不存在，會拋出異常，這是正常的（兼容舊版本）
          if (err?.message?.includes('does not exist') || err?.code === '42883') {
            console.log('ℹ️ is_session_valid 函數不存在，跳過單裝置登入檢查');
          } else {
            console.warn('⚠️ 檢查 session 有效性異常:', err);
          }
          // 即使異常，也繼續（降級處理）
        }

        // 強制重新獲取用戶角色（不使用緩存）
        await updateUser(session.user, session);
      } else {
        // 已登出（可能是主動登出，或是在其他裝置/分頁登出）
        console.log('🔄 認證狀態變化：已登出，清除本地狀態');
        setUser(null);
        setSession(null);
        setLoading(false);
        
        // 如果是 SIGNED_OUT 事件，重新導向到登入頁
        if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
          // 延遲一點，確保狀態已更新
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  // 登入（單裝置登入限制）
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase 未初始化' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user && data.session) {
        // 註冊新 session（這會自動刪除舊 session）
        try {
          if (supabase) {
            const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
            const sessionToken = data.session.access_token;
            
            const { error: sessionError } = await supabase.rpc('register_device_session', {
              p_session_token: sessionToken,
              p_device_info: deviceInfo,
              p_ip_address: null, // 前端無法獲取真實 IP，留空
            });

            if (sessionError) {
              console.warn('⚠️ 註冊 device session 失敗:', sessionError);
              // 即使註冊失敗，也繼續登入流程（降級處理）
            } else {
              console.log('✅ 已註冊新 session，舊 session 已自動登出');
            }
          }
        } catch (err) {
          console.warn('⚠️ 註冊 device session 異常:', err);
          // 即使異常，也繼續登入流程
        }

        await updateUser(data.user, data.session);
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // 登出（清理 device session，所有分頁會自動登出）
  const signOut = async () => {
    if (!supabase) return;

    try {
      // 刪除 device session（如果存在）
      const currentSession = session;
      if (currentSession?.access_token && supabase) {
        try {
          const { error: deleteError } = await supabase
            .from('device_sessions')
            .delete()
            .eq('session_token', currentSession.access_token);

          if (deleteError) {
            console.warn('⚠️ 刪除 device session 失敗:', deleteError);
          } else {
            console.log('✅ 已刪除 device session');
          }
        } catch (err) {
          console.warn('⚠️ 刪除 device session 異常:', err);
        }
      }

      // 登出 Supabase Auth（這會觸發 onAuthStateChange，所有分頁都會收到）
      await supabase.auth.signOut({ scope: 'global' }); // scope: 'global' 確保所有分頁登出
      
      setUser(null);
      setSession(null);
      
      console.log('✅ 已登出，所有分頁都會自動登出');
    } catch (error) {
      console.error('❌ 登出異常:', error);
      // 即使異常，也清除本地狀態
      setUser(null);
      setSession(null);
    }
  };

  // 取得權限
  const permissions = user ? getPermissions(user.role) : getPermissions('viewer');

  // 檢查是否有特定權限
  const hasPermission = (permission: keyof Permissions): boolean => {
    return permissions[permission] || false;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    permissions,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
