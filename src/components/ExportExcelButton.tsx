"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { ScheduleItem } from "@/types/schedule";
import { LineConfig } from "@/types/productionLine";
import { PRODUCTION_LINES } from "@/constants/productionLines";

interface ExportExcelButtonProps {
  scheduleItems: ScheduleItem[];
  lineConfigs: Record<string, LineConfig>;
  selectedYear: number;
  selectedMonth: number;
}

// 計算指定日期範圍的排程區塊
function getBlocksForExport(
  items: ScheduleItem[],
  lineConfigs: Record<string, LineConfig>,
  filterStartDate?: string,
  filterEndDate?: string,
  includeCleaningAndMaintenance: boolean = false
): ExportRow[] {
  const rows: ExportRow[] = [];

  for (const item of items) {
    // 只匯出已排程的項目
    if (!item.scheduleDate || item.startHour === undefined) continue;
    if (item.lineId === "UNSCHEDULED") continue;
    
    // 根據選項決定是否排除清機流程和故障維修
    if (!includeCleaningAndMaintenance && (item.isCleaningProcess || item.isMaintenance)) continue;

    // 日期範圍篩選
    if (filterStartDate && item.scheduleDate < filterStartDate) continue;
    if (filterEndDate && item.scheduleDate > filterEndDate) continue;

    // 使用卡片上的出量 (outputRate)，如果沒有設定則預設 50 kg/h
    const outputRate = item.outputRate || 50;
    const duration = outputRate > 0 
      ? item.quantity / outputRate 
      : 0;

    const line = PRODUCTION_LINES.find(l => l.id === item.lineId);
    const lineName = line?.name || item.lineId;

    // 計算結束時間 (可能跨日)
    const startHour = item.startHour;
    const endHour = startHour + duration;

    // 格式化日期 (格式: 2025/12/5)
    const formatDateTime = (dateStr: string, hour: number): string => {
      const date = new Date(dateStr + "T00:00:00"); // 確保使用本地時間
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 不補零
      const day = date.getDate(); // 不補零
      
      return `${year}/${month}/${day}`;
    };

    // 計算開始日期時間
    const startDateTime = formatDateTime(item.scheduleDate, startHour);

    // 如果跨日，計算實際結束日期
    let endDate = item.scheduleDate;
    let displayEndHour = endHour;
    if (endHour >= 24) {
      const daysToAdd = Math.floor(endHour / 24);
      const startDate = new Date(item.scheduleDate);
      startDate.setDate(startDate.getDate() + daysToAdd);
      endDate = startDate.toISOString().split("T")[0];
      displayEndHour = endHour % 24;
    }

    // 計算結束日期時間
    const endDateTime = formatDateTime(endDate, displayEndHour);

    // 處理 Order num: 前面加 00 (如 16068657 -> 0016068657)
    const formatOrderNum = (orderNum?: string): string => {
      if (!orderNum) return "";
      const numStr = String(orderNum).trim();
      // 如果已經是 10 位數，直接返回；否則前面補 00
      if (numStr.length >= 10) return numStr;
      return "00" + numStr;
    };

    // 格式化 Release date (格式: 2025/1/16)
    const formatReleaseDate = (dateStr?: string): string => {
      if (!dateStr) return "";
      const date = new Date(dateStr + "T00:00:00");
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}/${month}/${day}`;
    };

    rows.push({
      scheduledStatus: "Scheduled",                    // A
      poStatus: "Released",                           // B
      productionLine: lineName,                       // C
      start: startDateTime,                           // D
      end: endDateTime,                               // E
      status: "Not Start",                            // F
      poNumber: item.processOrder || "",              // G
      materialNumber: item.productName,               // H
      materialDescription: item.materialDescription || "", // I
      batchNumber: item.batchNumber,                  // J
      jobDate: "",                                    // K (空白)
      qtyReleased: item.quantity,                     // L
      custNum: item.customer || "",                  // M
      orderNum: formatOrderNum(item.salesDocument),  // N
      releaseDate: formatReleaseDate(item.releaseDate), // O
    });
  }

  // 按排程日期和開始時間排序
  rows.sort((a, b) => {
    // 從 start 欄位提取日期和時間來排序
    const aDate = a.start.split(" ")[0]; // 取得日期部分
    const bDate = b.start.split(" ")[0];
    if (aDate !== bDate) {
      return aDate.localeCompare(bDate);
    }
    return a.start.localeCompare(b.start);
  });

  return rows;
}

interface ExportRow {
  scheduledStatus: string;        // A: Scheduled status
  poStatus: string;              // B: PO status
  productionLine: string;        // C: Production line
  start: string;                 // D: Start (日期時間)
  end: string;                   // E: End (日期時間)
  status: string;                // F: Status
  poNumber: string;              // G: PO number
  materialNumber: string;        // H: Material number
  materialDescription: string;   // I: Material Description
  batchNumber: string;           // J: Batch number
  jobDate: string;               // K: Job date (空白)
  qtyReleased: number;           // L: Qty released
  custNum: string;               // M: Cust num
  orderNum: string;              // N: Order num
  releaseDate: string;           // O: Release date
}

export default function ExportExcelButton({
  scheduleItems,
  lineConfigs,
  selectedYear,
  selectedMonth,
}: ExportExcelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 預設日期範圍：當月第一天到最後一天
  const defaultStartDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const defaultEndDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  
  const [exportStartDate, setExportStartDate] = useState(defaultStartDate);
  const [exportEndDate, setExportEndDate] = useState(defaultEndDate);
  const [includeCleaningAndMaintenance, setIncludeCleaningAndMaintenance] = useState(false);

  const handleExport = () => {
    const rows = getBlocksForExport(scheduleItems, lineConfigs, exportStartDate, exportEndDate, includeCleaningAndMaintenance);

    if (rows.length === 0) {
      alert("選擇的日期範圍內沒有已排程的項目");
      return;
    }

    // 轉換為 Excel 格式 (按照用戶指定的欄位順序)
    const excelData = rows.map((row) => ({
      "Scheduled status": row.scheduledStatus,        // A
      "PO status": row.poStatus,                     // B
      "Production line": row.productionLine,          // C
      "Start": row.start,                            // D
      "End": row.end,                                // E
      "Status": row.status,                           // F
      "PO number": row.poNumber,                     // G
      "Material number": row.materialNumber,         // H
      "Material Description": row.materialDescription, // I
      "Batch number": row.batchNumber,               // J
      "Job date": row.jobDate,                       // K
      "Qty released": row.qtyReleased,              // L
      "Cust num": row.custNum,                       // M
      "Order num": row.orderNum,                     // N
      "Release date": row.releaseDate,              // O
    }));

    // 建立工作表
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 設定欄寬
    worksheet["!cols"] = [
      { wch: 15 }, // A: Scheduled status
      { wch: 18 }, // B: PO status
      { wch: 15 }, // C: Production line
      { wch: 12 }, // D: Start (只有日期)
      { wch: 12 }, // E: End (只有日期)
      { wch: 12 }, // F: Status
      { wch: 15 }, // G: PO number
      { wch: 18 }, // H: Material number
      { wch: 25 }, // I: Material Description
      { wch: 15 }, // J: Batch number
      { wch: 12 }, // K: Job date
      { wch: 12 }, // L: Qty released
      { wch: 12 }, // M: Cust num
      { wch: 15 }, // N: Order num
      { wch: 12 }, // O: Release date
    ];

    // 建立工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "排程表");

    // 檔名
    const fileName = `排程表_${exportStartDate}_${exportEndDate}.xlsx`;

    // 下載
    XLSX.writeFile(workbook, fileName);

    alert(`已匯出 ${rows.length} 筆排程資料`);
    setIsOpen(false);
  };

  // 計算已排程項目數量（根據選項決定是否包含清機流程和故障維修）
  const scheduledCount = scheduleItems.filter(
    (item) => {
      if (!item.scheduleDate || item.startHour === undefined || item.lineId === "UNSCHEDULED") return false;
      if (!includeCleaningAndMaintenance && (item.isCleaningProcess || item.isMaintenance)) return false;
      return true;
    }
  ).length;

  // 計算選擇範圍內的項目數量（根據選項決定是否包含清機流程和故障維修）
  const filteredCount = scheduleItems.filter(
    (item) => {
      if (!item.scheduleDate || item.startHour === undefined || item.lineId === "UNSCHEDULED") return false;
      if (!includeCleaningAndMaintenance && (item.isCleaningProcess || item.isMaintenance)) return false;
      if (exportStartDate && item.scheduleDate < exportStartDate) return false;
      if (exportEndDate && item.scheduleDate > exportEndDate) return false;
      return true;
    }
  ).length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={scheduledCount === 0}
        className={`w-full h-8 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap
                    transition-colors
                    ${scheduledCount > 0
                      ? "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30"
                      : "bg-gray-700/50 text-gray-500 border border-gray-600/30 cursor-not-allowed"}`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        匯出排程 ({scheduledCount})
      </button>
    );
  }

  return (
    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-green-400">📤 匯出排程</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {/* 開始日期 */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">開始日期</label>
          <input
            type="date"
            value={exportStartDate}
            onChange={(e) => setExportStartDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded
                       text-white focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* 結束日期 */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">結束日期</label>
          <input
            type="date"
            value={exportEndDate}
            onChange={(e) => setExportEndDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded
                       text-white focus:border-green-500 focus:outline-none"
          />
        </div>

        {/* 清機/故障選項 */}
        <div>
          <label className="text-xs text-gray-400 block mb-2">包含選項</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="cleaningMaintenance"
                checked={!includeCleaningAndMaintenance}
                onChange={() => setIncludeCleaningAndMaintenance(false)}
                className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 
                           focus:ring-green-500 focus:ring-2"
              />
              <span className="text-xs text-gray-300">不含清機/故障</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="cleaningMaintenance"
                checked={includeCleaningAndMaintenance}
                onChange={() => setIncludeCleaningAndMaintenance(true)}
                className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 
                           focus:ring-green-500 focus:ring-2"
              />
              <span className="text-xs text-gray-300">含清機/故障</span>
            </label>
          </div>
        </div>

        {/* 篩選結果 */}
        <div className="text-xs text-gray-400 text-center py-1">
          符合條件: <span className="text-green-400 font-medium">{filteredCount}</span> 筆
        </div>

        {/* 按鈕 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded
                       hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredCount === 0}
            className={`flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors
                       ${filteredCount > 0
                         ? "bg-green-600 text-white hover:bg-green-500"
                         : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}
          >
            匯出
          </button>
        </div>
      </div>
    </div>
  );
}

