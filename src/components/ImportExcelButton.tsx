"use client";

import { useRef, useState } from "react";
import { parseExcelFile, ImportResult } from "@/utils/excelParser";
import { ScheduleItem } from "@/types/schedule";

interface ImportExcelButtonProps {
  onImport: (items: ScheduleItem[]) => void;
  existingBatchIds: Set<string>;
}

export default function ImportExcelButton({ onImport, existingBatchIds }: ImportExcelButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 文件大小限制：5MB (5 * 1024 * 1024 bytes)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    // 檢查文件大小
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      setError(`檔案過大 (${fileSizeMB} MB)，最大允許 ${maxSizeMB} MB`);
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      const result: ImportResult = await parseExcelFile(file, existingBatchIds);
      
      if (result.items.length === 0) {
        if (result.alreadyExistsCount > 0) {
          setError(`所有批號都已存在於畫面中 (${result.alreadyExistsCount} 筆)`);
        } else {
          setError("Excel 檔案中沒有找到有效資料");
        }
      } else {
        onImport(result.items);
        
        // 顯示匯入結果
        let message = `成功匯入 ${result.importedCount} 筆訂單`;
        if (result.bomDuplicateCount > 0) {
          message += ` (已過濾 ${result.bomDuplicateCount} 筆 BOM 重複資料)`;
        }
        if (result.alreadyExistsCount > 0) {
          message += `\n已跳過 ${result.alreadyExistsCount} 筆已存在的批號`;
        }
        message += `\n\n資料已自動儲存到資料庫`;
        alert(message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setIsLoading(false);
      // 清空 input 以便重複選擇同一檔案
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap
                   transition-all duration-200 h-8
                   ${isLoading 
                     ? "bg-gray-600 cursor-not-allowed" 
                     : "bg-emerald-600 hover:bg-emerald-500 active:scale-95"}`}
        title="匯入訂單 Excel 檔案（最大 5MB）"
      >
        {/* 上傳圖示 */}
        <svg 
          className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isLoading ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          )}
        </svg>
        
        {isLoading ? "匯入中..." : "匯入訂單 (Excel)"}
      </button>

      {/* 錯誤訊息 */}
      {error && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-500/20 
                       border border-red-500/50 rounded text-red-400 text-xs z-50
                       max-w-[200px] break-words">
          {error}
        </div>
      )}
    </div>
  );
}
