"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!supabase) {
        setError('系統未初始化，請稍後再試');
        return;
      }

      // 獲取當前 URL（用於重置連結的重定向）
      const siteUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      
      // 調用 Supabase 的密碼重置功能
      // resetPasswordForEmail 會發送包含重置連結的 email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      });

      if (resetError) {
        // 即使是錯誤（例如 email 不存在），為了安全考量，也顯示成功訊息
        // 這樣可以防止攻擊者探測哪些 email 已註冊
        console.error('密碼重置錯誤:', resetError);
        // 但實際上 Supabase 在 email 不存在時也會返回成功（安全考量）
      }

      // 顯示成功訊息（無論 email 是否存在，都顯示相同訊息，防止 email 探測）
      setSuccess(true);
      setEmail(''); // 清空 email 欄位
      
    } catch (err: any) {
      console.error('密碼重置異常:', err);
      // 即使發生異常，也顯示成功訊息（安全考量）
      setSuccess(true);
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 shadow-xl">
          {/* 標題 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              忘記密碼
            </h1>
            <p className="text-gray-500 text-sm">請輸入您的電子郵件地址，我們將發送密碼重置連結給您</p>
          </div>

          {success ? (
            /* 成功訊息 */
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium mb-1">已發送重置連結</p>
                    <p className="text-green-300/80 text-sm">
                      如果該電子郵件地址已註冊，我們已發送密碼重置連結到您的電子郵件信箱。請檢查您的收件匣（包括垃圾郵件資料夾），然後點擊連結以重置密碼。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="w-full py-2 px-4 rounded-lg font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  重新發送
                </button>
                <Link
                  href="/login"
                  className="block w-full text-center py-2 px-4 rounded-lg font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  返回登入
                </Link>
              </div>
            </div>
          ) : (
            /* 表單 */
            <>
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
                  {loading ? '發送中...' : '發送重置連結'}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
