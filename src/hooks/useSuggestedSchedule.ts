"use client";

import { useState, useEffect, useCallback } from 'react';
import { SuggestedSchedule, SuggestedScheduleMap } from '@/types/suggestedSchedule';
import { supabase, TABLES } from '@/lib/supabase';

// localStorage 備用方案
const STORAGE_KEY = 'factory_suggested_schedules';

// 從 localStorage 載入資料
function loadFromLocalStorage(): SuggestedScheduleMap {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    const schedules: SuggestedSchedule[] = JSON.parse(data);
    // 轉換為 Map 格式
    const map: SuggestedScheduleMap = {};
    schedules.forEach((schedule) => {
      map[schedule.materialNumber] = schedule;
    });
    return map;
  } catch {
    return {};
  }
}

// 儲存到 localStorage
function saveToLocalStorage(schedules: SuggestedSchedule[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  } catch (error) {
    console.error('儲存到 localStorage 失敗:', error);
  }
}

// 從資料庫載入建議排程
async function loadSuggestedSchedulesFromDB(): Promise<SuggestedScheduleMap> {
  if (!supabase) {
    console.log('Supabase 未設定，從 localStorage 載入建議排程');
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.SUGGESTED_SCHEDULES || 'suggested_schedules')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      console.error('載入建議排程失敗:', error);
      // 如果錯誤是因為表不存在，使用 localStorage
      if (error.message && (error.message.includes('does not exist') || error.message.includes('relation'))) {
        console.warn('⚠️ 資料庫表不存在，使用 localStorage');
      }
      return loadFromLocalStorage();
    }

    if (!data || !Array.isArray(data)) {
      console.warn('資料格式不正確，使用 localStorage');
      return loadFromLocalStorage();
    }

    // 轉換資料庫格式為應用格式
    const schedules: SuggestedSchedule[] = data.map((row: any) => {
      let suggestedLines: string[] = [];
      
      // 處理 suggested_lines 欄位（可能是 JSONB 或 JSON）
      if (Array.isArray(row.suggested_lines)) {
        suggestedLines = row.suggested_lines;
      } else if (typeof row.suggested_lines === 'string') {
        try {
          suggestedLines = JSON.parse(row.suggested_lines);
        } catch {
          // 如果不是 JSON，可能是逗號分隔的字串
          suggestedLines = row.suggested_lines.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }
      }
      
      return {
        materialNumber: row.material_number,
        suggestedLines,
        lastUpdated: row.last_updated || row.updated_at,
      };
    });

    // 轉換為 Map 格式
    const map: SuggestedScheduleMap = {};
    schedules.forEach((schedule) => {
      map[schedule.materialNumber] = schedule;
    });

    // 同時更新 localStorage
    saveToLocalStorage(schedules);

    console.log(`✅ 成功從 Supabase 載入 ${schedules.length} 筆建議排程`);
    return map;
  } catch (error) {
    console.error('載入建議排程異常:', error);
    return loadFromLocalStorage();
  }
}

