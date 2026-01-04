import { createClient } from '@supabase/supabase-js';
import { ScheduleItem } from '@/types/schedule';

// Supabase 客戶端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 環境變數未設定，將使用 localStorage 作為備用方案');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 在開發環境中，將 supabase 客戶端暴露到 window 物件，方便調試
if (typeof window !== 'undefined' && supabase) {
  (window as any).__SUPABASE_CLIENT__ = supabase;
  (window as any).__SUPABASE_URL__ = supabaseUrl;
}

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

