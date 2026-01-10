"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, TABLES } from '@/lib/supabase';
import { User, UserRole, getPermissions, Permissions } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, forceLogout?: boolean) => Promise<{ error: any; hasExistingSession?: boolean; isOtherDevice?: boolean }>;
  signOut: () => Promise<void>;
  permissions: Permissions;
  hasPermission: (permission: keyof Permissions) => boolean;
  checkExistingSession: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef<boolean>(false); // 追蹤是否正在初始化

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

      // 獲取用戶角色（帶超時保護，getUserRole 內部已有 2 秒超時）
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
    isInitializingRef.current = true; // 標記正在初始化

    // 清除之前的超時（如果存在）
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }

    // 設定總超時保護（30 秒，給足夠時間完成查詢）
    // 注意：在超時檢查中，也要檢查是否有 session，如果有就不要清除（避免覆蓋登入狀態）
    initTimeoutRef.current = setTimeout(() => {
      if (mounted && loading && supabase) {
        // 再次檢查是否有 session，避免在登入成功後被超時覆蓋
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted) {
            if (session?.user) {
              console.log('✅ 超時檢查：發現 session，保持登入狀態，用戶:', session.user.email);
              // 有 session，保持登入狀態，只停止 loading
              setLoading(false);
            } else {
              console.warn('⚠️ 身份驗證初始化超時（30 秒），且沒有 session，設定為未登入狀態');
              setLoading(false);
              setUser(null);
              setSession(null);
            }
          }
        }).catch((err) => {
          console.warn('⚠️ 超時檢查時獲取 session 失敗:', err);
          if (mounted) {
            setLoading(false);
            setUser(null);
            setSession(null);
          }
        });
      }
      initTimeoutRef.current = null;
      isInitializingRef.current = false; // 標記初始化完成
    }, 30000);

    // 獲取當前會話
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        // 清除超時
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        
        if (error) {
          console.error('❌ 獲取會話失敗:', error);
          setLoading(false);
          isInitializingRef.current = false;
          return;
        }
        
        if (session?.user) {
          console.log('✅ 找到現有會話，用戶:', session.user.email);
          
          // 立即設定 session 和基本用戶信息（不等待角色查詢完成）
          // 這樣可以讓用戶立即進入系統，角色查詢在後台完成
          // 注意：多分頁檢測在 ProtectedRoute 中進行，這裡不需要檢測
          setSession(session);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'operator', // 臨時使用默認角色
            createdAt: session.user.created_at,
          });
          setLoading(false); // 立即停止 loading，讓用戶可以進入系統
          
          // 在後台異步更新角色（不阻塞 UI）
          getUserRole(session.user)
            .then((role) => {
              if (mounted) {
                console.log('✅ 後台獲取角色成功，更新為:', role);
                setUser(prev => prev ? { ...prev, role } : null);
              }
            })
            .catch((err) => {
              console.warn('⚠️ 後台獲取角色失敗，保持默認角色:', err);
              // 保持默認角色，不影響用戶使用
            });
        } else {
          console.log('ℹ️ 沒有現有會話');
          setLoading(false);
        }
        
        isInitializingRef.current = false; // 標記初始化完成
      })
      .catch((error) => {
        if (!mounted) return;
        
        // 清除超時
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        
        console.error('❌ 獲取會話異常:', error);
        setLoading(false);
        isInitializingRef.current = false; // 標記初始化完成
      });

    // 監聽 BroadcastChannel 消息（跨分頁通信）
    let broadcastChannel: BroadcastChannel | null = null;
    
    if (typeof window !== 'undefined') {
      // 監聽登出消息
      broadcastChannel = new BroadcastChannel('auth_logout');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'FORCE_LOGOUT') {
          const targetEmail = event.data.email;
          if (user?.email === targetEmail) {
            console.log('🔄 收到強制登出消息，登出當前分頁');
            // 強制登出當前分頁
            if (supabase) {
              supabase.auth.signOut().then(() => {
                setUser(null);
                setSession(null);
                setLoading(false);
                if (window.location.pathname !== '/login') {
                  window.location.href = '/login';
                }
              });
            }
          }
        }
      };
    }

    // 監聽認證狀態變化（跨分頁同步）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 認證狀態變化:', event, session?.user?.email || '已登出');
      
      // 如果登入成功，清除初始化超時（避免超時覆蓋登入狀態）
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ 登入成功，清除初始化超時');
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
        
        // 如果正在初始化（從 getSession() 中），就不需要再次調用 updateUser
        // 避免重複更新和可能的狀態混亂（特別是 loading 狀態）
        if (isInitializingRef.current) {
          console.log('ℹ️ [onAuthStateChange] 正在初始化中，跳過 updateUser（避免重複更新）');
          // 只確保 loading 狀態正確，並確保 session 是最新的
          setLoading(false);
          setSession(session);
          if (!user || user.email !== session.user.email) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              role: 'operator',
              createdAt: session.user.created_at,
            });
          }
          return;
        }
        
        // 如果用戶狀態已經存在且 email 匹配，就不需要再次調用 updateUser
        if (user && user.email === session.user.email && session) {
          console.log('ℹ️ [onAuthStateChange] 用戶狀態已存在，跳過 updateUser（避免重複更新）');
          // 只確保 loading 狀態正確，並確保 session 是最新的
          setLoading(false);
          setSession(session);
          return;
        }
      }
      
      if (session?.user) {
        // 檢查 session 是否有效（單裝置登入檢查）
        if (!supabase) {
          console.warn('⚠️ Supabase 未初始化，跳過 session 檢查');
          await updateUser(session.user, session);
          return;
        }

        // 單裝置登入檢查（如果已設置 device_sessions 表）
        // 添加超時保護，避免阻塞
        try {
          const checkPromise = supabase.rpc('is_session_valid', {
            p_session_token: session.access_token,
          });
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('檢查 session 有效性超時')), 3000);
          });

          const rpcResult = await Promise.race([checkPromise, timeoutPromise]) as any;
          
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
          // 如果 RPC 函數不存在或超時，跳過檢查（兼容舊版本）
          if (err?.message?.includes('does not exist') || 
              err?.message?.includes('超時') ||
              err?.code === '42883') {
            console.log('ℹ️ is_session_valid 函數不存在或超時，跳過單裝置登入檢查');
          } else {
            console.warn('⚠️ 檢查 session 有效性異常:', err);
          }
          // 即使異常，也繼續（降級處理）
        }

        // 強制重新獲取用戶角色（不使用緩存）
        // 但只有在不在初始化中且用戶狀態不存在時才調用（避免與初始化時的設置重複）
        if (!isInitializingRef.current && (!user || user.email !== session.user.email)) {
          console.log('🔄 [onAuthStateChange] 調用 updateUser，更新用戶狀態');
          // 使用非阻塞方式，避免阻塞 UI
          updateUser(session.user, session).catch((err) => {
            console.error('❌ updateUser 失敗:', err);
            // 即使失敗，也要確保 loading 狀態正確
            if (mounted) {
              setLoading(false);
              // 設定基本用戶信息，避免頁面一直載入
              if (session?.user) {
                setSession(session);
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  role: 'operator',
                  createdAt: session.user.created_at,
                });
              }
            }
          });
        } else {
          if (isInitializingRef.current) {
            console.log('ℹ️ [onAuthStateChange] 正在初始化中，跳過 updateUser（避免重複更新）');
          } else {
            console.log('ℹ️ [onAuthStateChange] 用戶狀態已存在，跳過 updateUser（避免重複更新）');
          }
          // 確保 loading 狀態正確（以防萬一）
          setLoading(false);
        }
        
        // 注意：多分頁檢測在 ProtectedRoute 中進行，這裡不需要設置持續監聽器
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
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      subscription.unsubscribe();
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, []); // 只在初始化時執行一次

  // 檢查是否有現有 session（檢查當前瀏覽器是否有該用戶的 session）
  const checkExistingSession = async (email: string): Promise<boolean> => {
    if (!supabase) {
      return false;
    }

    try {
      // 檢查當前瀏覽器是否有該用戶的 session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === email) {
        console.log('✅ 檢測到當前瀏覽器有該用戶的 session，用戶:', email);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('⚠️ 檢查現有 session 失敗:', error);
      return false; // 如果檢查失敗，允許登入（降級處理）
    }
  };

  // 登入（單裝置登入限制）
  const signIn = async (email: string, password: string, forceLogout: boolean = false) => {
    if (!supabase) {
      return { error: { message: 'Supabase 未初始化' } };
    }

    try {
      // 在登入前檢查是否有現有 session（除非用戶已經確認要強制登出）
      if (!forceLogout) {
        const hasExisting = await checkExistingSession(email);
        if (hasExisting) {
          return { error: null, hasExistingSession: true };
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user && data.session) {
        // 如果 forceLogout 為 true，先登出所有其他 session
        if (forceLogout) {
          try {
            // 1. 通知其他分頁登出（使用 BroadcastChannel）
            if (typeof window !== 'undefined') {
              const channel = new BroadcastChannel('auth_logout');
              channel.postMessage({ type: 'FORCE_LOGOUT', email });
              channel.close();
            }
            
            // 2. 刪除 device_sessions 表中的舊 session（如果存在）
            try {
              const { error: deleteError } = await supabase
                .from('device_sessions')
                .delete()
                .neq('session_token', data.session.access_token);
              
              if (deleteError) {
                console.warn('⚠️ 刪除舊 device session 失敗:', deleteError);
              } else {
                console.log('✅ 已刪除舊 device session');
              }
            } catch (err) {
              console.warn('⚠️ 刪除舊 device session 異常:', err);
            }
          } catch (err) {
            console.warn('⚠️ 通知其他分頁登出失敗:', err);
          }
        } else {
          // 如果沒有強制登出，檢查是否有其他設備的 session
          // 注意：這個檢查可能會很慢，所以先完成登入流程，然後在後台檢查
          // 避免阻塞登入
        }
        // 註冊新 session（這會自動刪除舊 session）
        // 使用 Promise.race 避免阻塞（最多等待 5 秒）
        try {
          if (supabase) {
            const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
            const sessionToken = data.session.access_token;
            
            const registerPromise = supabase.rpc('register_device_session', {
              p_session_token: sessionToken,
              p_device_info: deviceInfo,
              p_ip_address: null,
            });
            
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('註冊 device session 超時')), 5000);
            });

            try {
              const result = await Promise.race([registerPromise, timeoutPromise]) as any;
              if (result?.error) {
                console.warn('⚠️ 註冊 device session 失敗:', result.error);
              } else {
                console.log('✅ 已註冊新 session，舊 session 已自動登出');
              }
            } catch (err: any) {
              // 如果函數不存在或超時，跳過（降級處理）
              if (err?.message?.includes('does not exist') || 
                  err?.message?.includes('超時') ||
                  err?.code === '42883') {
                console.log('ℹ️ register_device_session 函數不存在或超時，跳過單裝置登入檢查');
              } else {
                console.warn('⚠️ 註冊 device session 異常:', err);
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ 註冊 device session 異常:', err);
        }

        // 立即設定 session 和基本用戶信息（不等待角色查詢完成）
        // 這樣登入可以立即完成，角色查詢在後台進行
        setSession(data.session);
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          role: 'operator', // 臨時使用默認角色
          createdAt: data.user.created_at,
        });
        setLoading(false); // 立即停止 loading
        
        // 在後台異步更新角色（不阻塞登入流程）
        getUserRole(data.user)
          .then((role) => {
            console.log('✅ 登入後獲取角色成功，更新為:', role);
            setUser(prev => prev ? { ...prev, role } : null);
          })
          .catch((err) => {
            console.warn('⚠️ 登入後獲取角色失敗，保持默認角色:', err);
            // 保持默認角色，不影響登入
          });
        
        // 在後台檢查是否有其他設備的 session（不阻塞登入流程）
        if (!forceLogout) {
          try {
            const { data: deviceSessions, error: deviceError } = await supabase
              .from('device_sessions')
              .select('*')
              .neq('session_token', data.session.access_token)
              .limit(1);
            
            if (!deviceError && deviceSessions && deviceSessions.length > 0) {
              console.log('⚠️ 後台檢測到其他設備的 session，但用戶已登入，將在 ProtectedRoute 中處理');
              // 不返回錯誤，讓用戶正常登入，多分頁檢測會在 ProtectedRoute 中處理
            }
          } catch (err) {
            // device_sessions 表可能不存在，忽略錯誤
            console.log('ℹ️ 無法檢查其他設備的 session:', err);
          }
        }
      }

      return { error: null, hasExistingSession: false };
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
    checkExistingSession,
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
