"use client";

import { useDroppable } from "@dnd-kit/core";
import { ScheduleItem } from "@/types/schedule";
import { LineConfig } from "@/types/productionLine";
import DraggableCard from "./DraggableCard";
import ImportExcelButton from "./ImportExcelButton";
import ClearButton from "./ClearButton";
import AddNGColorForm from "./AddNGColorForm";
import ExportExcelButton from "./ExportExcelButton";
import CleaningProcessForm from "./CleaningProcessForm";
import MaintenanceForm from "./MaintenanceForm";

interface UnscheduledSidebarProps {
  items: ScheduleItem[];
  allScheduleItems: ScheduleItem[];  // 所有排程項目 (用於匯出)
  lineConfigs: Record<string, LineConfig>;  // 產線設定 (用於匯出)
  selectedYear: number;
  selectedMonth: number;
  onImport: (items: ScheduleItem[]) => void;
  onClear: () => void;
  existingBatchIds: Set<string>;
  totalItemCount: number;
  onToggleCrystallization?: (itemId: string) => void;  // 切換結晶狀態
  onToggleCCD?: (itemId: string) => void;  // 切換 CCD 狀態
  onToggleDryblending?: (itemId: string) => void;  // 切換 Dryblending 狀態
  onTogglePackage?: (itemId: string) => void;  // 切換 Package 狀態
  onQuantityChange?: (itemId: string, newQuantity: number) => void;  // 更改數量
  onToggleAbnormalIncomplete?: (itemId: string) => void;  // 切換異常未完成狀態
  isDragging?: boolean;  // 是否正在拖曳
  onAddItem?: (item: ScheduleItem) => void;  // 新增單一項目
  onUndo?: () => void;  // 回到上一步
  canUndo?: boolean;    // 是否可以回上一步
  getBatchQCStatus?: (batchNumber: string) => 'QC中' | 'QC完成' | 'NG' | null;  // 取得 QC 狀態
}

export default function UnscheduledSidebar({
  items,
  allScheduleItems,
  lineConfigs,
  selectedYear,
  selectedMonth,
  onImport,
  onClear,
  existingBatchIds,
  totalItemCount,
  onToggleCrystallization,
  onToggleCCD,
  onToggleDryblending,
  onTogglePackage,
  onQuantityChange,
  onToggleAbnormalIncomplete,
  isDragging = false,
  onAddItem,
  onUndo,
  canUndo = false,
  getBatchQCStatus,
}: UnscheduledSidebarProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "UNSCHEDULED",
  });

  const { isOver: isOverTrash, setNodeRef: setTrashRef } = useDroppable({
    id: "TRASH",
  });

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-white/10 bg-white/5">
      {/* 標題 */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-300">
            📥 未排程
          </h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {items.length} 筆
          </span>
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex flex-col gap-2">
          <ImportExcelButton 
            onImport={onImport} 
            existingBatchIds={existingBatchIds}
          />
          
          {/* NG修色新增表單 */}
          {onAddItem && (
            <AddNGColorForm 
              onAdd={onAddItem} 
              existingBatchIds={existingBatchIds}
            />
          )}
          
          {/* 清機流程 */}
          {onAddItem && (
            <CleaningProcessForm onAdd={onAddItem} />
          )}
          
          {/* 故障維修 */}
          {onAddItem && (
            <MaintenanceForm onAdd={onAddItem} />
          )}
          
          {/* 回到上一步 */}
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                         transition-all duration-200
                         ${canUndo
                           ? "bg-purple-600 hover:bg-purple-500 active:scale-95"
                           : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              回到上一步
            </button>
          )}
          
          <ClearButton onClear={onClear} itemCount={totalItemCount} />
          
          {/* 匯出排程 */}
          <ExportExcelButton
            scheduleItems={allScheduleItems}
            lineConfigs={lineConfigs}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
          
          {/* 垃圾桶 - 拖曳時顯示 */}
          <div
            ref={setTrashRef}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed
                        transition-all duration-200
                        ${isDragging ? "opacity-100" : "opacity-0 h-0 py-0 overflow-hidden"}
                        ${isOverTrash 
                          ? "bg-red-600 border-red-400 scale-105" 
                          : "bg-red-500/20 border-red-500/50 hover:bg-red-500/30"}`}
          >
            <svg 
              className={`w-5 h-5 text-red-400 ${isOverTrash ? "text-white" : ""}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
            <span className={`text-sm font-medium ${isOverTrash ? "text-white" : "text-red-400"}`}>
              {isOverTrash ? "放開刪除" : "🗑️ 拖曳至此刪除"}
            </span>
          </div>
        </div>
      </div>

      {/* 卡片列表 (Droppable) */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 transition-colors duration-200
                    ${isOver ? "bg-blue-500/10" : ""}`}
      >
        {items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <DraggableCard 
                key={item.id} 
                item={item}
                onToggleCrystallization={onToggleCrystallization}
                onToggleCCD={onToggleCCD}
                onToggleDryblending={onToggleDryblending}
                onTogglePackage={onTogglePackage}
                onQuantityChange={onQuantityChange}
                onToggleAbnormalIncomplete={onToggleAbnormalIncomplete}
                qcStatus={getBatchQCStatus ? getBatchQCStatus(item.batchNumber) : null}
              />
            ))}
          </div>
        ) : (
          <div className={`h-full flex items-center justify-center text-sm italic
                          ${isOver ? "text-blue-400" : "text-gray-600"}`}>
            {isOver ? "放開以退回未排程" : "匯入 Excel 或拖曳卡片至此"}
          </div>
        )}
      </div>
    </div>
  );
}

