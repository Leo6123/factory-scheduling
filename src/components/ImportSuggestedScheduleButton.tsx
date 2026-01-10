"use client";

import { useRef, useState } from "react";
import { parseSuggestedScheduleExcel, SuggestedScheduleImportResult } from "@/utils/suggestedScheduleParser";
import { SuggestedSchedule } from "@/types/suggestedSchedule";

interface ImportSuggestedScheduleButtonProps {
  onImport: (schedules: SuggestedSchedule[]) => Promise<boolean>;
}

export default function ImportSuggestedScheduleButton({ onImport }: ImportSuggestedScheduleButtonProps) {
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

    // 設定超時保護（30 秒）
    const TIMEOUT_MS = 30000;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    // 確保在函數結束時清理狀態
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (!isCompleted) {
        isCompleted = true;
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    try {
      // 創建超時 Promise
      const createTimeout = (message: string) => {
        return new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(message));
          }, TIMEOUT_MS);
        });
      };

      // 解析 Excel 檔案（帶超時保護）
      console.log('📄 開始解析 Excel 檔案...', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
      const parsePromise = parseSuggestedScheduleExcel(file);
      const result: SuggestedScheduleImportResult = await Promise.race([
        parsePromise,
        createTimeout('解析 Excel 檔案超時（30 秒），檔案可能過大或格式錯誤'),
      ]);

      // 清除第一個超時
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      console.log('✅ Excel 解析完成，找到', result.schedules.length, '筆資料');
      
      if (result.schedules.length === 0) {
        setError("Excel 檔案中沒有找到有效資料");
        cleanup();
        return;
      }

      // 匯入資料（帶超時保護）
      console.log('💾 開始匯入', result.schedules.length, '筆資料到資料庫...');
      const importPromise = onImport(result.schedules);
      const success = await Promise.race([
        importPromise,
        createTimeout('匯入資料超時（30 秒），請檢查網路連線或 Supabase 狀態'),
      ]);

      // 清除超時
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      isCompleted = true;

      if (success) {
        // 顯示匯入結果
        let message = `✅ 成功匯入 ${result.importedCount} 筆建議排程`;
        if (result.errorCount > 0) {
          message += `\n⚠️ 有 ${result.errorCount} 筆資料解析失敗`;
        }
        message += `\n\n資料已自動儲存`;
        alert(message);
        console.log('✅ 匯入完成，共', result.importedCount, '筆');
      } else {
        setError("匯入失敗，請檢查控制台錯誤訊息");
        console.error('❌ 匯入失敗，onImport 返回 false');
      }
    } catch (err) {
      isCompleted = true;
      console.error('❌ 匯入錯誤:', err);
      
      const errorMessage = err instanceof Error ? err.message : "匯入失敗";
      setError(errorMessage);
      
      // 顯示錯誤訊息給用戶
      if (errorMessage.includes('超時')) {
        alert(`⏱️ ${errorMessage}\n\n請嘗試：\n1. 檢查網路連線\n2. 確認 Supabase 狀態\n3. 嘗試使用較小的檔案\n4. 重新整理頁面後再試`);
      } else {
        alert(`❌ 匯入失敗：${errorMessage}\n\n請檢查：\n1. Excel 檔案格式是否正確\n2. 網路連線是否正常\n3. 檔案大小是否過大（最大 5MB）\n\n詳細錯誤請查看瀏覽器控制台 (F12)`);
      }
    } finally {
      // 確保 loading 狀態被重置（即使發生異常）
      cleanup();
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
        className={`w-full h-8 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-medium text-xs whitespace-nowrap
                   transition-all duration-200
                   ${isLoading 
                     ? "bg-gray-600 cursor-not-allowed" 
                     : "bg-blue-600 hover:bg-blue-500 active:scale-95"}`}
        title="匯入建議排程 Excel 檔案（最大 5MB，一個月更新一次）"
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
        
        {isLoading ? "匯入中..." : "匯入建議排程"}
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

