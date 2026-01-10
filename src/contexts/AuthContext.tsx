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

    try {
      // 嘗試從 user_profiles 表獲取角色
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        // 如果表不存在或查詢失敗，檢查是否是表不存在的錯誤
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('user_profiles 表不存在，使用默認角色 operator');
          return 'operator'; // 表不存在時使用默認角色
        }
        
        // 其他錯誤，使用默認角色
        console.warn('獲取用戶角色失敗，使用默認角色:', error.message);
        
        // 檢查是否是第一個用戶
        try {
          const { data: allUsers } = await supabase
            .from('user_profiles')
            .select('id')
            .limit(1);

          if (!allUsers || allUsers.length === 0) {
            return 'admin'; // 第一個用戶自動為管理員
          }
        } catch (checkError) {
          // 查詢失敗，使用默認角色
          console.warn('檢查用戶數量失敗:', checkError);
        }
        return 'operator'; // 默認角色
      }

      if (!data) {
        // 如果沒有資料，檢查是否是第一個用戶
        const { data: allUsers } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        if (!allUsers || allUsers.length === 0) {
          return 'admin'; // 第一個用戶自動為管理員
        }
        return 'operator'; // 默認角色
      }

      return (data.role as UserRole) || 'operator';
    } catch (error: any) {
      console.error('獲取用戶角色異常:', error);
      // 發生異常時，使用安全的默認角色
      return 'operator';
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

    try {
      const role = await getUserRole(supabaseUser);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role,
        createdAt: supabaseUser.created_at,
      });
      setSession(currentSession);
    } catch (error) {
      console.error('更新用戶狀態失敗:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  // 初始化：檢查現有會話
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase 未初始化，跳過身份驗證');
      setLoading(false);
      return;
    }

    let mounted = true;

    // 獲取當前會話
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('獲取會話失敗:', error);
          setLoading(false);
          return;
        }
        if (session?.user) {
          updateUser(session.user, session);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        console.error('獲取會話異常:', error);
        setLoading(false);
      });

    // 監聽認證狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        await updateUser(session.user, session);
      } else {
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
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
