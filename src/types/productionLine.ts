// 產線設定型別
export interface LineConfig {
  id: string;
  avgOutput: number; // 平均產量 (KG/小時)
  monthlyCapacity?: number; // 月產能 (KG)，如果設定則優先使用此值
}

// 預設產線設定
export const DEFAULT_LINE_CONFIGS: Record<string, LineConfig> = {
  "TS26": { id: "TS26", avgOutput: 100, monthlyCapacity: 5280 },
  "27CC": { id: "27CC", avgOutput: 100, monthlyCapacity: 5280 },
  "TS75": { id: "TS75", avgOutput: 100, monthlyCapacity: 396000 },
  "HP40-1": { id: "HP40-1", avgOutput: 100, monthlyCapacity: 79200 },
  "HP40-2": { id: "HP40-2", avgOutput: 100, monthlyCapacity: 79200 },
  "40MAXX": { id: "40MAXX", avgOutput: 100, monthlyCapacity: 79200 },
  "TS58": { id: "TS58", avgOutput: 100, monthlyCapacity: 63360 },
  "50CC": { id: "50CC", avgOutput: 100, monthlyCapacity: 63360 },
  "50MAXX": { id: "50MAXX", avgOutput: 100, monthlyCapacity: 63360 },
  "SE51": { id: "SE51", avgOutput: 100, monthlyCapacity: 79200 },
  "SE-85": { id: "SE-85", avgOutput: 100, monthlyCapacity: 116160 },
  "CRYST": { id: "CRYST", avgOutput: 100 },
  "CCD": { id: "CCD", avgOutput: 100 },
  "DRYBLEND": { id: "DRYBLEND", avgOutput: 100 },
  "PACKAGE": { id: "PACKAGE", avgOutput: 100 },
  "HS1": { id: "HS1", avgOutput: 100 },
  "HS2": { id: "HS2", avgOutput: 100 },
  "HS3": { id: "HS3", avgOutput: 100 },
  "HS4": { id: "HS4", avgOutput: 100 },
  "M600": { id: "M600", avgOutput: 100 },
  "HC": { id: "HC", avgOutput: 100 },
  "XIAOQIAOLONG": { id: "XIAOQIAOLONG", avgOutput: 100 },
  "GRINDING": { id: "GRINDING", avgOutput: 100 },
  "LABORATORY": { id: "LABORATORY", avgOutput: 100 },
  "RND": { id: "RND", avgOutput: 100 },
};

