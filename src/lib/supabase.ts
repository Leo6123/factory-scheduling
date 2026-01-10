import { createClient } from '@supabase/supabase-js';
import { ScheduleItem } from '@/types/schedule';

// Supabase 客戶端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 環境變數未設定，將使用 localStorage 作為備用方案');
}

// 自定義存儲：結合 sessionStorage（關閉瀏覽器後清除）和 BroadcastChannel（跨分頁同步）
// 注意：使用 sessionStorage 後，關閉瀏覽器會自動清除 session，但通過 BroadcastChannel 可以進行跨分頁同步
const createCustomStorage = () => {
  if (typeof window === 'undefined') {
    // 服務端渲染時返回空對象
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  const TAB_ID = `tab_${Date.now()}_${Math.random()}`;
  const BROADCAST_CHANNEL_NAME = 'supabase-session-sync';
  
  // 使用 BroadcastChannel 進行跨分頁同步
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('⚠️ BroadcastChannel 不可用，將使用 sessionStorage（不支援跨分頁同步）:', e);
  }

  // 監聽其他分頁的消息（同步 session）
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'SESSION_UPDATE' && event.data.tabId !== TAB_ID) {
        // 如果有其他分頁更新了 session，同步到當前分頁
        const { key, value } = event.data;
        if (value !== null && value !== undefined) {
          sessionStorage.setItem(key, value);
        } else {
          sessionStorage.removeItem(key);
        }
      }
    };

    // 當分頁關閉時，通知其他分頁（可選，用於清理）
    const handleBeforeUnload = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'TAB_CLOSING', tabId: TAB_ID });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
  }

  return {
    getItem: (key: string): string | null => {
      // 從 sessionStorage 讀取（關閉瀏覽器後會自動清除）
      // 支援所有 Supabase 使用的 key（例如 auth token, refresh token 等）
      return sessionStorage.getItem(key);
    },
    setItem: (key: string, value: string): void => {
      // 保存到 sessionStorage（關閉瀏覽器後會自動清除）
      sessionStorage.setItem(key, value);
      
      // 通知其他分頁 session 已更新（跨分頁同步）
      if (broadcastChannel) {
        broadcastChannel.postMessage({ 
          type: 'SESSION_UPDATE', 
          key, 
          value, 
          tabId: TAB_ID 
        });
      }
    },
    removeItem: (key: string): void => {
      // 從 sessionStorage 移除
      sessionStorage.removeItem(key);
      
      // 通知其他分頁 session 已清除（跨分頁同步）
      if (broadcastChannel) {
        broadcastChannel.postMessage({ 
          type: 'SESSION_UPDATE', 
          key, 
          value: null, 
          tabId: TAB_ID 
        });
      }
    },
  };
};

// 創建 Supabase 客戶端（支援身份驗證，使用自定義存儲）
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: createCustomStorage(), // 使用自定義存儲（sessionStorage + BroadcastChannel）
      }
    })
  : null;

// 移除開發環境調試代碼（資安考量）
// 如需調試，請使用瀏覽器開發工具直接訪問 Supabase 客戶端

// 資料庫表格名稱
export const TABLES = {
  SCHEDULE_ITEMS: 'schedule_items',
  LINE_CONFIGS: 'line_configs',
  SUGGESTED_SCHEDULES: 'suggested_schedules',
} as const;

// 將 ScheduleItem 轉換為資料庫格式
export function scheduleItemToDB(item: ScheduleItem, includeMaterialReadyDate: boolean = true, includeRecipeItems: boolean = true) {
  // 不包含 updated_at，讓資料庫觸發器自動處理
  const dbItem: any = {
    id: item.id,
    product_name: item.productName,
    material_description: item.materialDescription || null,
    batch_number: item.batchNumber,
    quantity: item.quantity,
    delivery_date: item.deliveryDate,
    line_id: item.lineId,
    schedule_date: item.scheduleDate || null,
    start_hour: item.startHour ?? null,
    needs_crystallization: item.needsCrystallization || false,
    needs_ccd: item.needsCCD || false,
    needs_dryblending: item.needsDryblending || false,
    needs_package: item.needsPackage || false,
    is_cleaning_process: item.isCleaningProcess || false,
    cleaning_type: item.cleaningType || null,
    is_abnormal_incomplete: item.isAbnormalIncomplete || false,
    is_maintenance: item.isMaintenance || false,
    maintenance_hours: item.maintenanceHours ?? null,
    process_order: item.processOrder || null,
    customer: item.customer || null,
    sales_document: item.salesDocument || null,
    remark: item.remark || null,
    // updated_at 由資料庫觸發器自動處理，不需要手動設定
  };
  
  // 只有在有值且允許時才包含 material_ready_date（避免資料庫欄位不存在時出錯）
  if (includeMaterialReadyDate && item.materialReadyDate) {
    dbItem.material_ready_date = item.materialReadyDate;
  }
  
  // 配方資料（JSONB 格式，只有在有值且允許時才包含，避免資料庫欄位不存在時出錯）
  if (includeRecipeItems && item.recipeItems && item.recipeItems.length > 0) {
    dbItem.recipe_items = item.recipeItems;
  }
  
  return dbItem;
}

// 將資料庫格式轉換為 ScheduleItem
export function dbToScheduleItem(row: any): ScheduleItem {
  return {
    id: row.id,
    productName: row.product_name,
    materialDescription: row.material_description || undefined,
    batchNumber: row.batch_number,
    quantity: row.quantity,
    deliveryDate: row.delivery_date,
    materialReadyDate: row.material_ready_date || undefined,
    lineId: row.line_id,
    scheduleDate: row.schedule_date || undefined,
    startHour: row.start_hour ?? undefined,
    needsCrystallization: row.needs_crystallization || false,
    needsCCD: row.needs_ccd || false,
    needsDryblending: row.needs_dryblending || false,
    needsPackage: row.needs_package || false,
    isCleaningProcess: row.is_cleaning_process || false,
    cleaningType: row.cleaning_type || undefined,
    isAbnormalIncomplete: row.is_abnormal_incomplete || false,
    isMaintenance: row.is_maintenance || false,
    maintenanceHours: row.maintenance_hours ?? undefined,
    processOrder: row.process_order || undefined,
    customer: row.customer || undefined,
    salesDocument: row.sales_document || undefined,
    remark: row.remark || undefined,
    recipeItems: row.recipe_items 
      ? (Array.isArray(row.recipe_items) 
          ? row.recipe_items 
          : (typeof row.recipe_items === 'string' 
            ? (() => {
                try {
                  return JSON.parse(row.recipe_items);
                } catch {
                  return undefined;
                }
              })()
            : undefined))
      : undefined,
  };
}

