"use client";

import { useDroppable } from "@dnd-kit/core";
import { ScheduleBlockDisplay } from "@/types/schedule";
import { LineConfig } from "@/types/productionLine";
import LineConfigEditor from "./LineConfigEditor";
import DraggableTimelineBlock from "./DraggableTimelineBlock";

interface TimelineLaneProps {
  lineId: string;
  lineName: string;
  color: string;
  displayBlocks: ScheduleBlockDisplay[];  // 跨日區塊顯示資料
  config: LineConfig;
  onConfigUpdate: (lineId: string, avgOutput: number) => void;
  totalHours?: number;
  dropPreviewHour?: number | null;
  previewDuration?: number;
  monthlyCapacity?: number;  // 月產能 (KG)
  onMaintenanceHoursChange?: (itemId: string, hours: number) => void;  // 更改維修時長
  getBatchQCStatus?: (batchNumber: string) => 'QC中' | 'QC完成' | 'NG' | null;  // 取得 QC 狀態
}

export default function TimelineLane({
  lineId,
  lineName,
  color,
  displayBlocks,
  config,
  onConfigUpdate,
  totalHours = 24,
  dropPreviewHour,
  previewDuration = 1,
  monthlyCapacity,
  onMaintenanceHoursChange,
  getBatchQCStatus,
}: TimelineLaneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: lineId,
  });

  // 計算當天顯示的數量 (只計算非延續的區塊，或按 displayDuration 比例計算)
  const scheduledQuantity = displayBlocks
    .filter((b) => !b.isCarryOver) // 只計算當天開始的訂單
    .filter((b) => {
      // NG修色不計入產量
      if (b.item.materialDescription === "NG修色") return false;
      // 清機流程不計入產量
      if (b.item.isCleaningProcess) return false;
      // 故障維修不計入產量
      if (b.item.isMaintenance) return false;
      return true;
    })
    .reduce((sum, b) => sum + b.item.quantity, 0);
  
  // 計算剩餘產能
  const remainingCapacity = monthlyCapacity !== undefined 
    ? monthlyCapacity - scheduledQuantity 
    : null;

  // 計算當天使用時數 (包含跨日延續的時間)
  const totalUsedHours = displayBlocks.reduce((sum, b) => sum + b.displayDuration, 0);

  // 是否顯示放置預覽
  const showPreview = dropPreviewHour !== null && dropPreviewHour !== undefined;

  return (
    <div
      className={`flex border rounded-lg overflow-hidden transition-all duration-200
                  ${isOver 
                    ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50" 
                    : "border-white/10 bg-white/5"}`}
    >
      {/* 產線標籤 */}
      <LineConfigEditor
        lineId={lineId}
        lineName={lineName}
        color={color}
      />
      
      {/* 時間軸區域 (Droppable) */}
      <div 
        ref={setNodeRef}
        data-timeline-lane={lineId}
        className={`flex-1 relative h-20 transition-colors duration-200
                    ${isOver ? "bg-blue-500/5" : ""}`}
      >
        {/* 背景格線 - 每 2 小時一條線 */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.floor(totalHours / 2) + 1 }).map((_, i) => {
            const hour = i * 2;
            const leftPercent = (hour / totalHours) * 100;
            return (
              <div
                key={i}
                className={`absolute top-0 bottom-0 w-px 
                           ${hour % 12 === 0 ? "bg-white/10" : "bg-white/5"}`}
                style={{ left: `${leftPercent}%` }}
              />
            );
          })}
        </div>

        {/* 放置預覽區塊 */}
        {showPreview && (
          <div
            className="absolute top-2 bottom-2 rounded border-2 border-dashed border-blue-400 
                       bg-blue-500/20 pointer-events-none z-10
                       animate-pulse"
            style={{
              left: `${(dropPreviewHour / totalHours) * 100}%`,
              width: `${Math.max((previewDuration / totalHours) * 100, 2)}%`,
            }}
          >
            <div className="absolute -top-5 left-0 text-xs text-blue-400 font-medium whitespace-nowrap">
              {String(Math.floor(dropPreviewHour)).padStart(2, "0")}:00
            </div>
          </div>
        )}

        {/* 訂單區塊 */}
        {displayBlocks.length > 0 ? (
          <div className="absolute inset-0 flex items-center">
            {displayBlocks.map((block) => (
              <DraggableTimelineBlock
                key={`${block.item.id}-day${block.dayOffset}`}
                item={block.item}
                startHour={block.displayStartHour}
                durationHours={block.displayDuration}
                totalHours={totalHours}
                isCarryOver={block.isCarryOver}
                isContinued={block.isContinued}
                onMaintenanceHoursChange={onMaintenanceHoursChange}
                qcStatus={getBatchQCStatus ? getBatchQCStatus(block.item.batchNumber) : null}
              />
            ))}
          </div>
        ) : !showPreview && (
          <div className={`absolute inset-0 flex items-center justify-center
                          text-sm italic transition-colors duration-200 pointer-events-none
                          ${isOver ? "text-blue-400" : "text-gray-600"}`}>
            {isOver ? "放開以加入此產線" : "拖曳卡片到時間軸"}
          </div>
        )}
      </div>

      {/* 統計資訊 + 剩餘產能 */}
      <div className="flex-shrink-0 flex flex-col items-end justify-center px-3 py-2 
                      bg-white/5 border-l border-white/10 w-[120px]">
        <div className="text-xs text-gray-400">
          共 <span className="text-white font-medium">{displayBlocks.length}</span> 筆
        </div>
        <div className="text-xs text-gray-400">
          <span className="text-emerald-400 font-medium">
            {scheduledQuantity.toLocaleString()}
          </span> KG
        </div>
        <div className="text-xs text-gray-500">
          ≈ {totalUsedHours.toFixed(1)}h
        </div>
        
        {/* 剩餘產能 */}
        {remainingCapacity !== null && (
          <div className={`text-xs mt-1 pt-1 border-t border-white/10 w-full text-right
                          ${remainingCapacity >= 0 ? "text-cyan-400" : "text-red-400"}`}>
            剩餘: {remainingCapacity.toLocaleString()} KG
          </div>
        )}
      </div>
    </div>
  );
}
