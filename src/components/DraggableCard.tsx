"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ScheduleItem } from "@/types/schedule";
import { getProductColor } from "@/utils/productColor";
import { RecipeItem } from "@/types/recipe";
import { useAuth } from "@/contexts/AuthContext";

interface DraggableCardProps {
  item: ScheduleItem;
  color?: string;  // 可覆蓋產品顏色
  onToggleCrystallization?: (itemId: string) => void;  // 切換結晶狀態
  onToggleCCD?: (itemId: string) => void;  // 切換 CCD 狀態
  onToggleDryblending?: (itemId: string) => void;  // 切換 Dryblending 狀態
  onTogglePackage?: (itemId: string) => void;  // 切換 Package 狀態
  onToggle2Press?: (itemId: string) => void;  // 切換 2押 狀態
  onToggle3Press?: (itemId: string) => void;  // 切換 3押 狀態
  onQuantityChange?: (itemId: string, newQuantity: number) => void;  // 更改數量
  onMaterialReadyDateChange?: (itemId: string, newDate: string) => void;  // 更改齊料時間
  onToggleAbnormalIncomplete?: (itemId: string) => void;  // 切換異常未完成狀態
  qcStatus?: 'QC中' | 'QC完成' | 'NG' | null;  // QC 狀態
  suggestedSchedule?: string[] | null;  // 建議排程
}

