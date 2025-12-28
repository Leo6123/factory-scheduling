"use client";

import { useState, useEffect, useCallback } from 'react';
import { ScheduleItem } from '@/types/schedule';
import { supabase, TABLES, scheduleItemToDB, dbToScheduleItem } from '@/lib/supabase';
import { LineConfig } from '@/types/productionLine';

// localStorage 備用方案
const STORAGE_KEY = 'factory_schedule_items';
const LINE_CONFIGS_KEY = 'factory_line_configs';

// 從 localStorage 載入資料
function loadFromLocalStorage(): ScheduleItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 儲存到 localStorage
function saveToLocalStorage(items: ScheduleItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('儲存到 localStorage 失敗:', error);
  }
}

// 從資料庫載入排程項目
async function loadScheduleItemsFromDB(): Promise<ScheduleItem[]> {
  if (!supabase) {
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from(TABLES.SCHEDULE_ITEMS)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('載入排程項目失敗:', error);
      return loadFromLocalStorage();
    }

    // 確保 data 存在且為陣列
    if (!data || !Array.isArray(data)) {
      console.warn('資料格式不正確，使用 localStorage');
      return loadFromLocalStorage();
    }

    return data.map(dbToScheduleItem);
  } catch (error) {
    console.error('載入排程項目異常:', error);
    return loadFromLocalStorage();
  }
}

// 儲存排程項目到資料庫
async function saveScheduleItemsToDB(items: ScheduleItem[]): Promise<boolean> {
  // 同時儲存到 localStorage 作為備用
  saveToLocalStorage(items);

  if (!supabase) {
    return true; // 僅使用 localStorage
  }

  try {
    // 使用 upsert 更新或插入所有項目
    const dbItems = items.map(scheduleItemToDB);
    
    const { error } = await supabase
      .from(TABLES.SCHEDULE_ITEMS)
      .upsert(dbItems, { onConflict: 'id' });

    if (error) {
      console.error('儲存排程項目失敗:', error);
      console.error('錯誤詳情:', JSON.stringify(error, null, 2));
      return false;
    }

    return true;
  } catch (error) {
    console.error('儲存排程項目異常:', error);
    return false;
  }
}

// 刪除排程項目
async function deleteScheduleItemFromDB(itemId: string): Promise<boolean> {
  if (!supabase) {
    // 從 localStorage 刪除
    const items = loadFromLocalStorage();
    const filtered = items.filter(item => item.id !== itemId);
    saveToLocalStorage(filtered);
    return true;
  }

  try {
    const { error } = await supabase
      .from(TABLES.SCHEDULE_ITEMS)
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('刪除排程項目失敗:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('刪除排程項目異常:', error);
    return false;
  }
}

// 自訂 Hook：管理排程資料
export function useScheduleData(initialItems: ScheduleItem[] = []) {
  const [items, setItems] = useState<ScheduleItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 載入資料
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await loadScheduleItemsFromDB();
      // 只使用資料庫的資料，不使用模擬資料
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入資料失敗');
      // 錯誤時才使用模擬資料（僅用於開發測試，當 Supabase 未設定時）
      setItems(initialItems);
    } finally {
      setIsLoading(false);
    }
  }, [initialItems]);

  // 儲存資料
  const saveData = useCallback(async (newItems: ScheduleItem[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const success = await saveScheduleItemsToDB(newItems);
      if (success) {
        setItems(newItems);
      } else {
        setError('儲存失敗，請檢查網路連線');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存資料失敗');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // 更新單一項目
  const updateItem = useCallback(async (item: ScheduleItem) => {
    const newItems = items.map(i => i.id === item.id ? item : i);
    await saveData(newItems);
  }, [items, saveData]);

  // 新增項目
  const addItem = useCallback(async (item: ScheduleItem) => {
    const newItems = [...items, item];
    await saveData(newItems);
  }, [items, saveData]);

  // 刪除項目
  const deleteItem = useCallback(async (itemId: string) => {
    const success = await deleteScheduleItemFromDB(itemId);
    if (success) {
      const newItems = items.filter(i => i.id !== itemId);
      setItems(newItems);
      saveToLocalStorage(newItems);
    }
  }, [items]);

  // 批次更新
  const updateItems = useCallback(async (newItems: ScheduleItem[]) => {
    await saveData(newItems);
  }, [saveData]);

  // 初始化載入
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    items,
    isLoading,
    isSaving,
    error,
    loadData,
    saveData,
    updateItem,
    addItem,
    deleteItem,
    updateItems,
  };
}

