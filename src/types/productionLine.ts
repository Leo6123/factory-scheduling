// 產線設定型別
export interface LineConfig {
  id: string;
  avgOutput: number; // 平均產量 (KG/小時)
}

// 預設產線設定
export const DEFAULT_LINE_CONFIGS: Record<string, LineConfig> = {
  "TS26": { id: "TS26", avgOutput: 100 },
  "27CC": { id: "27CC", avgOutput: 100 },
  "TS75": { id: "TS75", avgOutput: 100 },
  "HP40A": { id: "HP40A", avgOutput: 100 },
  "HP40B": { id: "HP40B", avgOutput: 100 },
  "MAXX40": { id: "MAXX40", avgOutput: 100 },
  "TS58": { id: "TS58", avgOutput: 100 },
  "50CC": { id: "50CC", avgOutput: 100 },
  "MAXX50": { id: "MAXX50", avgOutput: 100 },
  "SE51": { id: "SE51", avgOutput: 100 },
  "SE85": { id: "SE85", avgOutput: 100 },
  "CRYST": { id: "CRYST", avgOutput: 100 },
  "CCD": { id: "CCD", avgOutput: 100 },
  "DRYBLEND": { id: "DRYBLEND", avgOutput: 100 },
  "PACKAGE": { id: "PACKAGE", avgOutput: 100 },
};

