// 未排程區域
export const UNSCHEDULED_LANE = {
  id: "UNSCHEDULED",
  name: "未排程",
  color: "#6B7280",  // gray
} as const;

// 12 條產線定義
export const PRODUCTION_LINES = [
  { id: "TS26", name: "TS26", color: "#3B82F6" },      // blue
  { id: "27CC", name: "27CC", color: "#8B5CF6" },      // violet
  { id: "TS75", name: "TS75", color: "#EC4899" },      // pink
  { id: "HP40-1", name: "HP40-1", color: "#F97316" },    // orange
  { id: "HP40-2", name: "HP40-2", color: "#EAB308" },    // yellow
  { id: "40MAXX", name: "40MAXX", color: "#22C55E" },  // green
  { id: "TS58", name: "TS58", color: "#14B8A6" },      // teal
  { id: "50CC", name: "50CC", color: "#06B6D4" },      // cyan
  { id: "50MAXX", name: "50MAXX", color: "#6366F1" },  // indigo
  { id: "SE51", name: "SE51", color: "#A855F7" },      // purple
  { id: "SE-85", name: "SE-85", color: "#F43F5E" },      // rose
  { id: "CRYST", name: "結晶過程", color: "#78716C" }, // stone (gray-brown)
  { id: "CCD", name: "CCD色選", color: "#A3A3A3" },   // neutral gray
  { id: "DRYBLEND", name: "Dryblending", color: "#D97706" }, // amber
  { id: "PACKAGE", name: "Package", color: "#059669" },  // emerald
  { id: "HS1", name: "HS1", color: "#10B981" },  // emerald green
  { id: "HS2", name: "HS2", color: "#10B981" },  // emerald green (與 HS1 相同)
  { id: "HS3", name: "HS3", color: "#10B981" },  // emerald green (與 HS1 相同)
  { id: "HS4", name: "HS4", color: "#10B981" },  // emerald green (與 HS1 相同)
  { id: "M600", name: "M600", color: "#F59E0B" },  // amber
  { id: "HC", name: "H/C", color: "#EF4444" },  // red
  { id: "XIAOQIAOLONG", name: "小僑隆", color: "#8B5CF6" },  // violet
  { id: "GRINDING", name: "磨粉", color: "#92400E" },  // brown
  { id: "LABORATORY", name: "實驗室", color: "#0EA5E9" },  // sky blue
] as const;

// 所有泳道 (含未排程)
export const ALL_LANES = [UNSCHEDULED_LANE, ...PRODUCTION_LINES] as const;

export type ProductionLineId = typeof PRODUCTION_LINES[number]["id"];

// 計入月產能的產線 (排除結晶過程、CCD、Dryblending、Package、HS1-HS4、M600、H/C、小僑隆等)
export const CAPACITY_LINES = [
  "TS26", "27CC", "TS75", "HP40-1", "HP40-2", "40MAXX", 
  "TS58", "50CC", "50MAXX", "SE51", "SE-85"
] as const;

// 不計入產量與排程的產線（僅用於顯示和配置，不參與統計）
export const NON_CAPACITY_LINES = [
  "CRYST", "CCD", "DRYBLEND", "PACKAGE", 
  "HS1", "HS2", "HS3", "HS4", "M600", "HC", "XIAOQIAOLONG", "GRINDING", "LABORATORY"
] as const;

// 混合缸卡片允許的產線（只能排到這些產線）
export const MIX_TANK_ALLOWED_LINES = [
  "HS1", "HS2", "HS3", "HS4", "M600", "HC", "XIAOQIAOLONG"
] as const;

