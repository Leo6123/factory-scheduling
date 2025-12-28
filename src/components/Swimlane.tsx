"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PRODUCTION_LINES, UNSCHEDULED_LANE, CAPACITY_LINES } from "@/constants/productionLines";
import { ScheduleItem, ScheduleBlockDisplay, CLEANING_PROCESS_DURATION } from "@/types/schedule";
import { LineConfig, DEFAULT_LINE_CONFIGS } from "@/types/productionLine";
import DroppableLane from "./DroppableLane";
import TimelineLane from "./TimelineLane";
import TimelineHeader from "./TimelineHeader";
import ScheduleCard from "./ScheduleCard";
import UnscheduledSidebar from "./UnscheduledSidebar";
import MonthSelector from "./MonthSelector";
import BatchSearch from "./BatchSearch";
import { useScheduleData } from "@/hooks/useScheduleData";
import { useQCStatus } from "@/hooks/useQCStatus";

interface SwimlaneProps {
  initialItems: ScheduleItem[];
}

const HOURS_PER_DAY = 24;
const WORKING_DAYS_RATIO = 22 / 30; // 每月工作天數比例

// 計算指定日期的跨日顯示區塊
function getBlocksForDate(
  items: ScheduleItem[],
  lineId: string,
  targetDate: string,
  lineConfigs: Record<string, LineConfig>
): ScheduleBlockDisplay[] {
  const targetDateObj = new Date(targetDate);
  const blocks: ScheduleBlockDisplay[] = [];
  const config = lineConfigs[lineId];
  
  // 過濾該產線的已排程項目
  const lineItems = items.filter(
    (item) => item.lineId === lineId && item.scheduleDate && item.startHour !== undefined
  );

  for (const item of lineItems) {
    const itemStartDate = new Date(item.scheduleDate!);
    const startHour = item.startHour!;
    
    // 清機流程：quantity 代表分鐘，需轉換為小時
    // 故障維修：使用 maintenanceHours
    // 一般訂單：根據產能計算時長
    let totalDuration: number;
    if (item.isCleaningProcess && item.cleaningType) {
      totalDuration = CLEANING_PROCESS_DURATION[item.cleaningType] / 60; // 分鐘轉小時
    } else if (item.isMaintenance && item.maintenanceHours) {
      totalDuration = item.maintenanceHours; // 直接使用小時
    } else {
      totalDuration = config && config.avgOutput > 0 
        ? item.quantity / config.avgOutput 
        : 1;
    }
    
    // 計算此訂單的結束時間 (以開始日期的小時為基準)
    const endHourFromStart = startHour + totalDuration;
    // 此訂單跨越的天數
    const daysSpanned = Math.ceil(endHourFromStart / HOURS_PER_DAY);
    
    // 檢查每一天是否包含目標日期
    for (let dayOffset = 0; dayOffset < daysSpanned; dayOffset++) {
      const checkDate = new Date(itemStartDate);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      // 比較日期 (忽略時間)
      if (
        checkDate.getFullYear() === targetDateObj.getFullYear() &&
        checkDate.getMonth() === targetDateObj.getMonth() &&
        checkDate.getDate() === targetDateObj.getDate()
      ) {
        // 此訂單在目標日期有顯示
        let displayStartHour: number;
        let displayDuration: number;
        
        if (dayOffset === 0) {
          // 第一天：從原始開始時間開始
          displayStartHour = startHour;
          if (endHourFromStart <= HOURS_PER_DAY) {
            // 不跨日
            displayDuration = totalDuration;
          } else {
            // 跨日，當天只顯示到 24h
            displayDuration = HOURS_PER_DAY - startHour;
          }
        } else {
          // 後續天數：從 0h 開始
          displayStartHour = 0;
          const remainingHours = endHourFromStart - (dayOffset * HOURS_PER_DAY);
          displayDuration = Math.min(remainingHours, HOURS_PER_DAY);
        }
        
        blocks.push({
          item,
          displayStartHour,
          displayDuration,
          totalDuration,
          isCarryOver: dayOffset > 0,
          isContinued: endHourFromStart > (dayOffset + 1) * HOURS_PER_DAY,
          dayOffset,
        });
        
        break; // 找到該日期的顯示區塊後跳出
      }
    }
  }
  
  return blocks.sort((a, b) => a.displayStartHour - b.displayStartHour);
}

