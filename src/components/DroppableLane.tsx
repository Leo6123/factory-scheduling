"use client";

import { useDroppable } from "@dnd-kit/core";
import { ScheduleItem } from "@/types/schedule";
import { LineConfig } from "@/types/productionLine";
import DraggableCard from "./DraggableCard";
import LineConfigEditor from "./LineConfigEditor";

interface DroppableLaneProps {
  lineId: string;
  lineName: string;
  color: string;
  items: ScheduleItem[];
  isUnscheduled?: boolean;
  config?: LineConfig;
  onConfigUpdate?: (lineId: string, avgOutput: number) => void;
  monthlyCapacity?: number;  // 月產能 (KG)
  onToggleCrystallization?: (itemId: string) => void;  // 切換結晶狀態
  onToggleCCD?: (itemId: string) => void;  // 切換 CCD 狀態
  onToggleDryblending?: (itemId: string) => void;  // 切換 Dryblending 狀態
  onTogglePackage?: (itemId: string) => void;  // 切換 Package 狀態
  onQuantityChange?: (itemId: string, newQuantity: number) => void;  // 更改數量
  onToggleAbnormalIncomplete?: (itemId: string) => void;  // 切換異常未完成狀態
  getBatchQCStatus?: (batchNumber: string) => 'QC中' | 'QC完成' | 'NG' | null;  // 取得 QC 狀態
}

export default function DroppableLane({ 
  lineId, 
  lineName, 
  color, 
  items,
  isUnscheduled = false,
  config,
  onConfigUpdate,
  monthlyCapacity,
  onToggleCrystallization,
  onToggleCCD,
  onToggleDryblending,
  onTogglePackage,
  onQuantityChange,
  onToggleAbnormalIncomplete,
  getBatchQCStatus,
}: DroppableLaneProps) {
  // 卡片視圖模式下，產線區域禁用拖放（只能退回未排程區）
  const { isOver, setNodeRef } = useDroppable({
    id: lineId,
    disabled: !isUnscheduled, // 只有未排程區可以拖放，產線區域禁用
  });

  // 計算此產線的總數量
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // 計算預估生產時間 (小時)
  const estimatedHours = config && config.avgOutput > 0 
    ? (totalQuantity / config.avgOutput).toFixed(1) 
    : null;

  // 計算剩餘產能
  const remainingCapacity = monthlyCapacity !== undefined 
    ? monthlyCapacity - totalQuantity 
    : null;

  return (
    <div
      className={`flex border rounded-lg overflow-hidden transition-all duration-200
                  ${isOver 
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                    : "border-white/10 bg-white/5"}
                  ${isUnscheduled ? "border-dashed" : ""}`}
    >
      {/* 產線標籤 */}
      {isUnscheduled ? (
        <div
          className="w-28 flex-shrink-0 flex items-center justify-center 
                     font-bold text-white text-sm py-4"
          style={{ backgroundColor: `${color}30` }}
        >
          <span className="px-2 py-1 rounded text-xs bg-gray-700">
            {lineName}
          </span>
        </div>
      ) : config && onConfigUpdate ? (
        <LineConfigEditor
          lineId={lineId}
          lineName={lineName}
          color={color}
          config={config}
          onUpdate={onConfigUpdate}
        />
      ) : (
        <div
          className="w-24 flex-shrink-0 flex items-center justify-center 
                     font-bold text-white text-sm py-4"
          style={{ backgroundColor: `${color}30` }}
        >
          <span
            className="px-2 py-1 rounded text-xs"
            style={{ backgroundColor: color }}
          >
            {lineName}
          </span>
        </div>
      )}
      
      {/* 卡片區域 (Droppable) */}
      <div 
        ref={setNodeRef}
        className={`flex-1 flex items-center gap-3 p-3 overflow-x-auto
                    transition-colors duration-200
                    ${isUnscheduled ? "min-h-[120px] flex-wrap" : "min-h-[100px]"}
                    ${isOver ? "bg-blue-500/5" : ""}`}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <DraggableCard 
              key={item.id} 
              item={item} 
              onToggleCrystallization={onToggleCrystallization}
              onToggleCCD={onToggleCCD}
              onToggleDryblending={onToggleDryblending}
              onTogglePackage={onTogglePackage}
              onQuantityChange={onQuantityChange}
              onToggleAbnormalIncomplete={onToggleAbnormalIncomplete}
              qcStatus={getBatchQCStatus ? (() => {
                const status = getBatchQCStatus(item.batchNumber);
                if (status) {
                  console.log(`📋 卡片 QC 狀態: 批號 "${item.batchNumber}" → ${status}`);
                }
                return status;
              })() : null}
            />
            ));
          })()
        ) : (
          <div className={`text-sm italic transition-colors duration-200
                          ${isOver ? "text-blue-400" : "text-gray-600"}`}>
            {isOver 
              ? "放開以加入此區域" 
              : isUnscheduled 
                ? "匯入 Excel 或將卡片拖至此處" 
                : "無排程項目"}
          </div>
        )}
      </div>

      {/* 產線統計 (非未排程區域) - 永遠顯示 */}
      {!isUnscheduled && (
        <div className="flex-shrink-0 flex flex-col items-end justify-center px-3 py-2 
                        bg-white/5 border-l border-white/10 w-[120px]">
          <div className="text-xs text-gray-400">
            共 <span className="text-white font-medium">{items.length}</span> 筆
          </div>
          <div className="text-xs text-gray-400">
            <span className="text-emerald-400 font-medium">
              {totalQuantity.toLocaleString()}
            </span> KG
          </div>
          <div className="text-xs text-gray-500">
            ≈ {estimatedHours || "0.0"}h
          </div>
          
          {/* 剩餘產能 */}
          {remainingCapacity !== null && (
            <div className={`text-xs mt-1 pt-1 border-t border-white/10 w-full text-right
                            ${remainingCapacity >= 0 ? "text-cyan-400" : "text-red-400"}`}>
              剩餘: {remainingCapacity.toLocaleString()} KG
            </div>
          )}
        </div>
      )}
    </div>
  );
}
