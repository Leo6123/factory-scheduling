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

  // 測試 Supabase 連接和權限
  const testSupabaseConnection = async () => {
    const { supabase, TABLES } = await import('@/lib/supabase');
    if (!supabase) {
      console.error('❌ Supabase 客戶端未初始化');
      console.error('請檢查環境變數：NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return false;
    }
    
    try {
      // 測試讀取權限
      console.log('🔍 測試讀取權限...');
      const { data: readData, error: readError } = await supabase
        .from(TABLES.SCHEDULE_ITEMS)
        .select('id')
        .limit(1);
      
      if (readError) {
        console.error('❌ Supabase 讀取測試失敗:', readError);
        console.error('錯誤代碼:', readError.code);
        console.error('錯誤訊息:', readError.message);
        if (readError.code === 'PGRST301' || readError.message?.includes('RLS')) {
          console.error('⚠️ 可能是 RLS (Row Level Security) 政策問題');
          console.error('請在 Supabase SQL Editor 執行 supabase_rls_policy.sql 腳本');
        }
        return false;
      }
      
      console.log('✅ 讀取權限 OK');
      
      // 測試寫入權限（使用一個測試 ID）
      console.log('🔍 測試寫入權限...');
      const testId = `test-${Date.now()}`;
      const { error: writeError } = await supabase
        .from(TABLES.SCHEDULE_ITEMS)
        .upsert({
          id: testId,
          product_name: 'TEST',
          batch_number: 'TEST',
          quantity: 0,
          delivery_date: '2026-01-01',
          line_id: 'TEST',
        }, { onConflict: 'id' });
      
      if (writeError) {
        console.error('❌ Supabase 寫入測試失敗:', writeError);
        console.error('錯誤代碼:', writeError.code);
        console.error('錯誤訊息:', writeError.message);
        if (writeError.code === 'PGRST301' || writeError.message?.includes('RLS')) {
          console.error('⚠️ 可能是 RLS (Row Level Security) 政策問題');
          console.error('請在 Supabase SQL Editor 執行 supabase_rls_policy.sql 腳本');
        }
        return false;
      }
      
      // 刪除測試資料
      await supabase
        .from(TABLES.SCHEDULE_ITEMS)
        .delete()
        .eq('id', testId);
      
      console.log('✅ 寫入權限 OK');
      console.log('✅ Supabase 連接正常，所有權限 OK');
      return true;
    } catch (err) {
      console.error('❌ Supabase 連接測試異常:', err);
      return false;
    }
  };

  // 保存快照
  const handleSave = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // 先保存到 localStorage（快速響應）
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(scheduleItems));
      localStorage.setItem(SNAPSHOT_CONFIGS_KEY, JSON.stringify(lineConfigs));
      
      setHasSnapshot(true);
      setShowConfirm(false);
      
      // 測試 Supabase 連接
      const connectionOk = await testSupabaseConnection();
      if (!connectionOk) {
        alert('⚠️ Supabase 連接測試失敗\n\n請檢查：\n1. 環境變數是否正確設定\n2. Supabase 專案是否正常運行\n3. 瀏覽器控制台 (F12) 的錯誤訊息');
        return;
      }
      
      // 同時保存到 Supabase 資料庫
      console.log('💾 開始保存到 Supabase，資料筆數:', scheduleItems.length);
      const { saveScheduleItemsToDB } = await import('@/hooks/useScheduleData');
      const dbSuccess = await saveScheduleItemsToDB(scheduleItems);
      
      if (dbSuccess) {
        console.log('✅ 已保存到 Supabase 資料庫');
        alert('✅ 存檔成功！已保存到資料庫');
      } else {
        console.error('❌ 保存到資料庫失敗');
        console.error('═══════════════════════════════════════');
        console.error('請檢查以下項目：');
        console.error('1. 瀏覽器控制台是否有 Supabase 錯誤訊息（上方）');
        console.error('2. Supabase RLS (Row Level Security) 政策是否設定');
        console.error('   執行步驟：');
        console.error('   a. 在 Supabase Dashboard 點擊 SQL Editor');
        console.error('   b. 執行 supabase_rls_policy.sql 腳本');
        console.error('3. 環境變數是否正確設定（Vercel）');
        console.error('4. 網路連線是否正常');
        console.error('═══════════════════════════════════════');
        
        // 嘗試獲取更詳細的錯誤資訊
        const { supabase, TABLES } = await import('@/lib/supabase');
        if (supabase) {
          // 測試寫入權限
          const testResult = await supabase
            .from(TABLES.SCHEDULE_ITEMS)
            .insert({ 
              id: `test-${Date.now()}`, 
              product_name: 'TEST', 
              batch_number: 'TEST', 
              quantity: 0, 
              delivery_date: '2026-01-01', 
              line_id: 'TEST' 
            })
            .select();
          
          if (testResult.error) {
            console.error('🔍 詳細錯誤資訊：');
            console.error('錯誤代碼:', testResult.error.code);
            console.error('錯誤訊息:', testResult.error.message);
            console.error('錯誤詳情:', JSON.stringify(testResult.error, null, 2));
            
            if (testResult.error.code === 'PGRST301' || testResult.error.message?.includes('RLS') || testResult.error.message?.includes('permission')) {
              console.error('⚠️ 這是 RLS 政策問題！');
              console.error('解決方法：在 Supabase SQL Editor 執行以下 SQL：');
              console.error(`
CREATE POLICY "Allow all operations on schedule_items"
ON public.schedule_items
FOR ALL
USING (true)
WITH CHECK (true);
              `);
            }
          }
        }
        
        alert('⚠️ 存檔成功（已保存到本地），但資料庫保存失敗\n\n請開啟瀏覽器控制台 (F12) 查看詳細錯誤訊息和解決步驟');
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

