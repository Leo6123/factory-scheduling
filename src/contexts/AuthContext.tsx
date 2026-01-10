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
  const getUserRole = async (supabaseUser: SupabaseUser): Promise<UserRole> => {
    if (!supabase) {
      console.warn('Supabase 未初始化，使用默認角色 viewer');
      return 'viewer';
    }

    // 設定超時保護（10 秒）
    const TIMEOUT_MS = 10000;
    
    try {
      // 創建超時 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('獲取用戶角色超時（10 秒），使用默認角色'));
        }, TIMEOUT_MS);
      });

      // 嘗試從 user_profiles 表獲取角色（帶超時保護）
      const queryPromise = supabase
        .from('user_profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .single();

      const { data, error } = await Promise.race([
        queryPromise.then(result => result),
        timeoutPromise,
      ]) as { data: any; error: any };

      if (error) {
        // 如果表不存在或查詢失敗，檢查是否是表不存在的錯誤
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.warn('⚠️ user_profiles 表不存在，使用默認角色 operator');
          return 'operator'; // 表不存在時使用默認角色
        }
        
        // 如果是超時或權限錯誤，使用默認角色
        if (error.message?.includes('超時') || error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
          console.warn('⚠️ 無法獲取用戶角色（可能是 RLS 政策問題），使用默認角色:', error.message);
          // 檢查是否是第一個用戶（通過查詢用戶數量，但不等待太久）
          try {
            const countPromise = supabase
              .from('user_profiles')
              .select('id', { count: 'exact', head: true });
            
            const countResult = await Promise.race([
              countPromise,
              new Promise<{ count: number }>((resolve) => {
                setTimeout(() => resolve({ count: 1 }), 2000); // 2 秒超時
              }),
            ]) as any;
            
            if (countResult?.count === 0 || !countResult?.count) {
              console.log('✅ 這是第一個用戶，設為管理員');
              return 'admin'; // 第一個用戶為管理員
            }
          } catch (checkError) {
            // 查詢失敗，使用默認角色
            console.warn('檢查用戶數量失敗，使用默認角色 operator');
          }
          return 'operator'; // 默認角色
        }
        
        // 其他錯誤，使用默認角色
        console.warn('⚠️ 獲取用戶角色失敗，使用默認角色:', error.message);
        return 'operator'; // 默認角色
      }

      if (!data) {
        // 如果沒有資料，可能是第一個用戶
        console.warn('⚠️ user_profiles 中沒有該用戶記錄，檢查是否為第一個用戶');
        try {
          const countResult = await Promise.race([
            supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
            new Promise<{ count: number }>((resolve) => {
              setTimeout(() => resolve({ count: 1 }), 2000); // 2 秒超時
            }),
          ]) as any;

          if (countResult?.count === 0 || !countResult?.count) {
            console.log('✅ 這是第一個用戶，設為管理員');
            return 'admin'; // 第一個用戶為管理員
          }
        } catch (checkError) {
          console.warn('檢查用戶數量失敗，使用默認角色 operator');
        }
        return 'operator'; // 默認角色
      }

      const role = (data.role as UserRole) || 'operator';
      console.log('✅ 獲取用戶角色成功:', role);
      return role;
    } catch (error: any) {
      console.error('❌ 獲取用戶角色異常:', error);
      // 發生異常時（包括超時），使用安全的默認角色
      if (error.message?.includes('超時')) {
        console.warn('⚠️ 獲取角色超時，使用默認角色 operator');
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

    // 設定超時保護（15 秒）
    const TIMEOUT_MS = 15000;
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
      // 創建超時 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('更新用戶狀態超時（15 秒），使用默認角色'));
        }, TIMEOUT_MS);
      });

      // 獲取用戶角色（帶超時保護）
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
      console.log('✅ 用戶狀態更新成功，角色:', role);
    } catch (error: any) {
      // 清除超時
      cleanup();
      
      console.error('❌ 更新用戶狀態失敗:', error);
      
      // 即使失敗，也設定用戶（使用默認角色），這樣用戶才能繼續使用系統
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: 'operator', // 使用安全的默認角色
        createdAt: supabaseUser.created_at,
      });
      setSession(currentSession);
      
      if (error.message?.includes('超時')) {
        console.warn('⚠️ 獲取角色超時，使用默認角色 operator');
      }
    } finally {
      // 確保 loading 狀態被重置（即使發生異常）
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

    // 監聽認證狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        console.log('🔄 認證狀態變化，用戶:', session.user.email);
        await updateUser(session.user, session);
      } else {
        console.log('🔄 認證狀態變化：已登出');
        setUser(null);
        setSession(null);
        setLoading(false);
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

  // 登入
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
        await updateUser(data.user, data.session);
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // 登出
  const signOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
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
