import * as XLSX from "xlsx";
import { SuggestedSchedule } from "@/types/suggestedSchedule";

// Excel 欄位對應
interface ExcelRow {
  [key: string]: string | number | undefined;
}

// 匯入結果
export interface SuggestedScheduleImportResult {
  schedules: SuggestedSchedule[];
  importedCount: number;
  errorCount: number;
}

/**
 * 解析 Excel 檔案中的建議排程數據
 * 預期格式：
 * - 第一列：Material Number
 * - 第二列：建議排程 (逗號分隔的產線名稱，例如 "50MAXX, MIXSPC")
 */
export async function parseSuggestedScheduleExcel(file: File): Promise<SuggestedScheduleImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("無法讀取檔案"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          reject(new Error("Excel 檔案中沒有找到工作表"));
          return;
        }

        // 轉換為 JSON 格式
        const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // 使用格式化後的值
        });

        if (rows.length === 0) {
          resolve({
            schedules: [],
            importedCount: 0,
            errorCount: 0,
          });
          return;
        }

        const schedules: SuggestedSchedule[] = [];
        let errorCount = 0;

        // 取得欄位名稱（支援多種可能的欄位名稱）
        const getFieldValue = (row: ExcelRow, ...fieldNames: string[]): string | undefined => {
          for (const fieldName of fieldNames) {
            const value = row[fieldName];
            if (value !== undefined && value !== null && value !== "") {
              return String(value).trim();
            }
          }
          return undefined;
        };

        // 解析每一行
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          try {
            // 取得 Material Number
            const materialNumber = getFieldValue(
              row,
              "Material Number",
              "MaterialNumber",
              "Material_Number",
              "物料編號",
              "產品編號",
              "Product Number",
              "ProductNumber"
            );

            if (!materialNumber) {
              errorCount++;
              console.warn(`第 ${i + 2} 行：缺少 Material Number`);
              continue;
            }

            // 取得建議排程
            const suggestedScheduleStr = getFieldValue(
              row,
              "建議排程",
              "Suggested Schedule",
              "SuggestedSchedule",
              "Suggested_Schedule",
              "建議排程",
              "排程建議"
            );

            if (!suggestedScheduleStr) {
              errorCount++;
              console.warn(`第 ${i + 2} 行：缺少建議排程`);
              continue;
            }

            // 解析建議排程（逗號分隔）
            const suggestedLines = suggestedScheduleStr
              .split(",")
              .map((line) => line.trim())
              .filter((line) => line.length > 0);

            if (suggestedLines.length === 0) {
              errorCount++;
              console.warn(`第 ${i + 2} 行：建議排程為空`);
              continue;
            }

            schedules.push({
              materialNumber: materialNumber.trim(),
              suggestedLines,
              lastUpdated: new Date().toISOString(),
            });
          } catch (err) {
            errorCount++;
            console.error(`第 ${i + 2} 行解析失敗:`, err);
          }
        }

        resolve({
          schedules,
          importedCount: schedules.length,
          errorCount,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("讀取檔案失敗"));
    };

    reader.readAsBinaryString(file);
  });
}


