"use client";

import { useState, useRef, useEffect } from "react";
import { ScheduleItem } from "@/types/schedule";
import { PRODUCTION_LINES, UNSCHEDULED_LANE } from "@/constants/productionLines";

interface BatchSearchProps {
  scheduleItems: ScheduleItem[];
}

interface SearchResult {
  item: ScheduleItem;
  lineName: string;
  lineColor: string;
}

export default function BatchSearch({ scheduleItems }: BatchSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 開啟時自動 focus
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 查詢批號
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const queryLower = searchQuery.toLowerCase().trim();
    
    // 搜尋符合的項目
    const matchedItems = scheduleItems.filter(
      (item) => item.batchNumber.toLowerCase().includes(queryLower)
    );

    // 加入產線資訊
    const resultsWithLine: SearchResult[] = matchedItems.map((item) => {
      const line = PRODUCTION_LINES.find((l) => l.id === item.lineId);
      const isUnscheduled = item.lineId === UNSCHEDULED_LANE.id;
      
      return {
        item,
        lineName: isUnscheduled ? "未排程" : (line?.name || "未知"),
        lineColor: isUnscheduled ? UNSCHEDULED_LANE.color : (line?.color || "#6B7280"),
      };
    });

    setResults(resultsWithLine);
  };

  // 關閉並清除
  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  // 格式化排程資訊
  const formatScheduleInfo = (item: ScheduleItem): string => {
    if (!item.scheduleDate) {
      return "尚未排程";
    }
    const timeInfo = item.startHour !== undefined ? ` ${item.startHour}h` : "";
    return `${item.scheduleDate}${timeInfo}`;
  };

  return (
    <>
      {/* 查詢按鈕 */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                   bg-white/10 text-gray-300 hover:bg-white/20 transition-all"
        title="批號查詢 (Ctrl+F)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        批號查詢
      </button>

      {/* 查詢對話框 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />

          {/* 查詢框 */}
          <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-white/20 rounded-xl shadow-2xl">
            {/* 搜尋輸入 */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="輸入批號查詢..."
                className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
              />
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 搜尋結果 */}
            <div className="max-h-80 overflow-y-auto">
              {query && results.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  找不到符合「{query}」的批號
                </div>
              ) : results.length > 0 ? (
                <div className="p-2">
                  {results.map((result) => (
                    <div
                      key={result.item.id}
                      className="p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {/* 批號 & 產線 */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">
                          {result.item.batchNumber}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${result.lineColor}30`,
                            color: result.lineColor,
                          }}
                        >
                          {result.lineName}
                        </span>
                      </div>

                      {/* 排程資訊 */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">產品:</span>{" "}
                          <span className="text-gray-300">{result.item.productName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">數量:</span>{" "}
                          <span className="text-emerald-400 font-medium">
                            {result.item.quantity.toLocaleString()} KG
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">排程:</span>{" "}
                          <span className={result.item.scheduleDate ? "text-blue-400" : "text-yellow-400"}>
                            {formatScheduleInfo(result.item)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">需求:</span>{" "}
                          <span className="text-gray-400">{result.item.deliveryDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  輸入批號開始查詢
                </div>
              )}
            </div>

            {/* 結果統計 */}
            {results.length > 0 && (
              <div className="p-3 border-t border-white/10 text-xs text-gray-500 text-center">
                找到 {results.length} 筆結果
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

