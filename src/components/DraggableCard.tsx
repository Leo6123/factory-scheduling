"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ScheduleItem } from "@/types/schedule";
import { getProductColor } from "@/utils/productColor";

interface DraggableCardProps {
  item: ScheduleItem;
  color?: string;  // 可覆蓋產品顏色
  onToggleCrystallization?: (itemId: string) => void;  // 切換結晶狀態
  onToggleCCD?: (itemId: string) => void;  // 切換 CCD 狀態
  onToggleDryblending?: (itemId: string) => void;  // 切換 Dryblending 狀態
  onTogglePackage?: (itemId: string) => void;  // 切換 Package 狀態
  onQuantityChange?: (itemId: string, newQuantity: number) => void;  // 更改數量
  onToggleAbnormalIncomplete?: (itemId: string) => void;  // 切換異常未完成狀態
  qcStatus?: 'QC中' | 'QC完成' | 'NG' | null;  // QC 狀態
}

export default function DraggableCard({ item, color, onToggleCrystallization, onToggleCCD, onToggleDryblending, onTogglePackage, onQuantityChange, onToggleAbnormalIncomplete, qcStatus }: DraggableCardProps) {
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity.toString());

  // 根據 Material Number (productName) 的第三個字元判斷顏色
  const cardColor = color || getProductColor(item.productName);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: `${cardColor}20`,
    borderLeftColor: cardColor,
    borderLeftWidth: "4px",
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const handleCrystallizationClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發拖曳
    onToggleCrystallization?.(item.id);
  };

  const handleAbnormalIncompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleAbnormalIncomplete?.(item.id);
  };

  const handleCCDClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCCD?.(item.id);
  };

  const handleDryblendingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDryblending?.(item.id);
  };

  const handlePackageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePackage?.(item.id);
  };

  const handleQuantityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuantityChange) {
      setEditQuantity(item.quantity.toString());
      setIsEditingQuantity(true);
    }
  };

  const handleQuantitySave = () => {
    const newQty = parseFloat(editQuantity);
    if (!isNaN(newQty) && newQty > 0) {
      onQuantityChange?.(item.id, newQty);
    }
    setIsEditingQuantity(false);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuantitySave();
    } else if (e.key === "Escape") {
      setIsEditingQuantity(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg p-3 shadow-md cursor-grab active:cursor-grabbing 
                 hover:scale-[1.02] transition-transform duration-150
                 border border-white/10 backdrop-blur-sm min-w-[180px]
                 ${isDragging ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20" : ""}
                 ${item.isAbnormalIncomplete ? "ring-2 ring-red-500/70" : item.needsCrystallization ? "ring-1 ring-cyan-400/50" : ""}`}
    >
      {/* 產品名稱 + 標記 */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="font-bold text-sm text-white truncate flex-1">
          {item.productName}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
          {item.isAbnormalIncomplete && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded font-medium">
              ⚠異常
            </span>
          )}
          {item.needsCrystallization && (
            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/30 text-cyan-300 rounded font-medium">
              💎結晶
            </span>
          )}
          {item.needsCCD && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/30 text-gray-300 rounded font-medium">
              🔍CCD
            </span>
          )}
          {item.needsDryblending && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/30 text-amber-300 rounded font-medium">
              🔄Dryblend
            </span>
          )}
          {item.needsPackage && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 rounded font-medium">
              📦Package
            </span>
          )}
          {qcStatus === 'QC中' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/30 text-yellow-300 rounded font-medium">
              🟡QC中
            </span>
          )}
          {qcStatus === 'QC完成' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/30 text-green-300 rounded font-medium">
              ✅QC完成
            </span>
          )}
          {qcStatus === 'NG' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded font-medium">
              ❌NG
            </span>
          )}
        </div>
      </div>

      {/* 產品描述 (Material Description) */}
      {item.materialDescription && (
        <div 
          className="text-[10px] px-1.5 py-0.5 rounded mb-1 truncate inline-block"
          style={{ backgroundColor: `${cardColor}40`, color: cardColor }}
        >
          {item.materialDescription}
        </div>
      )}
      
      {/* 清機流程和故障維修不顯示批號、數量、需求、結晶 */}
      {!item.isCleaningProcess && !item.isMaintenance && (
        <>
          {/* 批號 */}
          <div className="text-xs text-gray-300 mb-1">
            <span className="text-gray-500">批號:</span> {item.batchNumber}
          </div>
          
          {/* 數量 - 可編輯 */}
          <div 
            className="text-xs text-gray-300 mb-1"
            onPointerDown={(e) => isEditingQuantity && e.stopPropagation()}
          >
            <span className="text-gray-500">數量:</span>{" "}
            {isEditingQuantity ? (
              <input
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                onBlur={handleQuantitySave}
                onKeyDown={handleQuantityKeyDown}
                className="w-20 px-1 py-0.5 bg-gray-800 border border-emerald-500 rounded text-emerald-400 font-semibold text-xs outline-none"
                autoFocus
                step="0.01"
                min="0"
              />
            ) : (
              <span 
                className={`font-semibold text-emerald-400 ${onQuantityChange ? "cursor-pointer hover:underline hover:text-emerald-300" : ""}`}
                onClick={handleQuantityClick}
                title={onQuantityChange ? "點擊編輯數量" : undefined}
              >
                {item.quantity.toLocaleString()} KG
              </span>
            )}
          </div>
        </>
      )}
      
      {/* 排程日期 */}
      {item.scheduleDate && (
        <div className="text-xs text-blue-400">
          <span className="text-gray-500">排程:</span> {item.scheduleDate} {item.startHour !== undefined && `${item.startHour}h起`}
        </div>
      )}
      
      {/* 需求日期 - 清機流程和故障維修不顯示 */}
      {!item.isCleaningProcess && !item.isMaintenance && (
        <div className="text-xs text-gray-400">
          <span className="text-gray-500">需求:</span> {item.deliveryDate}
        </div>
      )}

      {/* 勾選選項 - 清機流程和故障維修不顯示 */}
      {!item.isCleaningProcess && !item.isMaintenance && (onToggleCrystallization || onToggleCCD || onToggleDryblending || onTogglePackage || onToggleAbnormalIncomplete) && (
        <div 
          className="mt-2 pt-2 border-t border-white/10"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* 兩欄並排 */}
          <div className="grid grid-cols-2 gap-1">
            {/* 左欄：結晶 + CCD */}
            <div className="flex flex-col gap-1">
              {onToggleCrystallization && (
                <label 
                  className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-cyan-400 transition-colors"
                  onClick={handleCrystallizationClick}
                >
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                                  ${item.needsCrystallization 
                                    ? "bg-cyan-500 border-cyan-500" 
                                    : "border-gray-500 hover:border-cyan-400"}`}>
                    {item.needsCrystallization && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  結晶
                </label>
              )}
              {onToggleCCD && (
                <label 
                  className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-gray-300 transition-colors"
                  onClick={handleCCDClick}
                >
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                                  ${item.needsCCD 
                                    ? "bg-gray-500 border-gray-500" 
                                    : "border-gray-500 hover:border-gray-400"}`}>
                    {item.needsCCD && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  CCD
                </label>
              )}
            </div>

            {/* 右欄：Dryblending + Package */}
            <div className="flex flex-col gap-1">
              {onToggleDryblending && (
                <label 
                  className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-amber-400 transition-colors"
                  onClick={handleDryblendingClick}
                >
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                                  ${item.needsDryblending 
                                    ? "bg-amber-500 border-amber-500" 
                                    : "border-gray-500 hover:border-amber-400"}`}>
                    {item.needsDryblending && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  Dryblend
                </label>
              )}
              {onTogglePackage && (
                <label 
                  className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-emerald-400 transition-colors"
                  onClick={handlePackageClick}
                >
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                                  ${item.needsPackage 
                                    ? "bg-emerald-500 border-emerald-500" 
                                    : "border-gray-500 hover:border-emerald-400"}`}>
                    {item.needsPackage && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  Package
                </label>
              )}
            </div>
          </div>

          {/* 異常未完成勾選 - 單獨一行 */}
          {onToggleAbnormalIncomplete && (
            <label 
              className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-red-400 transition-colors mt-1"
              onClick={handleAbnormalIncompleteClick}
            >
              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                              ${item.isAbnormalIncomplete 
                                ? "bg-red-500 border-red-500" 
                                : "border-gray-500 hover:border-red-400"}`}>
                {item.isAbnormalIncomplete && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              異常未完成
            </label>
          )}
        </div>
      )}
    </div>
  );
}

