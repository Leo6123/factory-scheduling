// 建議排程數據類型
export interface SuggestedSchedule {
  materialNumber: string;  // Material Number (對應 ScheduleItem.productName)
  suggestedLines: string[]; // 建議排程產線序列，例如 ["50MAXX", "MIXSPC"]
  lastUpdated?: string;    // 最後更新時間（可選）
}

// 建議排程數據映射表 (Material Number -> SuggestedSchedule)
export type SuggestedScheduleMap = Record<string, SuggestedSchedule>;


