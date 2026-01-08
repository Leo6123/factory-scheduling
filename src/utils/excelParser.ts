import * as XLSX from "xlsx";
import { ScheduleItem } from "@/types/schedule";
import { RecipeItem } from "@/types/recipe";

// Excel 欄位對應 (根據實際檔案格式，支援多種欄位名稱)
interface ExcelRow {
  [key: string]: string | number | Date | undefined;
}

// 匯入結果
export interface ImportResult {
  items: ScheduleItem[];
  importedCount: number;
  bomDuplicateCount: number;
  alreadyExistsCount: number;
}

// 格式化日期為 YYYY-MM-DD (使用本地時間，避免時區問題)
function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 將 Excel 日期序號轉換為 YYYY-MM-DD 格式
function excelDateToString(excelDate: number | string | Date | undefined): string {
  if (!excelDate) return "";
  
  // 如果已經是字串格式
  if (typeof excelDate === "string") {
    // 嘗試解析各種日期格式
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return formatDateLocal(date);
    }
    return excelDate;
  }
  
  // 如果是 Date 物件
  if (excelDate instanceof Date) {
    return formatDateLocal(excelDate);
  }
  
  // 如果是 Excel 日期序號 (數字，如 45283)
  if (typeof excelDate === "number") {
    // Excel 日期序號轉換 (起始於 1900-01-01, 但有 bug 認為 1900 是閏年)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    return formatDateLocal(date);
  }
  
  return "";
}

// 解析數量
function parseQuantity(value: number | string | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value.toString().replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
}

// 取得欄位值 (支援多種欄位名稱，模糊匹配)
function getFieldValue(row: ExcelRow, ...fieldNames: string[]): string | number | Date | undefined {
  for (const name of fieldNames) {
    const nameLower = name.toLowerCase().trim();
    
    // 完全匹配（考慮大小寫和空格）
    if (row[name] !== undefined) return row[name];
    
    // 模糊匹配：欄位名稱開頭匹配（考慮大小寫和空格）
    for (const key of Object.keys(row)) {
      const keyLower = key.toLowerCase().trim();
      // 完全匹配（忽略大小寫和空格）
      if (keyLower === nameLower) {
        if (row[key] !== undefined) return row[key];
      }
      // 開頭匹配
      if (keyLower.startsWith(nameLower) || nameLower.startsWith(keyLower)) {
        if (row[key] !== undefined) return row[key];
      }
    }
  }
  return undefined;
}

