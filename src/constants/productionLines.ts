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
  { id: "HP40A", name: "HP40A", color: "#F97316" },    // orange
  { id: "HP40B", name: "HP40B", color: "#EAB308" },    // yellow
  { id: "MAXX40", name: "MAXX40", color: "#22C55E" },  // green
  { id: "TS58", name: "TS58", color: "#14B8A6" },      // teal
  { id: "50CC", name: "50CC", color: "#06B6D4" },      // cyan
  { id: "MAXX50", name: "MAXX50", color: "#6366F1" },  // indigo
  { id: "SE51", name: "SE51", color: "#A855F7" },      // purple
  { id: "SE85", name: "SE85", color: "#F43F5E" },      // rose
  { id: "CRYST", name: "結晶過程", color: "#78716C" }, // stone (gray-brown)
  { id: "CCD", name: "CCD色選", color: "#A3A3A3" },   // neutral gray
  { id: "DRYBLEND", name: "Dryblending", color: "#D97706" }, // amber
  { id: "PACKAGE", name: "Package", color: "#059669" },  // emerald
] as const;

// 所有泳道 (含未排程)
export const ALL_LANES = [UNSCHEDULED_LANE, ...PRODUCTION_LINES] as const;

export type ProductionLineId = typeof PRODUCTION_LINES[number]["id"];

// 計入月產能的產線 (排除結晶過程等)
export const CAPACITY_LINES = [
  "TS26", "27CC", "TS75", "HP40A", "HP40B", "MAXX40", 
  "TS58", "50CC", "MAXX50", "SE51", "SE85"
] as const;

