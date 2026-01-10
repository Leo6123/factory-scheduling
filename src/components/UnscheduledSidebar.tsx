"use client";

import { useDroppable } from "@dnd-kit/core";
import { ScheduleItem } from "@/types/schedule";
import { LineConfig } from "@/types/productionLine";
import DraggableCard from "./DraggableCard";
import ImportExcelButton from "./ImportExcelButton";
import ClearButton from "./ClearButton";
import AddNGColorForm from "./AddNGColorForm";
import AddCardForm from "./AddCardForm";
import ExportExcelButton from "./ExportExcelButton";
import SaveSnapshotButton from "./SaveSnapshotButton";
import CleaningProcessForm from "./CleaningProcessForm";
import MaintenanceForm from "./MaintenanceForm";
import MixTankForm from "./MixTankForm";
import ImportSuggestedScheduleButton from "./ImportSuggestedScheduleButton";
// import RefreshDataButton from "./RefreshDataButton"; // 已移除：Realtime 同步已自動處理資料更新
import { useAuth } from "@/contexts/AuthContext";

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
  onToggle2Press?: (itemId: string) => void;  // 切換 2押 狀態
  onToggle3Press?: (itemId: string) => void;  // 切換 3押 狀態
  onQuantityChange?: (itemId: string, newQuantity: number) => void;  // 更改數量
  onMaterialReadyDateChange?: (itemId: string, newDate: string) => void;  // 更改齊料時間
  onToggleAbnormalIncomplete?: (itemId: string) => void;  // 切換異常未完成狀態
  isDragging?: boolean;  // 是否正在拖曳
  onAddItem?: (item: ScheduleItem) => void;  // 新增單一項目
  onUndo?: () => void;  // 回到上一步
  canUndo?: boolean;    // 是否可以回上一步
  getBatchQCStatus?: (batchNumber: string) => 'QC中' | 'QC完成' | 'NG' | null;  // 取得 QC 狀態
  scheduledItemOrder?: string[];  // 已排程卡片的順序 (productName 陣列)
  onLoadSnapshot?: (items: ScheduleItem[], configs: Record<string, LineConfig>) => void;  // 載入存檔
  getSuggestedSchedule?: (materialNumber: string) => string[] | null;  // 取得建議排程
  onImportSuggestedSchedule?: (schedules: any[]) => Promise<boolean>;  // 匯入建議排程
  onRefreshData?: () => Promise<void>;  // 重新載入資料（清除緩存）
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
  onToggle2Press,
  onToggle3Press,
  onQuantityChange,
  onMaterialReadyDateChange,
  onToggleAbnormalIncomplete,
  isDragging = false,
  onAddItem,
  onUndo,
  canUndo = false,
  getBatchQCStatus,
  scheduledItemOrder = [],
  onLoadSnapshot,
  getSuggestedSchedule,
  onImportSuggestedSchedule,
  onRefreshData,
}: UnscheduledSidebarProps) {
  const { permissions, hasPermission } = useAuth();
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
        
        {/* 操作按鈕 - 兩列佈局，統一大小 */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* 匯入訂單 - 需要 canImport 權限 */}
          {hasPermission('canImport') && (
            <div className="w-full">
              <ImportExcelButton 
                onImport={onImport} 
                existingBatchIds={existingBatchIds}
              />
            </div>
          )}
          
          {/* 混合缸新增表單 - 需要 canEdit 權限 */}
          {onAddItem && hasPermission('canEdit') && (
            <div className="w-full">
              <MixTankForm 
                onAdd={onAddItem} 
                existingBatchIds={existingBatchIds}
                allScheduleItems={allScheduleItems}
              />
            </div>
          )}
          
          {/* 新增卡片表單 - 需要 canEdit 權限 */}
          {onAddItem && hasPermission('canEdit') && (
            <div className="w-full">
              <AddCardForm 
                onAdd={onAddItem}
              />
            </div>
          )}
          
          {/* NG修色新增表單 - 需要 canEdit 權限 */}
          {onAddItem && hasPermission('canEdit') && (
            <div className="w-full">
              <AddNGColorForm 
                onAdd={onAddItem} 
                existingBatchIds={existingBatchIds}
              />
            </div>
          )}
          
          {/* 清機流程 - 需要 canEdit 權限 */}
          {onAddItem && hasPermission('canEdit') && (
            <div className="w-full">
              <CleaningProcessForm onAdd={onAddItem} />
            </div>
          )}
          
          {/* 故障維修 - 需要 canEdit 權限 */}
          {onAddItem && hasPermission('canEdit') && (
            <div className="w-full">
              <MaintenanceForm onAdd={onAddItem} />
            </div>
          )}
          
          {/* 回到上一步 */}
          {onUndo && (
            <div className="w-full">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg font-medium text-xs
                           transition-all duration-200 whitespace-nowrap h-8
                           ${canUndo
                             ? "bg-purple-600 hover:bg-purple-500 active:scale-95"
                             : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                回到上一步
              </button>
            </div>
          )}
          
          {/* 清除全部 - 需要 canClear 權限（已禁用但保留代碼） */}
          {hasPermission('canClear') && (
            <div className="w-full">
              <ClearButton onClear={onClear} itemCount={totalItemCount} />
            </div>
          )}
          
          {/* 匯出排程 - 需要 canExport 權限 */}
          {hasPermission('canExport') && (
            <div className="w-full">
              <ExportExcelButton
                scheduleItems={allScheduleItems}
                lineConfigs={lineConfigs}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            </div>
          )}
          
          {/* 存檔功能 - 需要 canEdit 權限 */}
          {hasPermission('canEdit') && (
            <div className="w-full">
              <SaveSnapshotButton
                scheduleItems={allScheduleItems}
                lineConfigs={lineConfigs}
                onLoadSnapshot={onLoadSnapshot}
              />
            </div>
          )}
          
          {/* 匯入建議排程 - 需要 canImport 權限 */}
          {onImportSuggestedSchedule && hasPermission('canImport') && (
            <div className="w-full">
              <ImportSuggestedScheduleButton onImport={onImportSuggestedSchedule} />
            </div>
          )}
          
          {/* 重新載入資料按鈕已移除 - Realtime 同步已自動處理資料更新 */}
          {/* 注意：由於已啟用 Supabase Realtime 同步，所有資料變更（INSERT/UPDATE/DELETE）會自動同步到所有分頁 */}
          {/* 如果需要強制重新載入，可以重新整理頁面（F5 或 Ctrl+R） */}
          {/* 
          {onRefreshData && (
            <div className="w-full">
              <RefreshDataButton onRefresh={onRefreshData} />
            </div>
          )}
          */}
          
          {/* 垃圾桶 - 拖曳時顯示 */}
          <div
            ref={setTrashRef}
            className={`col-span-2 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed
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
            {(() => {
              // 根據已排程卡片的順序排序未排程卡片，混合缸卡片排在最下方
              const sortedItems = [...items].sort((a, b) => {
                // 混合缸卡片排在最下方
                const isMixTankA = a.materialDescription === "混合缸排程";
                const isMixTankB = b.materialDescription === "混合缸排程";
                
                // 如果一個是混合缸，一個不是，混合缸排在後面（最下方）
                if (isMixTankA && !isMixTankB) return 1;
                if (!isMixTankA && isMixTankB) return -1;
                
                // 如果兩個都是混合缸，保持原有順序
                if (isMixTankA && isMixTankB) {
                  return 0;
                }
                
                // 取得 productName 的前綴（例如 MO、PE、AC）
                const getProductPrefix = (productName: string): string => {
                  // 提取前兩個字母作為前綴（例如 MO13425033 -> MO）
                  const match = productName.match(/^([A-Z]{2})/);
                  return match ? match[1] : productName;
                };
                
                const prefixA = getProductPrefix(a.productName);
                const prefixB = getProductPrefix(b.productName);
                
                // 如果兩個前綴相同，保持原有順序
                if (prefixA === prefixB) {
                  return 0;
                }
                
                // 查找在已排程順序中的位置
                const indexA = scheduledItemOrder.indexOf(prefixA);
                const indexB = scheduledItemOrder.indexOf(prefixB);
                
                // 如果都在順序中，按照順序排列
                if (indexA !== -1 && indexB !== -1) {
                  return indexA - indexB;
                }
                
                // 如果只有一個在順序中，在順序中的排在前面
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                
                // 如果都不在順序中，按照字母順序排列
                return prefixA.localeCompare(prefixB);
              });
              
              // 調試：顯示排序結果
              if (items.length > 0 && scheduledItemOrder.length > 0) {
                console.log('📋 未排程卡片排序:', {
                  scheduledOrder: scheduledItemOrder,
                  unscheduledItems: items.map(item => {
                    const match = item.productName.match(/^([A-Z]{2})/);
                    return {
                      prefix: match ? match[1] : '?',
                      productName: item.productName,
                    };
                  }),
                  sortedItems: sortedItems.map(item => {
                    const match = item.productName.match(/^([A-Z]{2})/);
                    return {
                      prefix: match ? match[1] : '?',
                      productName: item.productName,
                    };
                  }),
                });
              }
              
              return sortedItems.map((item) => (
                <DraggableCard 
                  key={item.id} 
                  item={item}
                  onToggleCrystallization={onToggleCrystallization}
                  onToggleCCD={onToggleCCD}
                  onToggleDryblending={onToggleDryblending}
                  onTogglePackage={onTogglePackage}
                  onToggle2Press={onToggle2Press}
                  onToggle3Press={onToggle3Press}
                  onQuantityChange={onQuantityChange}
                  onMaterialReadyDateChange={onMaterialReadyDateChange}
                  onToggleAbnormalIncomplete={onToggleAbnormalIncomplete}
                  qcStatus={getBatchQCStatus ? getBatchQCStatus(item.batchNumber) : null}
                  suggestedSchedule={getSuggestedSchedule ? getSuggestedSchedule(item.productName) : null}
                />
              ));
            })()}
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

