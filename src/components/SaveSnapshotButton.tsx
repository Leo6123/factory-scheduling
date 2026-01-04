"use client";

import { useState, useEffect } from "react";
import { ScheduleItem } from "@/types/schedule";
import { LineConfig } from "@/types/productionLine";

interface SaveSnapshotButtonProps {
  scheduleItems: ScheduleItem[];
  lineConfigs: Record<string, LineConfig>;
  onLoadSnapshot?: (items: ScheduleItem[], configs: Record<string, LineConfig>) => void;
}

const SNAPSHOT_KEY = 'factory_schedule_snapshot';
const SNAPSHOT_CONFIGS_KEY = 'factory_line_configs_snapshot';

export default function SaveSnapshotButton({
  scheduleItems,
  lineConfigs,
  onLoadSnapshot,
}: SaveSnapshotButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasSnapshot, setHasSnapshot] = useState(false);

  // 檢查是否有存檔
  const checkSnapshot = () => {
    if (typeof window === 'undefined') return false;
    try {
      const snapshot = localStorage.getItem(SNAPSHOT_KEY);
      return !!snapshot;
    } catch {
      return false;
    }
  };

  // 初始化時檢查
  useEffect(() => {
    setHasSnapshot(checkSnapshot());
  }, []);

  // 保存快照
  const handleSave = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // 先保存到 localStorage（快速響應）
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(scheduleItems));
      localStorage.setItem(SNAPSHOT_CONFIGS_KEY, JSON.stringify(lineConfigs));
      
      setHasSnapshot(true);
      setShowConfirm(false);
      
      // 同時保存到 Supabase 資料庫
      const { saveScheduleItemsToDB } = await import('@/hooks/useScheduleData');
      const dbSuccess = await saveScheduleItemsToDB(scheduleItems);
      
      if (dbSuccess) {
        console.log('✅ 已保存到 Supabase 資料庫');
        alert('✅ 存檔成功！已保存到資料庫');
      } else {
        console.warn('⚠️ 保存到資料庫失敗，但已保存到本地');
        alert('✅ 存檔成功（已保存到本地，但資料庫保存失敗，請檢查網路連線或資料庫欄位）');
      }
    } catch (error) {
      console.error('存檔失敗:', error);
      alert('❌ 存檔失敗，請稍後再試');
    }
  };

  // 載入快照
  const handleLoad = () => {
    if (typeof window === 'undefined') return;
    
    if (!hasSnapshot) {
      alert('⚠️ 沒有找到存檔');
      return;
    }

    if (!window.confirm('確定要載入存檔嗎？這將會覆蓋目前的排程。')) {
      return;
    }

    try {
      const snapshotData = localStorage.getItem(SNAPSHOT_KEY);
      const configsData = localStorage.getItem(SNAPSHOT_CONFIGS_KEY);
      
      if (!snapshotData) {
        alert('⚠️ 存檔資料不存在');
        return;
      }

      const items: ScheduleItem[] = JSON.parse(snapshotData);
      const configs: Record<string, LineConfig> = configsData 
        ? JSON.parse(configsData)
        : {};

      if (onLoadSnapshot) {
        onLoadSnapshot(items, configs);
        alert('✅ 載入存檔成功！');
        setShowConfirm(false);
      }
    } catch (error) {
      console.error('載入存檔失敗:', error);
      alert('❌ 載入存檔失敗，請稍後再試');
    }
  };

  // 刪除快照
  const handleDelete = () => {
    if (typeof window === 'undefined') return;
    
    if (!window.confirm('確定要刪除存檔嗎？')) {
      return;
    }

    try {
      localStorage.removeItem(SNAPSHOT_KEY);
      localStorage.removeItem(SNAPSHOT_CONFIGS_KEY);
      setHasSnapshot(false);
      alert('✅ 存檔已刪除');
    } catch (error) {
      console.error('刪除存檔失敗:', error);
      alert('❌ 刪除存檔失敗');
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                   bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 
                   border border-blue-500/50 hover:border-blue-400
                   transition-all"
        title="保存當前排程狀態"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
          />
        </svg>
        存檔
        {hasSnapshot && (
          <span className="text-[10px] bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded">
            有存檔
          </span>
        )}
      </button>

      {/* 確認對話框 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowConfirm(false)}
          />

          {/* 對話框 */}
          <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-white/20 rounded-xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">📦 存檔管理</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                           bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 
                           border border-blue-500/50 hover:border-blue-400
                           transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  保存當前排程
                </button>

                {hasSnapshot && (
                  <>
                    <button
                      onClick={handleLoad}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                               bg-green-500/20 text-green-300 hover:bg-green-500/30 
                               border border-green-500/50 hover:border-green-400
                               transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      載入存檔
                    </button>

                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                               bg-red-500/20 text-red-300 hover:bg-red-500/30 
                               border border-red-500/50 hover:border-red-400
                               transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      刪除存檔
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowConfirm(false)}
                className="mt-4 w-full px-4 py-2 rounded-lg text-sm
                         bg-gray-700 text-gray-300 hover:bg-gray-600
                         transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