// 儲存建議排程到資料庫
async function saveSuggestedSchedulesToDB(schedules: SuggestedSchedule[]): Promise<boolean> {
  // 先儲存到 localStorage 作為備用（無論資料庫是否成功）
  saveToLocalStorage(schedules);
  console.log('💾 已儲存到 localStorage，共', schedules.length, '筆');

  if (!supabase) {
    console.log('⚠️ Supabase 未設定，僅使用 localStorage 儲存建議排程');
    return true; // 僅使用 localStorage
  }

  try {
    // 轉換為資料庫格式
    const dbItems = schedules.map((schedule) => ({
      material_number: schedule.materialNumber,
      suggested_lines: schedule.suggestedLines, // JSONB 格式，Supabase 會自動處理
      last_updated: schedule.lastUpdated || new Date().toISOString(),
    }));

    console.log('📤 開始儲存', dbItems.length, '筆到 Supabase...');

    // 如果資料量很大（> 500 筆），使用批次處理
    const BATCH_SIZE = 500;
    let totalProcessed = 0;
    let hasError = false;

    if (dbItems.length > BATCH_SIZE) {
      const totalBatches = Math.ceil(dbItems.length / BATCH_SIZE);
      console.log(`📦 資料量較大 (${dbItems.length} 筆)，使用批次處理 (每批 ${BATCH_SIZE} 筆，共 ${totalBatches} 批)`);
      
      // 批次處理（每個批次有獨立的超時保護，但總體不設超時限制，讓所有批次完成）
      for (let i = 0; i < dbItems.length; i += BATCH_SIZE) {
        const batch = dbItems.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        
        console.log(`📦 處理批次 ${batchNum}/${totalBatches} (${batch.length} 筆)...`);
        
        try {
          // 每個批次設定單獨的超時（15 秒），避免單一批次卡住
          const batchTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`批次 ${batchNum} 超時（15 秒）`));
            }, 15000);
          });
          
          const upsertPromise = supabase
            .from(TABLES.SUGGESTED_SCHEDULES || 'suggested_schedules')
            .upsert(batch, { onConflict: 'material_number' });

          const { error: batchError } = await Promise.race([
            upsertPromise.then(result => result),
            batchTimeoutPromise,
          ]) as { error: any };

          if (batchError) {
            console.error(`❌ 批次 ${batchNum} 儲存失敗:`, batchError);
            console.error('錯誤代碼:', batchError.code);
            console.error('錯誤訊息:', batchError.message);
            hasError = true;
            // 繼續處理其他批次，不完全失敗
          } else {
            totalProcessed += batch.length;
            console.log(`✅ 批次 ${batchNum} 儲存成功 (${batch.length} 筆)`);
          }
        } catch (batchErr: any) {
          console.error(`❌ 批次 ${batchNum} 異常:`, batchErr);
          if (batchErr.message?.includes('超時')) {
            console.warn(`⚠️ 批次 ${batchNum} 超時，跳過此批次，繼續處理下一批`);
          }
          hasError = true;
        }
      }
      
      // 所有批次處理完成後才返回結果
      if (hasError) {
        console.warn(`⚠️ 部分批次儲存失敗，成功: ${totalProcessed}/${dbItems.length} 筆`);
        // 即使有部分失敗，因為 localStorage 已保存，所以返回 true
        return true;
      }
      
      console.log(`✅ 所有批次儲存成功，共 ${totalProcessed} 筆`);
      return true;
    }

      // 資料量不大，直接使用 upsert（單一批次超時：15 秒）
      const singleBatchTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Supabase 儲存超時（15 秒），資料已儲存到本地'));
        }, 15000);
      });
      
      const upsertPromise = supabase
        .from(TABLES.SUGGESTED_SCHEDULES || 'suggested_schedules')
        .upsert(dbItems, { onConflict: 'material_number' });

      const { error } = await Promise.race([
        upsertPromise.then(result => result),
        singleBatchTimeoutPromise,
      ]) as { error: any };

      if (error) {
        console.error('❌ 儲存建議排程到 Supabase 失敗:', error);
        console.error('錯誤代碼:', error.code);
        console.error('錯誤訊息:', error.message);
        // 即使 Supabase 失敗，localStorage 已保存，所以返回 true
        console.warn('⚠️ 資料已儲存到 localStorage，但 Supabase 儲存失敗');
        return true; // 因為 localStorage 已保存，所以返回 true
      }

      console.log(`✅ 成功儲存 ${schedules.length} 筆建議排程到 Supabase`);
      return true;
    } catch (error: any) {
      console.error('❌ 儲存建議排程異常:', error);
      
      // 檢查是否是超時錯誤
      if (error.message?.includes('超時')) {
        console.warn('⚠️ Supabase 儲存超時，但資料已儲存到 localStorage');
        // 如果是批次處理中的超時，可能部分批次已成功，所以仍然返回 true
        return true;
      } else {
        console.warn('⚠️ 資料已儲存到 localStorage，但 Supabase 儲存異常');
      }
      
      // 即使異常，localStorage 已保存，所以返回 true
      return true; // 因為 localStorage 已保存，所以返回 true
    }
  }

// 自訂 Hook：管理建議排程資料
export function useSuggestedSchedule() {
  const [scheduleMap, setScheduleMap] = useState<SuggestedScheduleMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入資料
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loadSuggestedSchedulesFromDB();
      setScheduleMap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入資料失敗');
      setScheduleMap(loadFromLocalStorage());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 匯入建議排程（覆蓋現有數據）
  const importSchedules = useCallback(async (schedules: SuggestedSchedule[]) => {
    setError(null);
    try {
      // 先更新本地狀態（立即反映在 UI 上）
      const newMap: SuggestedScheduleMap = {};
      schedules.forEach((schedule) => {
        newMap[schedule.materialNumber] = schedule;
      });
      setScheduleMap(newMap);
      
      // 然後保存到資料庫（非阻塞）
      const success = await saveSuggestedSchedulesToDB(schedules);
      
      if (success) {
        return true;
      } else {
        // 即使 Supabase 失敗，localStorage 已保存，所以仍然返回 true
        // 但顯示警告訊息
        setError('資料已儲存到本地，但 Supabase 儲存失敗（請檢查網路連線）');
        return true; // 因為 localStorage 已保存，所以返回 true
      }
    } catch (err) {
      console.error('匯入建議排程異常:', err);
      setError(err instanceof Error ? err.message : '匯入失敗');
      // 即使異常，localStorage 可能已保存，所以返回 true
      return true;
    }
  }, []);

  // 根據 Material Number 取得建議排程
  const getSuggestedSchedule = useCallback((materialNumber: string): string[] | null => {
    const schedule = scheduleMap[materialNumber];
    return schedule ? schedule.suggestedLines : null;
  }, [scheduleMap]);

  // 初始化載入
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    scheduleMap,
    isLoading,
    error,
    loadData,
    importSchedules,
    getSuggestedSchedule,
  };
}

