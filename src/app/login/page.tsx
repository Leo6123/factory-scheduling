"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{ email: string; password: string } | null>(null);
  const { signIn, user, loading: authLoading, checkExistingSession } = useAuth();
  const router = useRouter();

  // 如果已登入，重定向到首頁
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 先檢查當前瀏覽器是否有該用戶的 session（同一瀏覽器的新分頁）
      const hasExisting = await checkExistingSession(email);
      
      if (hasExisting) {
        // 同一瀏覽器的新分頁，顯示確認對話框
        setPendingLogin({ email, password });
        setShowConfirmDialog(true);
        setLoading(false);
        return;
      }

      // 嘗試登入
      const result = await signIn(email, password);

      if (result.error) {
        // 提供更詳細的錯誤訊息
        let errorMessage = result.error.message || '登入失敗，請檢查帳號密碼';
        
        if (result.error.message?.includes('Invalid login credentials') || 
            result.error.message?.includes('invalid_credentials')) {
          errorMessage = '登入失敗：帳號或密碼錯誤\n\n' +
            '可能原因：\n' +
            '1. 用戶尚未在 Supabase 中建立帳號\n' +
            '2. 密碼輸入錯誤\n\n' +
            '解決方法：請在 Supabase Dashboard > Authentication > Users 中建立用戶帳號';
        }
        
        setError(errorMessage);
        console.error('登入錯誤:', result.error);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || '登入失敗，請稍後再試');
      console.error('登入異常:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLogout = async () => {
    if (!pendingLogin) return;
    
    setShowConfirmDialog(false);
    setLoading(true);
    setError(null);

    try {
      // 強制登出舊 session 並登入
      const result = await signIn(pendingLogin.email, pendingLogin.password, true);
      
      if (result.error) {
        setError(result.error.message || '登入失敗，請檢查帳號密碼');
        console.error('登入錯誤:', result.error);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || '登入失敗，請稍後再試');
      console.error('登入異常:', err);
    } finally {
      setLoading(false);
      setPendingLogin(null);
    }
  };

  const handleCancelLogout = () => {
    setShowConfirmDialog(false);
    setPendingLogin(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-gray-400">載入中...</div>
      </div>
    );
  }

  if (user) {
    return null; // 重定向中
  }

  return (
    <>
      {/* 確認對話框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="檢測到現有登入"
        message={`此帳號（${pendingLogin?.email}）已在其他分頁或裝置登入。\n\n是否要關閉原分頁/裝置並在此處重新登入？\n\n選擇「確認」將登出原分頁/裝置，選擇「取消」將取消登入。`}
        confirmText="確認"
        cancelText="取消"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        type="warning"
      />

      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 shadow-xl">
          {/* 標題 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              工廠排程系統 APS
            </h1>
            <p className="text-gray-500 text-sm">請登入以繼續</p>
          </div>

          {/* 登入表單 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                電子郵件
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
                placeholder="your.email@example.com"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
                placeholder="••••••••"
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
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          {/* 忘記密碼連結 */}
          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              忘記密碼？
            </a>
          </div>

          {/* 提示訊息 */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>首次使用？請聯繫系統管理員建立帳號</p>
          </div>
        </div>

        {/* 開發提示（生產環境應該移除） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center text-xs text-gray-600">
            <p>開發模式：請在 Supabase 中建立用戶帳號</p>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
