"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const router = useRouter();

  // 檢查是否有有效的重置 token（從 URL hash）
  useEffect(() => {
    const checkToken = async () => {
      if (!supabase || typeof window === 'undefined') {
        setIsValidToken(false);
        return;
      }

      try {
        // Supabase 會將重置 token 放在 URL hash 中（例如：#access_token=...&type=recovery）
        // 當用戶點擊重置連結時，Supabase 會自動處理 hash 並建立 session
        // 檢查當前 session 是否有效
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('獲取 session 失敗:', sessionError);
          setIsValidToken(false);
          return;
        }

        if (session) {
          // 有 session，表示用戶已點擊重置連結，token 有效
          setIsValidToken(true);
        } else {
          // 沒有 session，檢查 URL hash 中是否有 recovery token
          const hash = window.location.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const type = hashParams.get('type');

          if (accessToken && type === 'recovery') {
            // 有 recovery token，但 Supabase 還沒有自動建立 session
            // 嘗試使用 token 建立 session
            try {
              // 注意：Supabase 通常會自動處理 hash 中的 token
              // 但如果沒有自動處理，我們需要等待一下或手動處理
              // 這裡先設為 true，允許用戶嘗試重置密碼
              setIsValidToken(true);
            } catch (err) {
              console.error('處理 token 失敗:', err);
              setIsValidToken(false);
            }
          } else {
            // 沒有有效的 token
            setIsValidToken(false);
          }
        }
      } catch (err) {
        console.error('檢查 token 失敗:', err);
        setIsValidToken(false);
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // 驗證密碼
    if (password.length < 6) {
      setError('密碼長度至少需要 6 個字元');
      return;
    }

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        setError('系統未初始化，請稍後再試');
        setLoading(false);
        return;
      }

      // 檢查是否有 session（用戶已點擊重置連結）
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // 如果沒有 session，檢查 URL hash 中是否有 token（Supabase 可能還沒有處理）
      if (!session && typeof window !== 'undefined') {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
          // Supabase 的 detectSessionInUrl 應該會自動處理，但如果沒有，我們等待一下
          // 實際上，Supabase 會在初始化時自動處理 hash 中的 token
          // 這裡再檢查一次 session
          await new Promise(resolve => setTimeout(resolve, 500)); // 等待 500ms
          const retrySession = await supabase.auth.getSession();
          session = retrySession.data.session;
        }
      }

      if (!session) {
        setError('重置連結無效或已過期，請重新申請密碼重置');
        setLoading(false);
        return;
      }

      // 更新密碼（需要有效的 session）
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || '重置密碼失敗，請稍後再試');
        console.error('重置密碼錯誤:', updateError);
      } else {
        setSuccess(true);
        setPassword('');
        setConfirmPassword('');
        
        // 3 秒後跳轉到登入頁
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err: any) {
      console.error('重置密碼異常:', err);
      setError(err.message || '重置密碼失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 載入中或檢查 token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-gray-400">檢查重置連結中...</div>
      </div>
    );
  }

  // Token 無效
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 shadow-xl">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-300 mb-2">重置連結無效</h1>
              <p className="text-gray-500 mb-6">
                此重置連結無效或已過期。請重新申請密碼重置。
              </p>
              <Link
                href="/forgot-password"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                重新申請密碼重置
              </Link>
              <div className="mt-4">
                <Link
                  href="/login"
                  className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                >
                  返回登入
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 成功訊息
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 shadow-xl">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-green-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-300 mb-2">密碼重置成功</h1>
              <p className="text-gray-500 mb-6">
                您的密碼已成功重置。正在跳轉到登入頁面...
              </p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                立即登入
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 重置密碼表單
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 shadow-xl">
          {/* 標題 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              重置密碼
            </h1>
            <p className="text-gray-500 text-sm">請輸入您的新密碼</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 新密碼 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                新密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
                placeholder="至少 6 個字元"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">密碼長度至少需要 6 個字元</p>
            </div>

            {/* 確認密碼 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                確認新密碼
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
                placeholder="再次輸入新密碼"
                disabled={loading}
              />
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all
                       ${loading
                         ? 'bg-gray-700 cursor-not-allowed'
                         : 'bg-blue-600 hover:bg-blue-500 active:scale-95'}`}
            >
              {loading ? '重置中...' : '重置密碼'}
            </button>
          </form>

          {/* 返回登入連結 */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              返回登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
