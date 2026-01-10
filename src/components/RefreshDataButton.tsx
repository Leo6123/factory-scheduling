"use client";

import { useState } from 'react';

interface RefreshDataButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
}

/**
 * 強制重新載入資料按鈕
 * 清除 localStorage 並從資料庫重新載入
 */
export default function RefreshDataButton({ onRefresh, className = '' }: RefreshDataButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // 清除 localStorage 中的排程資料（強制從資料庫重新載入）
      try {
        localStorage.removeItem('factory_schedule_items');
        localStorage.removeItem('factory_schedule_snapshot');
        console.log('✅ 已清除 localStorage 緩存');
      } catch (err) {
        console.warn('⚠️ 清除 localStorage 失敗:', err);
      }

      // 重新載入資料
      await onRefresh();
      
      // 重新載入頁面以確保所有狀態重置
      console.log('✅ 資料已重新載入，重新整理頁面...');
      window.location.reload();
    } catch (error) {
      console.error('❌ 重新載入資料失敗:', error);
      alert('重新載入資料失敗，請檢查網路連線');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`w-full h-8 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap
                 transition-all duration-200
                 ${isRefreshing
                   ? "bg-gray-600 cursor-not-allowed opacity-50"
                   : "bg-purple-600 hover:bg-purple-500 active:scale-95"
                 } ${className}`}
      title="清除本地緩存並從資料庫重新載入資料（僅在 Realtime 同步失敗或資料不一致時使用）\n\n注意：由於已啟用 Realtime 同步，資料會自動同步。此按鈕會重新整理整個頁面。"
    >
      <svg 
        className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
      {isRefreshing ? "重新載入中..." : "重新載入資料"}
    </button>
  );
}