export default function Swimlane({ initialItems }: SwimlaneProps) {
  // 使用資料庫 Hook（自動載入和儲存）
  const {
    items: dbItems,
    isLoading: isDataLoading,
    isSaving,
    updateItems: saveScheduleItems,
    deleteItem: deleteScheduleItem,
  } = useScheduleData(initialItems);

  // 本地狀態管理（用於即時更新 UI）
  const [localItems, setLocalItems] = useState<ScheduleItem[]>(initialItems);
  const [history, setHistory] = useState<ScheduleItem[][]>([]); // 歷史記錄 (用於回上一步)

  // 同步資料庫資料到本地狀態
  useEffect(() => {
    if (!isDataLoading) {
      // 優先使用資料庫的資料，確保是陣列
      setLocalItems(Array.isArray(dbItems) ? dbItems : []);
    }
  }, [dbItems, isDataLoading]);

  // 包裝的更新函數：先更新本地狀態，然後非同步儲存到資料庫
  const setScheduleItems = (updater: ScheduleItem[] | ((prev: ScheduleItem[]) => ScheduleItem[])) => {
    setLocalItems((prev) => {
      const newItems = typeof updater === 'function' ? updater(prev) : updater;
      // 非同步儲存到資料庫（不阻塞 UI）
      saveScheduleItems(newItems).catch((err) => {
        console.error('自動儲存失敗:', err);
      });
      return newItems;
    });
  };

  // 使用本地狀態進行渲染（確保 UI 即時更新）
  const scheduleItems = localItems;
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  const [lineConfigs, setLineConfigs] = useState<Record<string, LineConfig>>(DEFAULT_LINE_CONFIGS);
  const [viewMode, setViewMode] = useState<"card" | "timeline">("timeline");
  const [dropPreview, setDropPreview] = useState<{ lineId: string; hour: number } | null>(null);
  const [cardDayRange, setCardDayRange] = useState<1 | 3 | 5 | 7>(3); // 卡片模式的日期範圍
  
  // Google Sheets QC 狀態連動
  // 從環境變數取得 Google Sheet ID，或使用預設值
  const googleSheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const { getBatchQCStatus, qcData, isLoading: isQCLoading, error: qcError } = useQCStatus(scheduleItems, googleSheetId, googleApiKey);
  
  // 除錯：顯示 QC 狀態資訊
  useEffect(() => {
    if (googleSheetId) {
      console.log('📊 QC 狀態資訊:', {
        sheetId: googleSheetId ? '已設定' : '未設定',
        qcDataCount: qcData.length,
        isLoading: isQCLoading,
        error: qcError,
      });
    } else {
      console.warn('⚠️ Google Sheet ID 未設定，請在 .env.local 中設定 NEXT_PUBLIC_GOOGLE_SHEET_ID');
    }
  }, [googleSheetId, qcData.length, isQCLoading, qcError]);
  
  // 月份選擇狀態
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // 時間軸固定為 24 小時
  const totalHours = HOURS_PER_DAY;

  // 取得選擇的日期字串
  const selectedDateStr = selectedDay 
    ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  // 計算每條產線的月產能
  const getMonthlyCapacity = (lineId: string): number => {
    const config = lineConfigs[lineId];
    if (!config || config.avgOutput <= 0) return 0;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthlyHours = HOURS_PER_DAY * daysInMonth;
    return Math.round(config.avgOutput * monthlyHours * WORKING_DAYS_RATIO);
  };

  // 計算已存在的批號集合 (用於匯入時防呆)
  const existingBatchIds = useMemo(() => {
    return new Set(scheduleItems.map((item) => item.batchNumber));
  }, [scheduleItems]);

  // 保存歷史記錄 (用於回上一步)
  const saveHistory = () => {
    setHistory((prev) => [...prev.slice(-19), scheduleItems]); // 最多保留 20 筆
  };

  // 回到上一步
  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setScheduleItems(previousState);
  };

  // 設定拖曳感應器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // 計算拖曳項目的預覽時長
  const getPreviewDuration = (itemId: string, targetLineId: string): number => {
    const item = scheduleItems.find((i) => i.id === itemId);
    if (!item) return 1;
    
    // 清機流程：分鐘轉小時
    if (item.isCleaningProcess && item.cleaningType) {
      return CLEANING_PROCESS_DURATION[item.cleaningType] / 60;
    }
    
    // 故障維修：使用 maintenanceHours
    if (item.isMaintenance && item.maintenanceHours) {
      return item.maintenanceHours;
    }
    
    const config = lineConfigs[targetLineId];
    if (!config || config.avgOutput <= 0) return 1;
    return item.quantity / config.avgOutput;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = scheduleItems.find((i) => i.id === active.id);
    if (item) {
      setActiveItem(item);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (viewMode !== "timeline") return;
    
    const { over, active } = event;
    if (!over || !active) {
      setDropPreview(null);
      return;
    }

    const targetLineId = over.id as string;
    
    if (targetLineId === UNSCHEDULED_LANE.id) {
      setDropPreview(null);
      return;
    }

    const laneElement = document.querySelector(`[data-timeline-lane="${targetLineId}"]`);
    if (!laneElement) {
      setDropPreview(null);
      return;
    }

    const rect = laneElement.getBoundingClientRect();
    const pointerX = (event.activatorEvent as MouseEvent).clientX + (event.delta?.x || 0);
    const relativeX = pointerX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    const hour = Math.round(percentage * totalHours);

    setDropPreview({ lineId: targetLineId, hour: Math.min(hour, totalHours - 1) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const currentPreview = dropPreview;
    
    setActiveItem(null);
    setDropPreview(null);

    if (!over) return;

    const draggedItemId = active.id as string;
    const targetLineId = over.id as string;

    // 處理垃圾桶刪除
    if (targetLineId === "TRASH") {
      const draggedItem = scheduleItems.find((i) => i.id === draggedItemId);
      if (draggedItem && window.confirm(`確定要刪除「${draggedItem.batchNumber}」嗎？`)) {
        saveHistory();
        // 從本地狀態移除
        setScheduleItems((prev) => prev.filter((item) => item.id !== draggedItemId));
        // 從資料庫刪除
        deleteScheduleItem(draggedItemId).catch((err) => {
          console.error('刪除失敗:', err);
        });
      }
      return;
    }

    // 卡片視圖模式下，不允許拖曳到排程（只能退回未排程區）
    if (viewMode === "card" && targetLineId !== UNSCHEDULED_LANE.id) {
      return; // 直接返回，不執行任何操作
    }

    if (!selectedDateStr) {
      alert("請先選擇排程日期");
      return;
    }

    const draggedItem = scheduleItems.find((i) => i.id === draggedItemId);
    if (!draggedItem) return;

    let dropHour: number | undefined = undefined;

    if (viewMode === "timeline" && targetLineId !== UNSCHEDULED_LANE.id) {
      if (currentPreview && currentPreview.lineId === targetLineId) {
        dropHour = currentPreview.hour;
      } else {
        const laneElement = document.querySelector(`[data-timeline-lane="${targetLineId}"]`);
        if (laneElement) {
          const rect = laneElement.getBoundingClientRect();
          const pointerX = (event.activatorEvent as MouseEvent).clientX + (event.delta?.x || 0);
          const relativeX = pointerX - rect.left;
          const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
          dropHour = Math.round(percentage * totalHours);
          dropHour = Math.min(dropHour, totalHours - 1);
        }
      }
    }
    
    const config = lineConfigs[targetLineId];
    // 清機流程：分鐘轉小時，故障維修：使用 maintenanceHours，一般訂單：根據產能計算
    let draggedDuration: number;
    if (draggedItem.isCleaningProcess && draggedItem.cleaningType) {
      draggedDuration = CLEANING_PROCESS_DURATION[draggedItem.cleaningType] / 60;
    } else if (draggedItem.isMaintenance && draggedItem.maintenanceHours) {
      draggedDuration = draggedItem.maintenanceHours;
    } else {
      draggedDuration = config && config.avgOutput > 0 
        ? draggedItem.quantity / config.avgOutput 
        : 1;
    }

    saveHistory();
    setScheduleItems((prev) => {
      const newItems = prev.map((item) => {
        if (item.id === draggedItemId) {
          return {
            ...item,
            lineId: targetLineId,
            scheduleDate: targetLineId === UNSCHEDULED_LANE.id ? undefined : selectedDateStr,
            startHour: targetLineId === UNSCHEDULED_LANE.id ? undefined : dropHour,
          };
        }
        return item;
      });

      if (viewMode === "timeline" && targetLineId !== UNSCHEDULED_LANE.id && dropHour !== undefined) {
        return resolveCollisions(newItems, draggedItemId, targetLineId, selectedDateStr, dropHour, draggedDuration, lineConfigs);
      }

      return newItems;
    });
  };

  const handleImport = async (importedItems: ScheduleItem[]) => {
    saveHistory();
    
    // 使用 setScheduleItems 更新（會自動儲存到 Supabase）
    const newItems = [...localItems, ...importedItems];
    setLocalItems(newItems);
    
    // 明確儲存到資料庫（確保資料持久化）
    try {
      await saveScheduleItems(newItems);
      console.log(`✅ 成功匯入 ${importedItems.length} 筆資料並儲存到 Supabase`);
    } catch (err) {
      console.error('❌ 匯入資料儲存失敗:', err);
      console.warn('⚠️ 匯入資料儲存到 Supabase 失敗，但已儲存到本地 localStorage');
      // 即使 Supabase 儲存失敗，資料仍會存在 localStorage 中
    }
  };

  const handleAddItem = (item: ScheduleItem) => {
    saveHistory();
    setScheduleItems((prev) => [...prev, item]);
  };

  const handleClear = () => {
    saveHistory();
    setScheduleItems([]);
  };

  const handleConfigUpdate = (lineId: string, avgOutput: number) => {
    setLineConfigs((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId], avgOutput },
    }));
  };

  // 切換結晶狀態
  const handleToggleCrystallization = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, needsCrystallization: !item.needsCrystallization }
          : item
      )
    );
  };

  // 切換異常未完成狀態
  const handleToggleAbnormalIncomplete = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isAbnormalIncomplete: !item.isAbnormalIncomplete }
          : item
      )
    );
  };

  // 切換 CCD 狀態
  const handleToggleCCD = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, needsCCD: !item.needsCCD }
          : item
      )
    );
  };

  // 切換 Dryblending 狀態
  const handleToggleDryblending = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, needsDryblending: !item.needsDryblending }
          : item
      )
    );
  };

  // 切換 Package 狀態
  const handleTogglePackage = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, needsPackage: !item.needsPackage }
          : item
      )
    );
  };

  // 更改數量
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // 更改維修時長
  const handleMaintenanceHoursChange = (itemId: string, hours: number) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { 
              ...item, 
              maintenanceHours: hours,
              quantity: hours * 60, // 更新 quantity (分鐘)
              materialDescription: `${hours} 小時`
            }
          : item
      )
    );
  };

  // 未排程項目
  const unscheduledItems = scheduleItems.filter(
    (item) => item.lineId === UNSCHEDULED_LANE.id
  );

  // 取得日期範圍內的日期字串陣列
  const getDateRange = (days: number): string[] => {
    if (!selectedDay) return [];
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(selectedYear, selectedMonth - 1, selectedDay + i);
      // 使用本地日期格式，避免 toISOString 時區問題
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
    return dates;
  };

  // 當天已排程的項目 (依照選擇的日期過濾) - 用於時間軸模式
  const getLineItemsForDate = (lineId: string) => {
    return scheduleItems.filter(
      (item) => item.lineId === lineId && item.scheduleDate === selectedDateStr
    );
  };

  // 取得日期範圍內的項目 - 用於卡片模式 (包含跨日延續的訂單)
  // 使用與時間軸相同的邏輯 (getBlocksForDate)
  const getLineItemsForDateRange = (lineId: string, days: number) => {
    const dateRange = getDateRange(days);
    const visibleItemIds = new Set<string>();
    
    // 對每個日期，用 getBlocksForDate 找出該日有顯示的訂單
    for (const dateStr of dateRange) {
      const blocks = getBlocksForDate(scheduleItems, lineId, dateStr, lineConfigs);
      blocks.forEach((block) => visibleItemIds.add(block.item.id));
    }
    
    // 返回所有在日期範圍內有顯示的訂單
    return scheduleItems.filter((item) => visibleItemIds.has(item.id));
  };

  // 計算該日期各產線已排程數量
  const getDayScheduledQuantity = (lineId: string) => {
    return getLineItemsForDate(lineId).reduce((sum, item) => sum + item.quantity, 0);
  };

  // 計算全部產線的總產能與該月總排程 (只計算 CAPACITY_LINES 中的產線)
  const totalCapacity = PRODUCTION_LINES
    .filter((line) => CAPACITY_LINES.includes(line.id as typeof CAPACITY_LINES[number]))
    .reduce((sum, line) => sum + getMonthlyCapacity(line.id), 0);
  const totalScheduledThisMonth = scheduleItems
    .filter((item) => {
      if (item.lineId === UNSCHEDULED_LANE.id || !item.scheduleDate) return false;
      const [y, m] = item.scheduleDate.split("-").map(Number);
      return y === selectedYear && m === selectedMonth;
    })
    .reduce((sum, item) => sum + item.quantity, 0);

  // 計算選擇日期當天 24 小時內可完成的數量
  const totalScheduledToday = useMemo(() => {
    if (!selectedDateStr) return 0;
    
    let total = 0;
    for (const line of PRODUCTION_LINES) {
      const blocks = getBlocksForDate(scheduleItems, line.id, selectedDateStr, lineConfigs);
      const config = lineConfigs[line.id];
      
      for (const block of blocks) {
        // 清機流程不計入 KG
        if (block.item.isCleaningProcess) continue;
        // 故障維修不計入 KG
        if (block.item.isMaintenance) continue;
        // 異常未完成不計入 KG
        if (block.item.isAbnormalIncomplete) continue;
        
        // 根據當天顯示的時長計算可完成數量
        if (config && config.avgOutput > 0) {
          const dayQuantity = block.displayDuration * config.avgOutput;
          total += dayQuantity;
        } else {
          // 無產能設定時，只有完全在當天完成的才計入
          if (!block.isCarryOver && !block.isContinued) {
            total += block.item.quantity;
          }
        }
      }
    }
    return Math.round(total);
  }, [scheduleItems, selectedDateStr, lineConfigs]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-120px)]">
        {/* 左側：未排程區域 */}
        <UnscheduledSidebar
          items={unscheduledItems}
          allScheduleItems={scheduleItems}
          lineConfigs={lineConfigs}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onImport={handleImport}
          onClear={handleClear}
          existingBatchIds={existingBatchIds}
          totalItemCount={scheduleItems.length}
          onToggleCrystallization={handleToggleCrystallization}
          onToggleCCD={handleToggleCCD}
          onToggleDryblending={handleToggleDryblending}
          onTogglePackage={handleTogglePackage}
          onQuantityChange={handleQuantityChange}
          onToggleAbnormalIncomplete={handleToggleAbnormalIncomplete}
          isDragging={activeItem !== null}
          onAddItem={handleAddItem}
          onUndo={handleUndo}
          canUndo={history.length > 0}
          getBatchQCStatus={getBatchQCStatus}
        />

        {/* 右側：產線區域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 月份選擇器 + 批號查詢 */}
          <div className="px-3 pt-3 flex items-center justify-between">
            <MonthSelector
              year={selectedYear}
              month={selectedMonth}
              selectedDay={selectedDay}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
              onDaySelect={setSelectedDay}
            />
            {/* 批號查詢 - 右上角 */}
            <BatchSearch scheduleItems={scheduleItems} />
          </div>

          {/* 視圖切換 + 產能摘要 */}
          <div className="flex items-center justify-between gap-4 p-3 border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">視圖:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("card")}
                  className={`px-3 py-1 text-xs rounded transition-all
                             ${viewMode === "card" 
                               ? "bg-blue-600 text-white" 
                               : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
                >
                  卡片
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`px-3 py-1 text-xs rounded transition-all
                             ${viewMode === "timeline" 
                               ? "bg-blue-600 text-white" 
                               : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
                >
                  24h 時間軸
                </button>
              </div>

              {/* 卡片模式日期範圍選項 */}
              {viewMode === "card" && (
                <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-3">
                  <span className="text-xs text-gray-500 mr-1">日期範圍:</span>
                  {([1, 3, 5, 7] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setCardDayRange(days)}
                      className={`px-2 py-1 text-xs rounded transition-all
                                 ${cardDayRange === days
                                   ? "bg-emerald-600 text-white"
                                   : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
                    >
                      {`${days}日`}
                    </button>
                  ))}
                </div>
              )}

              {selectedDay && (
                <span className="text-sm text-blue-400 font-medium">
                  📅 {selectedMonth}/{selectedDay}
                  {viewMode === "card" && cardDayRange > 1 && (() => {
                    // 計算結束日期
                    const endDay = selectedDay + cardDayRange - 1;
                    // 獲取當月最後一天
                    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                    // 如果超過當月最後一天，使用最後一天
                    const displayEndDay = Math.min(endDay, daysInMonth);
                    return (
                      <span className="text-emerald-400"> ~ {selectedMonth}/{displayEndDay}</span>
                    );
                  })()}
                </span>
              )}
            </div>

            {/* 產能摘要 */}
            <div className="flex items-center gap-4 text-xs">
              <div className="text-gray-400">
                月產能: <span className="text-white font-medium">{totalCapacity.toLocaleString()}</span> KG
              </div>
              <div className="text-gray-400">
                月排程: <span className="text-emerald-400 font-medium">{totalScheduledThisMonth.toLocaleString()}</span> KG
              </div>
              {selectedDay && (
                <div className="text-gray-400">
                  當日: <span className="text-yellow-400 font-medium">{totalScheduledToday.toLocaleString()}</span> KG
                </div>
              )}
              <div className={`${totalCapacity - totalScheduledThisMonth >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                月剩餘: <span className="font-medium">{(totalCapacity - totalScheduledThisMonth).toLocaleString()}</span> KG
              </div>
            </div>
          </div>

          {/* 時間軸標題 (僅在時間軸模式) */}
          {viewMode === "timeline" && (
            <div className="px-3 pt-2">
              <TimelineHeader totalHours={totalHours} interval={2} />
            </div>
          )}

          {/* 產線泳道 */}
          <div ref={timelineContainerRef} className="flex-1 overflow-y-auto p-3">
            {!selectedDay ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                請先選擇日期以查看/編輯排程
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {PRODUCTION_LINES.map((line) => {
                  // 取得當天該產線的排程 (包含跨日延續的區塊)
                  const displayBlocks = getBlocksForDate(
                    scheduleItems,
                    line.id,
                    selectedDateStr!,
                    lineConfigs
                  );
                  // 卡片模式的項目 (支援日期範圍)，過濾掉清機流程和故障維修
                  const lineItems = (viewMode === "card" 
                    ? getLineItemsForDateRange(line.id, cardDayRange)
                    : getLineItemsForDate(line.id)
                  ).filter(item => !item.isCleaningProcess && !item.isMaintenance);
                  
                  const isPreviewLine = dropPreview?.lineId === line.id;
                  const previewHour = isPreviewLine ? dropPreview.hour : null;
                  const previewDuration = activeItem && isPreviewLine
                    ? getPreviewDuration(activeItem.id, line.id)
                    : 1;

                  const monthlyCapacity = getMonthlyCapacity(line.id);

                  if (viewMode === "timeline") {
                    return (
                      <TimelineLane
                        key={line.id}
                        lineId={line.id}
                        lineName={line.name}
                        color={line.color}
                        displayBlocks={displayBlocks}
                        config={lineConfigs[line.id]}
                        onConfigUpdate={handleConfigUpdate}
                        totalHours={totalHours}
                        dropPreviewHour={previewHour}
                        previewDuration={previewDuration}
                        monthlyCapacity={monthlyCapacity}
                        onMaintenanceHoursChange={handleMaintenanceHoursChange}
                        getBatchQCStatus={getBatchQCStatus}
                      />
                    );
                  }

                  return (
                    <DroppableLane
                      key={line.id}
                      lineId={line.id}
                      lineName={line.name}
                      color={line.color}
                      items={lineItems}
                      config={lineConfigs[line.id]}
                      onConfigUpdate={handleConfigUpdate}
                      monthlyCapacity={monthlyCapacity}
                      onToggleCrystallization={handleToggleCrystallization}
                      onToggleCCD={handleToggleCCD}
                      onToggleDryblending={handleToggleDryblending}
                      onTogglePackage={handleTogglePackage}
                      onQuantityChange={handleQuantityChange}
                      onToggleAbnormalIncomplete={handleToggleAbnormalIncomplete}
                      getBatchQCStatus={getBatchQCStatus}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 拖曳時顯示的浮動卡片 - 使用產品顏色 */}
      <DragOverlay>
        {activeItem ? (
          <div className="rotate-3 opacity-90">
            <ScheduleCard item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// 處理碰撞：被插入的卡片自動後退 (同日期同產線)
function resolveCollisions(
  items: ScheduleItem[],
  draggedId: string,
  targetLineId: string,
  scheduleDate: string,
  dropHour: number,
  draggedDuration: number,
  lineConfigs: Record<string, LineConfig>
): ScheduleItem[] {
  // 取得同產線同日期的其他項目 (不含拖曳項目)
  const lineItems = items
    .filter((item) => 
      item.lineId === targetLineId && 
      item.scheduleDate === scheduleDate &&
      item.id !== draggedId
    )
    .map((item) => {
      const config = lineConfigs[targetLineId];
      // 清機流程：分鐘轉小時，故障維修：使用 maintenanceHours，一般訂單：根據產能計算
      let duration: number;
      if (item.isCleaningProcess && item.cleaningType) {
        duration = CLEANING_PROCESS_DURATION[item.cleaningType] / 60;
      } else if (item.isMaintenance && item.maintenanceHours) {
        duration = item.maintenanceHours;
      } else {
        duration = config && config.avgOutput > 0 
          ? item.quantity / config.avgOutput 
          : 1;
      }
      return { ...item, duration };
    })
    .sort((a, b) => (a.startHour ?? 0) - (b.startHour ?? 0));

  const draggedEnd = dropHour + draggedDuration;
  let currentEnd = draggedEnd;
  const adjustedItems: Record<string, number> = {};

  for (const item of lineItems) {
    const itemStart = item.startHour ?? 0;
    const itemEnd = itemStart + item.duration;
    
    if (itemStart < draggedEnd && itemEnd > dropHour) {
      adjustedItems[item.id] = currentEnd;
      currentEnd = currentEnd + item.duration;
    } else if (itemStart >= currentEnd) {
      break;
    } else if (itemStart < currentEnd && itemStart >= draggedEnd) {
      adjustedItems[item.id] = currentEnd;
      currentEnd = currentEnd + item.duration;
    }
  }

  return items.map((item) => {
    if (adjustedItems[item.id] !== undefined) {
      return { ...item, startHour: adjustedItems[item.id] };
    }
    return item;
  });
}
