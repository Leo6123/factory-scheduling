"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ScheduleItem, CLEANING_PROCESS_DURATION } from "@/types/schedule";
import { getProductColor } from "@/utils/productColor";
import { useAuth } from "@/contexts/AuthContext";

interface DraggableTimelineBlockProps {
  item: ScheduleItem;
  color?: string;         // 可覆蓋產品顏色
  startHour: number;      // 當天顯示的開始時間
  durationHours: number;  // 當天顯示的時長
  totalHours: number;
  isCarryOver?: boolean;  // 是否為從前一天延續的區塊
  isContinued?: boolean;  // 是否延續到下一天
  onMaintenanceHoursChange?: (itemId: string, hours: number) => void;  // 更改維修時長
  qcStatus?: 'QC中' | 'QC完成' | 'NG' | null;  // QC 狀態
}

export default function DraggableTimelineBlock({
  item,
  color,
  startHour,
  durationHours,
  totalHours,
  isCarryOver = false,
  isContinued = false,
  onMaintenanceHoursChange,
  qcStatus,
}: DraggableTimelineBlockProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('canEdit');
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [editHours, setEditHours] = useState(item.maintenanceHours?.toString() || "");
  // 根據 Material Number (productName) 的第三個字元判斷顏色
  const blockColor = color || getProductColor(item.productName);
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item, startHour, durationHours, isCarryOver },
    disabled: !canEdit, // 只有有編輯權限才能拖曳
  });

  // 計算位置和寬度 (百分比)
  const leftPercent = (startHour / totalHours) * 100;
  const widthPercent = (durationHours / totalHours) * 100;

  // 格式化時間顯示 (HH:MM 格式)
  const formatTime = (hours: number) => {
    const h = Math.floor(hours) % 24;
    const m = Math.round((hours % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // 簡短時間格式 (用於區塊內顯示)
  const formatTimeShort = (hours: number) => {
    const h = Math.floor(hours) % 24;
    return `${String(h).padStart(2, "0")}:00`;
  };

  const endHour = startHour + durationHours;

  // 維修時長編輯處理
  const handleMaintenanceClick = (e: React.MouseEvent) => {
    if (!item.isMaintenance || !onMaintenanceHoursChange) return;
    e.stopPropagation();
    e.preventDefault();
    setEditHours(item.maintenanceHours?.toString() || "");
    setIsEditingHours(true);
  };

  const handleMaintenanceSave = () => {
    const hours = parseFloat(editHours);
    if (!isNaN(hours) && hours > 0) {
      onMaintenanceHoursChange?.(item.id, hours);
    }
    setIsEditingHours(false);
  };

  const handleMaintenanceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleMaintenanceSave();
    } else if (e.key === "Escape") {
      setIsEditingHours(false);
    }
  };

  // 拖曳時隱藏原位置的區塊 (由 DragOverlay 顯示)
  if (isDragging) {
    return (
      <div
        className="absolute h-16 rounded border-2 border-dashed border-gray-500 bg-gray-800/50"
        style={{
          left: `${leftPercent}%`,
          width: `${Math.max(widthPercent, 2)}%`,
        }}
      />
    );
  }

  // 跨日樣式
  const carryOverStyle = isCarryOver ? {
    borderLeftStyle: "dashed" as const,
    opacity: 0.85,
  } : {};

  const continuedStyle = isContinued ? {
    borderRightStyle: "dashed" as const,
    borderRightWidth: "3px",
    borderRightColor: blockColor,
  } : {};

  // 時間標籤 (區塊內顯示)
  const timeLabel = isCarryOver 
    ? `← 00:00 - ${formatTimeShort(endHour)}`
    : isContinued
      ? `${formatTimeShort(startHour)} - 24:00 →`
      : `${formatTimeShort(startHour)} - ${formatTime(endHour)}`;

  // tooltip 顯示完整資訊 (清機/維修不顯示批號和數量)
  const isSpecialCard = item.isCleaningProcess || item.isMaintenance;
  const tooltipText = [
    item.productName,
    !isSpecialCard && `批號: ${item.batchNumber}`,
    !isSpecialCard && `數量: ${item.quantity.toLocaleString()} KG`,
    `時間: ${formatTime(startHour)} - ${formatTime(endHour)}`,
    `時長: ${durationHours.toFixed(1)} 小時`,
    isCarryOver ? "⬅ 從前一天延續" : "",
    isContinued ? "➡ 延續到下一天" : "",
  ].filter(Boolean).join("\n");

  return (
    <div
      ref={setNodeRef}
      {...(canEdit ? { ...listeners, ...attributes } : {})} // 只有有編輯權限才能拖曳
      className={`absolute h-16 rounded flex flex-col justify-center px-2
                 border border-white/20 transition-all overflow-hidden select-none
                 ${canEdit 
                   ? "cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/30" 
                   : "cursor-default"}`}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 2)}%`,
        backgroundColor: `${blockColor}${isCarryOver ? "40" : "50"}`,
        borderLeftColor: blockColor,
        borderLeftWidth: "3px",
        ...carryOverStyle,
        ...continuedStyle,
      }}
      title={tooltipText}
    >
      {/* 跨日標記 */}
      {isCarryOver && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 text-[10px] text-yellow-400">
          ◀
        </div>
      )}
      {isContinued && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-[10px] text-yellow-400">
          ▶
        </div>
      )}
      
      {/* 清機流程掃把圖示 - 左上角 */}
      {item.isCleaningProcess && (
        <div className="absolute top-0.5 left-0.5 text-blue-400 z-10 text-sm" title="清機流程">
          🧹
        </div>
      )}
      
      {/* 異常 + 結晶 + CCD + Dryblend + Package 標記 - 垂直排列 */}
      <div className="absolute top-0.5 right-0.5 flex flex-col items-center gap-0">
        {item.isAbnormalIncomplete && (
          <span 
            className="text-[8px] leading-none" 
            title="異常未完成"
          >
            ⚠️
          </span>
        )}
        {item.needsCrystallization && (
          <span className="text-[8px] leading-none" title="需要結晶">
            💎
          </span>
        )}
        {item.needsCCD && (
          <span className="text-[8px] leading-none" title="需要CCD">
            🔍
          </span>
        )}
        {item.needsDryblending && (
          <span className="text-[8px] leading-none" title="需要Dryblending">
            🔄
          </span>
        )}
        {item.needsPackage && (
          <span className="text-[8px] leading-none" title="需要Package">
            📦
          </span>
        )}
        {qcStatus === 'QC中' && (
          <span className="text-[8px] leading-none" title="QC中">
            🟡
          </span>
        )}
        {qcStatus === 'QC完成' && (
          <span className="text-[8px] leading-none" title="QC完成">
            ✅
          </span>
        )}
        {qcStatus === 'NG' && (
          <span className="text-[8px] leading-none" title="NG">
            ❌
          </span>
        )}
      </div>
      
      <div className={`text-xs font-bold text-white truncate ${item.isCleaningProcess ? 'pl-5' : ''}`}>
        {item.isCleaningProcess && item.cleaningType 
          ? `清機流程 ${item.cleaningType}` 
          : item.productName}
      </div>
      
      {/* 如果是新增卡片功能創建的，顯示「新增」提示 */}
      {item.id.startsWith('card-') && !item.isCleaningProcess && !item.isMaintenance && (
        <div className="text-[8px] text-blue-300 mt-0.5">
          <span className="px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded">
            新增
          </span>
        </div>
      )}
      
      {/* 維修時長編輯 - 需有編輯權限 */}
      {item.isMaintenance && isEditingHours && canEdit ? (
        <div 
          className="flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            type="number"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            onBlur={handleMaintenanceSave}
            onKeyDown={handleMaintenanceKeyDown}
            className="w-12 px-1 py-0.5 bg-gray-800 border border-amber-500 rounded text-amber-400 font-semibold text-[10px] outline-none"
            autoFocus
            step="0.5"
            min="0.5"
          />
          <span className="text-[10px] text-gray-400">小時</span>
        </div>
      ) : item.isMaintenance ? (
        <div 
          className={`text-[10px] text-amber-400 ${canEdit ? "cursor-pointer hover:underline" : ""}`}
          onClick={canEdit ? handleMaintenanceClick : undefined}
          onPointerDown={(e) => e.stopPropagation()}
          title={canEdit ? "點擊編輯時長" : undefined}
        >
          🔧 {item.maintenanceHours} 小時
        </div>
      ) : item.isCleaningProcess ? (
        <div className="text-[10px] text-blue-400">
          {item.cleaningType 
            ? CLEANING_PROCESS_DURATION[item.cleaningType] 
            : item.quantity} 分鐘
        </div>
      ) : (
        <div className="text-[10px] text-gray-300 truncate">
          ◆{item.batchNumber}
        </div>
      )}
      
      <div className={`text-[10px] font-medium ${isCarryOver || isContinued ? "text-yellow-400" : "text-emerald-400"}`}>
        {timeLabel}
      </div>
      {/* 顯示原始排程日期 (只在跨日時顯示) */}
      {isCarryOver && item.scheduleDate && (
        <div className="text-[9px] text-orange-400 truncate">
          排程: {item.scheduleDate.slice(5)}
        </div>
      )}
    </div>
  );
}
