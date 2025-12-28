// 產品顏色對應工具
// 根據 Material Number 的第三個字元來判斷顏色
// 規則: 0(白)1(黃)2(橘)3(紅)4(紫)5(藍)6(綠)7(灰)8(棕)9(黑)A(添加劑)

// Material Number 第三個字元對應顏色
const MATERIAL_CODE_COLORS: Record<string, { color: string; name: string }> = {
  "0": { color: "#E5E7EB", name: "白" },    // 白色
  "1": { color: "#EAB308", name: "黃" },    // 黃色
  "2": { color: "#F97316", name: "橘" },    // 橘色
  "3": { color: "#EF4444", name: "紅" },    // 紅色
  "4": { color: "#A855F7", name: "紫" },    // 紫色
  "5": { color: "#3B82F6", name: "藍" },    // 藍色
  "6": { color: "#22C55E", name: "綠" },    // 綠色
  "7": { color: "#6B7280", name: "灰" },    // 灰色
  "8": { color: "#92400E", name: "棕" },    // 棕色
  "9": { color: "#374151", name: "黑" },    // 黑色
  "A": { color: "#14B8A6", name: "添加劑" }, // 添加劑 (青色)
};

// 備用調色盤 (當無法判斷時使用)
const FALLBACK_PALETTE = [
  "#F43F5E", "#EC4899", "#D946EF", "#A855F7", "#8B5CF6",
  "#6366F1", "#3B82F6", "#0EA5E9", "#06B6D4", "#14B8A6",
  "#10B981", "#22C55E", "#84CC16", "#EAB308", "#F59E0B",
  "#F97316", "#EF4444", "#78716C", "#6B7280", "#64748B",
];

// 用於儲存已分配的備用顏色對應
const fallbackColorMap = new Map<string, string>();

// 根據字串產生 hash 值
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 從 Material Number (productName) 的第三個字元提取顏色代碼
 * 例如: "AF02425004" -> 第三個字元是 "0" -> 白色
 */
function extractColorFromMaterialNumber(materialNumber: string): string | null {
  if (!materialNumber || materialNumber.length < 3) {
    return null;
  }

  // 取得第三個字元 (index = 2)
  const colorCode = materialNumber.charAt(2).toUpperCase();
  
  if (MATERIAL_CODE_COLORS[colorCode]) {
    return MATERIAL_CODE_COLORS[colorCode].color;
  }

  return null;
}

/**
 * 取得顏色代碼的名稱
 */
export function getColorName(materialNumber: string): string | null {
  if (!materialNumber || materialNumber.length < 3) {
    return null;
  }

  const colorCode = materialNumber.charAt(2).toUpperCase();
  return MATERIAL_CODE_COLORS[colorCode]?.name || null;
}

/**
 * 根據 Material Number (productName) 取得對應顏色
 * 優先使用第三個字元判斷顏色
 */
export function getProductColor(productName: string | undefined): string {
  if (!productName || productName.trim() === "") {
    return "#6B7280"; // 預設灰色
  }

  const name = productName.trim();
  
  // 嘗試從 Material Number 第三個字元提取顏色
  const extractedColor = extractColorFromMaterialNumber(name);
  if (extractedColor) {
    return extractedColor;
  }

  // 無法提取顏色，使用備用顏色
  const key = name.toLowerCase();
  if (fallbackColorMap.has(key)) {
    return fallbackColorMap.get(key)!;
  }

  const hash = hashString(key);
  const color = FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
  fallbackColorMap.set(key, color);
  return color;
}

/**
 * 取得所有已使用的備用顏色對應表
 * 用於顯示圖例
 */
export function getColorLegend(): Array<{ description: string; color: string }> {
  return Array.from(fallbackColorMap.entries()).map(([description, color]) => ({
    description,
    color,
  }));
}

/**
 * 重置顏色對應 (例如清除所有訂單時)
 */
export function resetColorMap(): void {
  fallbackColorMap.clear();
}