export default function DraggableCard({ item, color, onToggleCrystallization, onToggleCCD, onToggleDryblending, onTogglePackage, onToggle2Press, onToggle3Press, onQuantityChange, onMaterialReadyDateChange, onToggleAbnormalIncomplete, qcStatus, suggestedSchedule }: DraggableCardProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('canEdit');
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [editQuantity, setEditQuantity] = useState(item.quantity.toString());
  const [isEditingMaterialReadyDate, setIsEditingMaterialReadyDate] = useState(false);
  const [editMaterialReadyDate, setEditMaterialReadyDate] = useState(item.materialReadyDate || '');
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false);

  // 根據 Material Number (productName) 的第三個字元判斷顏色
  const cardColor = color || getProductColor(item.productName);

  // 只有有編輯權限的用戶才能拖曳卡片
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
    disabled: !canEdit, // 訪客無法拖曳
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

  const handle2PressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle2Press?.(item.id);
  };

  const handle3PressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle3Press?.(item.id);
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

  const handleMaterialReadyDateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 已排程時或混合缸卡片都可以編輯
    if (onMaterialReadyDateChange && (item.scheduleDate || item.materialDescription === "混合缸排程")) {
      // 如果沒有齊料時間，使用今天的日期作為預設值
      const defaultDate = item.materialReadyDate || new Date().toISOString().split('T')[0];
      setEditMaterialReadyDate(defaultDate);
      setIsEditingMaterialReadyDate(true);
    }
  };

  const handleMaterialReadyDateSave = () => {
    if (onMaterialReadyDateChange) {
      onMaterialReadyDateChange(item.id, editMaterialReadyDate);
    }
    setIsEditingMaterialReadyDate(false);
  };

  const handleMaterialReadyDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleMaterialReadyDateSave();
    } else if (e.key === "Escape") {
      setIsEditingMaterialReadyDate(false);
      setEditMaterialReadyDate(item.materialReadyDate || '');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canEdit ? { ...listeners, ...attributes } : {})} // 只有有編輯權限才能拖曳
      className={`rounded-lg p-3 shadow-md transition-transform duration-150
                 border border-white/10 backdrop-blur-sm min-w-[180px]
                 ${canEdit ? "cursor-grab active:cursor-grabbing hover:scale-[1.02]" : "cursor-default"}
                 ${isDragging ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/20" : ""}
                 ${item.isAbnormalIncomplete ? "ring-2 ring-red-500/70" : item.needsCrystallization ? "ring-1 ring-cyan-400/50" : ""}`}
    >
      {/* 清機流程掃把圖示 - 左上角 */}
      {item.isCleaningProcess && (
        <div className="absolute top-1 left-1 text-blue-400 z-10 text-lg" title="清機流程">
          🧹
        </div>
      )}
      
      {/* 產品名稱 + 標記 */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className={`font-bold text-sm text-white truncate flex-1 ${item.isCleaningProcess ? 'ml-6' : ''}`}>
          {item.isCleaningProcess && item.cleaningType 
            ? `清機流程 ${item.cleaningType}` 
            : item.productName}
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
          
          {/* 數量 - 可編輯（需有編輯權限） */}
          <div 
            className="text-xs text-gray-300 mb-1"
            onPointerDown={(e) => isEditingQuantity && e.stopPropagation()}
          >
            <span className="text-gray-500">數量:</span>{" "}
            {isEditingQuantity && canEdit ? (
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
                className={`font-semibold text-emerald-400 ${canEdit && onQuantityChange ? "cursor-pointer hover:underline hover:text-emerald-300" : ""}`}
                onClick={canEdit ? handleQuantityClick : undefined}
                title={canEdit && onQuantityChange ? "點擊編輯數量" : undefined}
              >
                {item.quantity.toLocaleString()} KG
              </span>
            )}
          </div>
          
          {/* 齊料時間 - 可編輯（已排程時或混合缸卡片，需有編輯權限） */}
          {(item.scheduleDate || item.materialDescription === "混合缸排程") && (
            <div 
              className="text-xs text-gray-300 mb-1"
              onPointerDown={(e) => isEditingMaterialReadyDate && e.stopPropagation()}
            >
              <span className="text-gray-500">齊料時間:</span>{" "}
              {isEditingMaterialReadyDate && canEdit ? (
                <input
                  type="date"
                  value={editMaterialReadyDate}
                  onChange={(e) => setEditMaterialReadyDate(e.target.value)}
                  onBlur={handleMaterialReadyDateSave}
                  onKeyDown={handleMaterialReadyDateKeyDown}
                  className="px-1 py-0.5 bg-gray-800 border border-purple-500 rounded text-purple-400 font-semibold text-xs outline-none"
                  autoFocus
                />
              ) : (
                <span 
                  className={`text-purple-400 ${canEdit && onMaterialReadyDateChange ? "cursor-pointer hover:underline hover:text-purple-300" : ""}`}
                  onClick={canEdit ? handleMaterialReadyDateClick : undefined}
                  title={canEdit && onMaterialReadyDateChange ? "點擊編輯齊料時間" : undefined}
                >
                  {item.materialReadyDate || (canEdit && onMaterialReadyDateChange ? "點擊設定" : "")}
                </span>
              )}
            </div>
          )}
          {/* 齊料時間 - 未排程時只顯示（不可編輯，混合缸卡片除外） */}
          {item.materialReadyDate && !item.scheduleDate && item.materialDescription !== "混合缸排程" && (
            <div className="text-xs text-gray-300 mb-1">
              <span className="text-gray-500">齊料時間:</span>{" "}
              <span className="text-purple-400">{item.materialReadyDate}</span>
            </div>
          )}
          
          {/* Caution 警告：齊料時間晚於排程時間才顯示 */}
          {item.materialReadyDate && item.scheduleDate && item.startHour !== undefined && (() => {
            // 比較日期（只比較日期部分，不比較時間）
            // 確保日期格式正確（去除可能的空格）
            const readyDateStr = item.materialReadyDate.trim(); // YYYY-MM-DD
            const scheduleDateStr = item.scheduleDate.trim();   // YYYY-MM-DD
            
            // 驗證日期格式
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(readyDateStr) || !dateRegex.test(scheduleDateStr)) {
              return null;
            }
            
            // 如果齊料日期晚於排程日期，顯示警告
            // 直接比較字符串格式的日期（YYYY-MM-DD 格式可以直接字符串比較）
            // readyDateStr > scheduleDateStr 表示齊料時間晚於排程時間
            if (readyDateStr > scheduleDateStr) {
              return (
                <div className="text-xs mb-1">
                  <span className="px-1.5 py-0.5 bg-yellow-500/30 text-yellow-300 rounded font-medium">
                    ⚠️ Caution
                  </span>
                </div>
              );
            }
            return null;
          })()}
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
      
      {/* 建議排程 - 僅顯示 */}
      {suggestedSchedule && suggestedSchedule.length > 0 && (
        <div className="text-xs mb-1">
          <span className="text-gray-500">建議排程:</span>{" "}
          <span className="text-blue-400 font-medium">
            {suggestedSchedule.join(", ")}
          </span>
        </div>
      )}
      
      {/* 如果是新增卡片功能創建的，顯示「新增」提示（獨立顯示，不依賴建議排程） */}
      {item.id.startsWith('card-') && (
        <div className="text-[10px] text-blue-300 mb-1">
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
            新增
          </span>
        </div>
      )}
      
      {/* 看配方 - viewer 預設收合，有編輯權限可以展開/收合 */}
      {item.recipeItems && item.recipeItems.length > 0 && (
        <div className="text-xs mb-1">
          {canEdit ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRecipeExpanded(!isRecipeExpanded);
              }}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              <span className="text-gray-500">看配方:</span>
              <span className="font-medium">
                {isRecipeExpanded ? "收合" : "展開"} ({item.recipeItems.length} 項)
              </span>
              <svg
                className={`w-3 h-3 transition-transform ${isRecipeExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <div className="text-gray-500">
              看配方: <span className="text-gray-400">({item.recipeItems.length} 項)</span>
            </div>
          )}
          
          {/* 配方列表 - 有編輯權限時可展開/收合，viewer 預設收合（不顯示） */}
          {(canEdit ? isRecipeExpanded : false) && (
            <div className="mt-2 ml-4 space-y-1.5 border-l-2 border-blue-500/30 pl-3">
              {item.recipeItems.map((recipe: RecipeItem, idx: number) => (
                <div key={idx} className="text-[11px] text-gray-300 bg-gray-800/50 rounded p-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-blue-400 mb-0.5">
                        {recipe.materialList || "—"}
                      </div>
                      {recipe.materialListDesc && (
                        <div className="text-gray-400 text-[10px] mb-1">
                          {recipe.materialListDesc}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-emerald-400 font-semibold">
                        {recipe.requirementQuantity.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 3,
                        })}
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        {recipe.baseUnit || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Remark - 顯示在「看配方」下方 */}
      {item.remark !== undefined && item.remark !== null && item.remark !== "" && (
        <div className="text-xs mb-1">
          <span className="text-gray-500">Remark:</span>{" "}
          <span className="text-gray-300">{item.remark}</span>
        </div>
      )}

      {/* 勾選選項 - 清機流程、故障維修和混合缸排程不顯示，訪客不顯示互動選項 */}
      {!item.isCleaningProcess && !item.isMaintenance && item.materialDescription !== "混合缸排程" && canEdit && (onToggleCrystallization || onToggleCCD || onToggleDryblending || onTogglePackage || onToggle2Press || onToggle3Press || onToggleAbnormalIncomplete) && (
        <div 
          className="mt-2 pt-2 border-t border-white/10"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* 2押和3押勾選 - 最上方，兩欄對齊（混合缸卡片不顯示） */}
          {item.materialDescription !== "混合缸排程" && (
            <div className="grid grid-cols-2 gap-1 mb-1">
              {/* 左欄：2押 */}
              <div className="flex flex-col gap-1">
                {onToggle2Press && (
                  <label 
                    className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-purple-400 transition-colors"
                    onClick={handle2PressClick}
                  >
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                                    ${item.is2Press 
                                      ? "bg-purple-500 border-purple-500" 
                                      : "border-gray-500 hover:border-purple-400"}`}>
                      {item.is2Press && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    2押
                  </label>
                )}
              </div>

              {/* 右欄：3押 */}
              <div className="flex flex-col gap-1">
                {onToggle3Press && (
                  <label 
                    className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-400 hover:text-indigo-400 transition-colors"
                    onClick={handle3PressClick}
                  >
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                                    ${item.is3Press 
                                      ? "bg-indigo-500 border-indigo-500" 
                                      : "border-gray-500 hover:border-indigo-400"}`}>
                      {item.is3Press && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    3押
                  </label>
                )}
              </div>
            </div>
          )}

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

