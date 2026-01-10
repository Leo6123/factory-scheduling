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

  // 設定超時保護（20 秒）
  const TIMEOUT_MS = 20000;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // 創建超時 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Supabase 儲存超時（20 秒），資料已儲存到本地'));
      }, TIMEOUT_MS);
    });

    // 轉換為資料庫格式
    const dbItems = schedules.map((schedule) => ({
      material_number: schedule.materialNumber,
      suggested_lines: schedule.suggestedLines, // JSONB 格式，Supabase 會自動處理
      last_updated: schedule.lastUpdated || new Date().toISOString(),
    }));

    console.log('📤 開始儲存', dbItems.length, '筆到 Supabase...');

    // 使用 upsert 更新或插入（帶超時保護）
    const upsertPromise = supabase
      .from(TABLES.SUGGESTED_SCHEDULES || 'suggested_schedules')
      .upsert(dbItems, { onConflict: 'material_number' });

    const { error } = await Promise.race([
      upsertPromise.then(result => result),
      timeoutPromise,
    ]) as { error: any };

    // 清除超時
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

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
    // 清除超時
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    console.error('❌ 儲存建議排程異常:', error);
    
    // 檢查是否是超時錯誤
    if (error.message?.includes('超時')) {
      console.warn('⚠️ Supabase 儲存超時，資料已儲存到 localStorage');
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

