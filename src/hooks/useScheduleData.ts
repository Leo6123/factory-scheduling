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

// 從資料庫載入排程項目（優先從資料庫載入，不使用 localStorage）
async function loadScheduleItemsFromDB(): Promise<ScheduleItem[]> {
  if (!supabase) {
    console.warn('⚠️ Supabase 未初始化，返回空陣列（不使用 localStorage 避免不同瀏覽器顯示不同）');
    return [];
  }

  try {
    console.log('📥 開始從資料庫載入排程項目...');
    
    const { data, error } = await supabase
      .from(TABLES.SCHEDULE_ITEMS)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ 載入排程項目失敗:', error);
      // 不再回退到 localStorage，直接返回空陣列
      // 這樣所有瀏覽器都會顯示相同的狀態（空），不會因為 localStorage 不同而顯示不同
      return [];
    }

    // 確保 data 存在且為陣列
    if (!data || !Array.isArray(data)) {
      console.warn('⚠️ 資料格式不正確，返回空陣列');
      return [];
    }

    const items = data.map(dbToScheduleItem);
    console.log('✅ 從資料庫載入成功，共', items.length, '筆');
    
    // 同步更新 localStorage（作為備用，但不作為主要數據源）
    saveToLocalStorage(items);
    
    return items;
  } catch (error) {
    console.error('❌ 載入排程項目異常:', error);
    // 不再回退到 localStorage，直接返回空陣列
    return [];
  }
}

// 儲存排程項目到資料庫
export async function saveScheduleItemsToDB(items: ScheduleItem[]): Promise<boolean> {
  // 同時儲存到 localStorage 作為備用
  saveToLocalStorage(items);

  if (!supabase) {
    console.warn('⚠️ Supabase 客戶端未初始化，僅保存到 localStorage');
    return true; // 僅使用 localStorage
  }

  console.log(`💾 開始保存 ${items.length} 筆資料到 Supabase...`);

  try {
    // 先嘗試包含所有欄位（material_ready_date 和 recipe_items）
    let dbItems = items.map(item => scheduleItemToDB(item, true, true));
    console.log('📦 準備保存的資料:', dbItems.length, '筆');
    
    let { data, error } = await supabase
      .from(TABLES.SCHEDULE_ITEMS)
      .upsert(dbItems, { onConflict: 'id' })
      .select();

    // 如果錯誤是因為 material_ready_date 或 recipe_items 欄位不存在，則重試不包含該欄位
    if (error) {
      let retryWithoutMaterialReadyDate = false;
      let retryWithoutRecipeItems = false;
      
      // 檢查錯誤訊息和錯誤代碼
      const errorMsg = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      const errorDetails = JSON.stringify(error).toLowerCase();
      
      // 檢查 material_ready_date 欄位錯誤（支援多種錯誤訊息格式）
      if (errorMsg.includes('material_ready_date') || 
          errorMsg.includes("could not find the 'material_ready_date' column") ||
          errorMsg.includes("column 'material_ready_date' does not exist") ||
          errorDetails.includes('material_ready_date')) {
        console.warn('資料庫沒有 material_ready_date 欄位，嘗試不包含該欄位保存');
        retryWithoutMaterialReadyDate = true;
      }
      
      // 檢查 recipe_items 欄位錯誤（支援多種錯誤訊息格式）
      if (errorMsg.includes('recipe_items') || 
          errorMsg.includes("could not find the 'recipe_items' column") ||
          errorMsg.includes("column 'recipe_items' does not exist") ||
          errorDetails.includes('recipe_items')) {
        console.warn('資料庫沒有 recipe_items 欄位，嘗試不包含該欄位保存');
        retryWithoutRecipeItems = true;
      }
      
      if (retryWithoutMaterialReadyDate || retryWithoutRecipeItems) {
        console.log('🔄 重試儲存（不包含不存在的欄位）...');
        console.log('排除欄位:', {
          material_ready_date: retryWithoutMaterialReadyDate,
          recipe_items: retryWithoutRecipeItems
        });
        
        dbItems = items.map(item => scheduleItemToDB(
          item, 
          !retryWithoutMaterialReadyDate,  // includeMaterialReadyDate
          !retryWithoutRecipeItems        // includeRecipeItems
        ));
        
        // 確保不包含被排除的欄位
        dbItems = dbItems.map(item => {
          const cleanItem: any = { ...item };
          if (retryWithoutMaterialReadyDate) {
            delete cleanItem.material_ready_date;
          }
          if (retryWithoutRecipeItems) {
            delete cleanItem.recipe_items;
          }
          return cleanItem;
        });
        
        console.log('📦 重試保存的資料（已排除不存在的欄位）:', dbItems.length, '筆');
        console.log('範例資料結構:', dbItems[0] ? Object.keys(dbItems[0]) : '無資料');
        
        ({ data, error } = await supabase
          .from(TABLES.SCHEDULE_ITEMS)
          .upsert(dbItems, { onConflict: 'id' })
          .select());
        
        if (!error) {
          console.log('✅ 重試儲存成功（不包含不存在的欄位）');
          const dataArray = data as any[] | null;
          console.log('📊 保存結果:', dataArray ? `${dataArray.length} 筆` : '無返回資料');
        } else {
          console.error('❌ 重試儲存仍然失敗:', error);
          console.error('錯誤代碼:', error.code);
          console.error('錯誤訊息:', error.message);
          console.error('\n⚠️ 建議：在 Supabase SQL Editor 執行 supabase_add_missing_columns.sql 腳本');
          console.error('   這會自動添加缺失的欄位：material_ready_date 和 recipe_items');
        }
      }
    }

    if (error) {
      console.error('❌ 儲存排程項目失敗:', error);
      console.error('錯誤代碼:', error.code);
      console.error('錯誤訊息:', error.message);
      console.error('錯誤詳情:', JSON.stringify(error, null, 2));
      console.error('嘗試保存的資料筆數:', items.length);
      return false;
    }

    console.log('✅ 成功保存到 Supabase 資料庫');
    const dataArray = data as any[] | null;
    console.log('📊 保存結果:', dataArray ? `${dataArray.length} 筆` : '無返回資料');
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
        // 只有成功時才更新 dbItems，避免失敗時觸發同步覆蓋本地狀態
        setItems(newItems);
      } else {
        setError('儲存失敗，請檢查網路連線');
        // 儲存失敗時，不更新 dbItems，避免觸發同步覆蓋本地狀態
        console.warn('儲存失敗，保留本地狀態');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存資料失敗');
      // 儲存失敗時，不更新 dbItems，避免觸發同步覆蓋本地狀態
      console.warn('儲存異常，保留本地狀態:', err);
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