// 解析 Excel 檔案並轉換為 ScheduleItem 陣列
// existingBatchIds: 畫面上已存在的批號集合，用於防呆
export async function parseExcelFile(
  file: File,
  existingBatchIds: Set<string> = new Set()
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        
        // 調試：顯示所有工作表名稱
        console.log('[Excel Parser] Excel 工作表名稱:', workbook.SheetNames);
        if (workbook.SheetNames.length > 1) {
          console.warn('[Excel Parser] ⚠️ Excel 有多個工作表，目前只讀取第一個工作表:', workbook.SheetNames[0]);
        }
        
        // 讀取第一個工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 轉換為 JSON (標題在第 1 行，直接使用預設設定)
        // 使用 defval: "" 確保空欄位也會被讀取
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
          defval: "", // 空值預設為空字串，確保所有欄位都被讀取
          raw: false, // 不保留原始值，統一轉換為字串
        });
        
        // 調試：檢查第一行資料，確認所有欄位
        if (jsonData.length > 0) {
          console.log('[Excel Parser] 第一行資料的欄位數量:', Object.keys(jsonData[0]).length);
          console.log('[Excel Parser] 第一行資料的所有欄位:', Object.keys(jsonData[0]));
        }
        
        // 第一步：收集所有配方資料（按 Material Number 分組）
        const recipeMap = new Map<string, RecipeItem[]>();
        
        for (let index = 0; index < jsonData.length; index++) {
          const row = jsonData[index];
          
          // 取得 Material Number（用於配方對應）
          const materialNumberValue = getFieldValue(row, 
            "Material Number", "Material N", "Material number"
          );
          
          if (materialNumberValue) {
            const materialNumber = String(materialNumberValue).trim();
            
            // 檢查是否有配方資料欄位
            const materialListValue = getFieldValue(row, 
              "Material List", "Material L", "Item No.Stock Transfer Reserv."
            );
            const materialListDescValue = getFieldValue(row, 
              "Mat. List Desc", "Mat. List D", "Material List Desc"
            );
            const requirementQuantityValue = getFieldValue(row, 
              "Requirement Quantity", "Requirem ent Quantity", "Requirement Qty"
            );
            const baseUnitValue = getFieldValue(row, 
              "Base Unit of Measure", "Base Unit", "Base Unit of Meas"
            );
            
            // 如果有配方資料，加入配方 Map
            if (materialListValue || materialListDescValue || requirementQuantityValue || baseUnitValue) {
              if (!recipeMap.has(materialNumber)) {
                recipeMap.set(materialNumber, []);
              }
              
              const recipeItem: RecipeItem = {
                materialList: materialListValue ? String(materialListValue).trim() : "",
                materialListDesc: materialListDescValue ? String(materialListDescValue).trim() : "",
                requirementQuantity: parseQuantity(requirementQuantityValue as number | string | undefined),
                baseUnit: baseUnitValue ? String(baseUnitValue).trim() : "",
              };
              
              recipeMap.get(materialNumber)!.push(recipeItem);
            }
          }
        }
        
        // 第二步：處理排程項目（BOM 表去重）
        const processedBatches = new Set<string>();
        const items: ScheduleItem[] = [];
        let bomDuplicateCount = 0;
        let alreadyExistsCount = 0;
        
        for (let index = 0; index < jsonData.length; index++) {
          const row = jsonData[index];
          
          // 取得批號 (支援 Batch, Process Order 等欄位)
          const batchValue = getFieldValue(row, "Batch", "Process Order");
          const batchNumber = batchValue ? String(batchValue).trim() : "";
          
          // 跳過沒有批號的行
          if (!batchNumber) continue;
          
          // 防呆：如果畫面上已經有該批號，完全跳過
          if (existingBatchIds.has(batchNumber)) {
            alreadyExistsCount++;
            continue;
          }
          
          // BOM 去重：同一個 Batch 只讀取第一次出現的行
          if (processedBatches.has(batchNumber)) {
            bomDuplicateCount++;
            continue;
          }
          
          // 標記此 Batch 已處理
          processedBatches.add(batchNumber);
          
          // 產品名：優先 Material Number
          const productNameValue = getFieldValue(row, 
            "Material Number", "Material N", "Material number"
          );
          const productName = productNameValue || 
            getFieldValue(row, "Material Description", "Material I") || 
            `Unknown-${index + 1}`;
          
          // 產品描述：用於顏色分類
          const materialDescValue = getFieldValue(row, "Material Description", "Material I");
          const materialDescription = materialDescValue 
            ? String(materialDescValue).trim() 
            : undefined;
          
          // 數量：讀取 Target quantity (成品總數)
          const quantityValue = getFieldValue(row, "Target quantity", "Target qty");
          const quantity = parseQuantity(quantityValue as number | string | undefined);
          
          // 需求日期：優先 Goods Issue Date，若無則 Scheduled start
          const goodsIssueDate = getFieldValue(row, "Goods Issue Date", "Goods Issue D");
          const scheduledStart = getFieldValue(row, "Scheduled start", "Scheduled star");
          const dateValue = goodsIssueDate || scheduledStart;
          const deliveryDate = excelDateToString(dateValue as number | string | Date | undefined);
          
          // 齊料時間：讀取"齊料時間"或"齊料日期"欄位
          const materialReadyValue = getFieldValue(row, "齊料時間", "齊料日期", "Material Ready Date", "Material Ready");
          const materialReadyDate = materialReadyValue 
            ? excelDateToString(materialReadyValue as number | string | Date | undefined)
            : undefined;
          
          // 讀取額外欄位
          const processOrderValue = getFieldValue(row, "Process Order", "Process O");
          const processOrder = processOrderValue ? String(processOrderValue).trim() : undefined;
          
          const customerValue = getFieldValue(row, "Customer", "Cust");
          const customer = customerValue ? String(customerValue).trim() : undefined;
          
          const salesDocValue = getFieldValue(row, "Sales document", "Sales doc", "Sales d");
          const salesDocument = salesDocValue ? String(salesDocValue).trim() : undefined;
          
          // 讀取 Remark 欄位
          // 調試：先檢查 Excel 中所有欄位名稱（只輸出一次）
          if (index === 0) {
            const allKeys = Object.keys(row);
            console.log('[Excel Parser] Excel 欄位名稱 (共 ' + allKeys.length + ' 個):');
            allKeys.forEach((key, idx) => {
              console.log(`  [${idx + 1}] "${key}"`);
            });
            // 特別檢查是否有包含 "remark" 或 "備註" 的欄位
            const remarkLikeKeys = allKeys.filter(key => 
              key.toLowerCase().includes('remark') || 
              key.toLowerCase().includes('備註') ||
              key.toLowerCase().includes('remark')
            );
            if (remarkLikeKeys.length > 0) {
              console.log('[Excel Parser] 找到可能的 Remark 相關欄位:', remarkLikeKeys);
            } else {
              console.warn('[Excel Parser] ⚠️ 未找到任何包含 "remark" 或 "備註" 的欄位');
            }
          }
          
          const remarkValue = getFieldValue(row, "Remark", "Remarks", "備註", "備註欄");
          let remark: string | undefined = undefined;
          
          // 調試：記錄原始值（前3筆）
          if (index < 3) {
            console.log(`[Excel Parser] Remark 原始值 (批號: ${batchNumber}):`, remarkValue, '類型:', typeof remarkValue);
          }
          
          if (remarkValue !== undefined && remarkValue !== null) {
            const remarkStr = String(remarkValue).trim();
            // 保留所有值，包括 "#N/A" 和空字串（讓用戶知道欄位有被讀取）
            // 即使值是 "#N/A" 或空字串，也應該設置 remark，這樣卡片上可以顯示
            remark = remarkStr || "#N/A"; // 如果是空字串，設置為 "#N/A"
            
            // 調試：記錄解析到的 Remark（前3筆）
            if (index < 3) {
              console.log(`[Excel Parser] ✅ 解析到 Remark: "${remark}" (批號: ${batchNumber})`);
            }
          } else {
            // 調試：記錄未找到 Remark 欄位（只記錄第一筆）
            if (index === 0) {
              console.warn(`[Excel Parser] ⚠️ 未找到 Remark 欄位，嘗試的欄位名稱: "Remark", "Remarks", "備註", "備註欄"`);
            }
          }
          
          // 取得對應的配方資料
          const productNameStr = String(productName).trim();
          const recipeItems = recipeMap.get(productNameStr) || undefined;
          
          items.push({
            id: `import-${Date.now()}-${index}`,
            productName: productNameStr,
            materialDescription,
            batchNumber,
            quantity,
            deliveryDate: deliveryDate || new Date().toISOString().split("T")[0],
            materialReadyDate,
            lineId: "UNSCHEDULED", // 預設放入未排程區
            processOrder,
            customer,
            salesDocument,
            recipeItems, // 加入配方資料
            remark, // 加入 Remark
          });
        }
        
        resolve({
          items,
          importedCount: items.length,
          bomDuplicateCount,
          alreadyExistsCount,
        });
      } catch (error) {
        reject(new Error("無法解析 Excel 檔案，請確認格式正確"));
      }
    };
    
    reader.onerror = () => {
      reject(new Error("讀取檔案失敗"));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
