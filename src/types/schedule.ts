// 清機流程類型
export type CleaningProcessType = 'A' | 'B' | 'C' | 'D' | 'E';

// 清機流程時長對應 (分鐘)
export const CLEANING_PROCESS_DURATION: Record<CleaningProcessType, number> = {
  A: 30,
  B: 60,
  C: 90,
  D: 120,
  E: 480,
};

// 排程卡片資料型別
export interface ScheduleItem {
  id: string;
  productName: string;           // 產品名稱 (Material number)
  materialDescription?: string;  // 產品描述 (Material Description) - 用於顏色分類
  batchNumber: string;           // 批號 (Batch)
  quantity: number;              // 生產數量 (KG)
  deliveryDate: string;          // 需求日期 (Delivery Date)
  materialReadyDate?: string;    // 齊料時間 (YYYY-MM-DD)
  lineId: string;                // 所屬產線 ID
  scheduleDate?: string;         // 排程日期 (YYYY-MM-DD) - 開始日期
  startHour?: number;            // 排程開始時間 (小時，0-24)，undefined 表示未設定
  needsCrystallization?: boolean; // 是否需要結晶
  needsCCD?: boolean;            // 是否需要 CCD 色選
  needsDryblending?: boolean;    // 是否需要 Dryblending
  needsPackage?: boolean;        // 是否需要 Package
  is2Press?: boolean;            // 是否為2押（時長*2）
  is3Press?: boolean;            // 是否為3押（時長*3）
  isCleaningProcess?: boolean;   // 是否為清機流程
  cleaningType?: CleaningProcessType; // 清機流程類型
  isAbnormalIncomplete?: boolean; // 異常未完成
  isMaintenance?: boolean;       // 是否為故障維修
  maintenanceHours?: number;     // 維修時長 (小時)
  // 匯入 Excel 的額外欄位
  processOrder?: string;        // Process Order 號碼
  customer?: string;             // Customer 文字
  salesDocument?: string;        // Sales document 數字
  recipeItems?: import('./recipe').RecipeItem[];  // 配方項目列表
  remark?: string;              // Remark 備註
}

// 跨日區塊顯示用 (非儲存用)
export interface ScheduleBlockDisplay {
  item: ScheduleItem;
  displayStartHour: number;  // 當天顯示的開始時間 (0-24)
  displayDuration: number;   // 當天顯示的時長
  totalDuration: number;     // 總時長
  isCarryOver: boolean;      // 是否為從前一天延續的區塊
  isContinued: boolean;      // 是否延續到下一天
  dayOffset: number;         // 相對於原始開始日期的天數偏移 (0 = 原始日, 1 = 第二天...)
}
