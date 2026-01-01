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
    // 完全匹配
    if (row[name] !== undefined) return row[name];
    
    // 模糊匹配：欄位名稱開頭匹配
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().startsWith(name.toLowerCase()) || 
          name.toLowerCase().startsWith(key.toLowerCase())) {
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
        
        // 讀取第一個工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 轉換為 JSON (標題在第 1 行，直接使用預設設定)
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
        
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
