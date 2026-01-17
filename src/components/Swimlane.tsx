"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import { PRODUCTION_LINES, UNSCHEDULED_LANE, CAPACITY_LINES, NON_CAPACITY_LINES, MIX_TANK_ALLOWED_LINES } from "@/constants/productionLines";
import { ScheduleItem, ScheduleBlockDisplay, CLEANING_PROCESS_DURATION } from "@/types/schedule";
import { LineConfig, DEFAULT_LINE_CONFIGS } from "@/types/productionLine";
import DroppableLane from "./DroppableLane";
import TimelineLane from "./TimelineLane";
import TimelineHeader from "./TimelineHeader";
import ScheduleCard from "./ScheduleCard";
import UnscheduledSidebar from "./UnscheduledSidebar";
import MonthSelector from "./MonthSelector";
import BatchSearch from "./BatchSearch";
import { useScheduleData, clearScheduleCache } from "@/hooks/useScheduleData";
import { useQCStatus } from "@/hooks/useQCStatus";
import { useSuggestedSchedule } from "@/hooks/useSuggestedSchedule";
import { useRealtimeSchedule } from "@/hooks/useRealtimeSchedule";
import { supabase, TABLES } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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
    // 一般訂單：根據卡片上的出量 (outputRate) 計算時長
    let totalDuration: number;
    if (item.isCleaningProcess && item.cleaningType) {
      totalDuration = CLEANING_PROCESS_DURATION[item.cleaningType] / 60; // 分鐘轉小時
    } else if (item.isMaintenance && item.maintenanceHours) {
      totalDuration = item.maintenanceHours; // 直接使用小時
    } else {
      // 使用卡片上的出量 (outputRate)，如果沒有設定則預設 50 kg/h
      const outputRate = item.outputRate || 50;
      totalDuration = outputRate > 0 
        ? item.quantity / outputRate 
        : 1;
    }
    
    // 2押或3押：時長乘以倍數（KG不變）
    if (item.is3Press) {
      totalDuration = totalDuration * 3;
    } else if (item.is2Press) {
      totalDuration = totalDuration * 2;
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
  // 權限檢查
  const { hasPermission, user, loading } = useAuth();
  const canEdit = hasPermission('canEdit');
  const canView = hasPermission('canView');

  // 調試日誌：確認權限檢查是否正確
  useEffect(() => {
    console.log('🔍 [Swimlane] 權限檢查 - canEdit:', canEdit, 'user.role:', user?.role);
  }, [canEdit, user?.role]);

  // 使用資料庫 Hook（自動載入和儲存）
  // 注意：不使用 initialItems（模擬資料），讓 useScheduleData 從資料庫載入
  const {
    items: dbItems,
    isLoading: isDataLoading,
    isSaving,
    updateItems: saveScheduleItems,
    deleteItem: deleteScheduleItem,
    loadData: reloadScheduleData,
  } = useScheduleData([]); // 傳入空陣列，強制從資料庫載入

  // 本地狀態管理（用於即時更新 UI）
  // 初始值設為空陣列，等待資料庫載入完成
  const [localItems, setLocalItems] = useState<ScheduleItem[]>([]);
  const [history, setHistory] = useState<ScheduleItem[][]>([]); // 歷史記錄 (用於回上一步)

  // 同步資料庫資料到本地狀態
  const [isDeleting, setIsDeleting] = useState(false); // 標記是否正在刪除，避免刪除時被同步覆蓋
  const [isImporting, setIsImporting] = useState(false); // 標記是否正在匯入，避免匯入時被同步覆蓋
  const [isClearing, setIsClearing] = useState(false); // 標記是否正在清除，避免清除時被同步覆蓋
  useEffect(() => {
    if (!isDataLoading && !isDeleting && !isImporting && !isClearing) {
      // 優先使用資料庫的資料，確保是陣列
      // 但如果在刪除或匯入過程中，不要同步（避免覆蓋本地狀態）
      // 只有在 dbItems 和 localItems 不同時才同步，避免不必要的更新
      setLocalItems((prev) => {
        const dbItemsArray = Array.isArray(dbItems) ? dbItems : [];
        // 如果 dbItems 和 prev 相同，不更新（避免不必要的重新渲染）
        if (dbItemsArray.length === prev.length && 
            dbItemsArray.every((item, index) => item.id === prev[index]?.id)) {
          return prev;
        }
        
        // 如果 prev 是空陣列，但 dbItems 有資料，應該使用 dbItems（從資料庫載入的資料）
        // 這通常發生在首次載入或重新整理時
        if (prev.length === 0 && dbItemsArray.length > 0) {
          console.log('✅ 本地狀態為空，使用資料庫資料（', dbItemsArray.length, '筆）');
          // 載入時執行碰撞檢測，修正所有重疊的卡片
          const fixedItems = fixAllOverlaps(dbItemsArray);
          return fixedItems;
        }
        
        // 如果 prev 的項目數少於 dbItems，可能是因為刪除操作
        // 檢查 prev 中的項目是否都在 dbItems 中
        if (prev.length < dbItemsArray.length && prev.length > 0) {
          const prevIds = new Set(prev.map(item => item.id));
          const missingInDb = dbItemsArray.filter(item => !prevIds.has(item.id));
          // 如果 dbItems 包含 prev 中沒有的項目，可能是重新載入時載入到舊資料
          // 在這種情況下，我們應該使用 prev（本地狀態），因為它已經反映了刪除操作
          if (missingInDb.length > 0) {
            console.warn('⚠️ 檢測到 dbItems 包含本地狀態中沒有的項目，可能是重新載入時載入到舊資料，使用本地狀態');
            console.warn('本地狀態項目數:', prev.length, 'dbItems 項目數:', dbItemsArray.length);
            console.warn('dbItems 中多出的項目:', missingInDb.map(item => item.id));
            return prev; // 使用本地狀態，避免其他卡片出現
          }
        }
        
        // 如果 dbItems 是空陣列，但 prev 不是空陣列，可能是資料庫載入錯誤或刪除後狀態不一致
        // 在這種情況下，我們應該使用 prev（本地狀態），避免所有卡片消失
        if (dbItemsArray.length === 0 && prev.length > 0) {
          console.warn('⚠️ 檢測到 dbItems 為空陣列，但本地狀態有資料，可能是資料庫載入錯誤或狀態不一致，使用本地狀態');
          return prev; // 使用本地狀態，避免所有卡片消失
        }
        
        // 如果 prev 的項目數多於 dbItems，可能是因為刪除操作後 dbItems 還沒更新
        // 在這種情況下，我們應該使用 prev（本地狀態），因為它已經反映了刪除操作
        if (prev.length > dbItemsArray.length && prev.length > 0) {
          const prevIds = new Set(prev.map(item => item.id));
          const missingInPrev = dbItemsArray.filter(item => !prevIds.has(item.id));
          // 如果 dbItems 包含 prev 中沒有的項目，可能是舊資料
          // 但如果 dbItems 的項目數少於 prev，可能是刪除後 dbItems 還沒更新
          if (missingInPrev.length === 0) {
            // dbItems 的所有項目都在 prev 中，但 prev 有更多項目
            // 這表示 prev 已經反映了刪除操作，而 dbItems 還沒更新
            console.warn('⚠️ 檢測到本地狀態項目數多於 dbItems，可能是刪除後 dbItems 還沒更新，使用本地狀態');
            return prev; // 使用本地狀態，避免卡片消失
          }
        }
        
        return dbItemsArray;
      });
    }
  }, [dbItems, isDataLoading, isDeleting, isImporting, isClearing]);

  // 包裝的更新函數：先更新本地狀態，然後非同步儲存到資料庫
  // 注意：當 isApplyingRealtimeChangeRef.current 為 true 時，不應該調用此函數
  // （因為 Realtime 變更時已經直接更新了 localItems）
  const setScheduleItems = (updater: ScheduleItem[] | ((prev: ScheduleItem[]) => ScheduleItem[])) => {
    // 如果正在應用 Realtime 變更，不應該手動觸發保存（避免循環）
    if (isApplyingRealtimeChangeRef.current) {
      console.warn('⚠️ 正在應用 Realtime 變更，跳過手動保存以避免循環');
      return;
    }
    
    setLocalItems((prev) => {
      const newItems = typeof updater === 'function' ? updater(prev) : updater;
      // 非同步儲存到資料庫（不阻塞 UI）
      // 這會觸發 Supabase Realtime 事件，其他分頁會收到變更
      saveScheduleItems(newItems).catch((err) => {
        console.error('自動儲存失敗:', err);
      });
      return newItems;
    });
  };

  // 使用本地狀態進行渲染（確保 UI 即時更新）
  const scheduleItems = localItems;
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  // 從 localStorage 載入產線設定（只在客戶端）
  const [lineConfigs, setLineConfigs] = useState<Record<string, LineConfig>>(DEFAULT_LINE_CONFIGS);
  
  // 在客戶端載入保存的設定
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('factory_line_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合併保存的設定和預設設定，確保所有產線都有設定
        setLineConfigs({ ...DEFAULT_LINE_CONFIGS, ...parsed });
      }
    } catch (error) {
      console.error('載入產線設定失敗:', error);
    }
  }, []);
  const [viewMode, setViewMode] = useState<"card" | "timeline">("timeline");
  const [dropPreview, setDropPreview] = useState<{ lineId: string; hour: number } | null>(null);
  const [cardDayRange, setCardDayRange] = useState<1 | 15 | 30 | 31>(1); // 卡片模式的日期範圍
  
  // Google Sheets QC 狀態連動
  // 從環境變數取得 Google Sheet ID，或使用預設值
  // 注意：API Key 現在在伺服器端的 API Route 中，不再暴露在客戶端
  const googleSheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID || '';
  // googleApiKey 參數已移除，不再從客戶端傳遞（API Route 會從伺服器端環境變數獲取）
  const { getBatchQCStatus, qcData, isLoading: isQCLoading, error: qcError } = useQCStatus(scheduleItems, googleSheetId);
  
  // 建議排程
  const { getSuggestedSchedule, importSchedules } = useSuggestedSchedule();
  
  // 即時同步排程資料（跨分頁/跨裝置同步）
  // 使用 ref 來追蹤是否正在應用 Realtime 變更，避免循環保存
  const isApplyingRealtimeChangeRef = useRef(false);
  
  const { isSubscribed } = useRealtimeSchedule({
    enabled: true,
    onScheduleChange: (items) => {
      // 標記正在應用 Realtime 變更，避免觸發保存循環
      isApplyingRealtimeChangeRef.current = true;
      
      console.log('🔄 [Realtime] 收到即時變更，更新本地狀態，共', items.length, '筆');
      console.log('📝 變更來源：其他分頁/裝置');
      
      // 清除快取，確保下次載入時使用最新資料（特別是 viewer 用戶）
      clearScheduleCache();
      
      // 直接更新本地狀態（不觸發 setScheduleItems，避免循環保存）
      setLocalItems(items);
      
      // 同時更新 useScheduleData 的內部狀態（通過 reloadScheduleData）
      // 但使用 setTimeout 延遲執行，避免與當前更新衝突
      setTimeout(() => {
        reloadScheduleData();
      }, 100);
      
      // 同時更新 useScheduleData 的內部狀態，確保一致性
      // 但不觸發保存（因為資料已經在資料庫中了）
      
      // 同步更新 localStorage（作為備用，但不同瀏覽器會不同，所以僅作為備用）
      try {
        localStorage.setItem('factory_schedule_items', JSON.stringify(items));
      } catch (err) {
        console.warn('⚠️ 更新 localStorage 失敗:', err);
      }
      
      // 重置標記（使用 setTimeout 確保在下一個事件循環中重置）
      setTimeout(() => {
        isApplyingRealtimeChangeRef.current = false;
      }, 1000);
    },
    onError: (error) => {
      console.error('❌ 即時同步錯誤:', error);
      console.error('💡 提示：請檢查 Supabase Dashboard > Database > Replication 是否已啟用 schedule_items 表的 Realtime');
      console.error('💡 或者執行 SQL: ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;');
    },
  });

  // 顯示即時同步狀態（用於調試）
  useEffect(() => {
    if (isSubscribed) {
      console.log('✅ 即時同步已啟用，多分頁變更會自動同步（約 1-2 秒延遲）');
    } else {
      console.warn('⚠️ 即時同步未啟用');
      console.warn('💡 請檢查：1. Supabase Dashboard > Database > Replication > 啟用 schedule_items 的 Realtime');
      console.warn('💡 請檢查：2. 網路連線是否正常');
      console.warn('💡 請檢查：3. 重新整理頁面後再試');
    }
  }, [isSubscribed]);
  
  // 載入存檔
  const handleLoadSnapshot = useCallback((items: ScheduleItem[], configs: Record<string, LineConfig>) => {
    saveHistory();
    setScheduleItems(items);
    setLineConfigs(configs);

    // 訪客不保存到資料庫，避免觸發任何認證狀態更新
    if (!canEdit || user?.role === 'viewer') {
      console.log('ℹ️ 訪客載入存檔，不保存到資料庫');
      return;
    }
    
    // 等待認證狀態完全穩定後再保存到資料庫
    // 避免在認證初始化期間觸發認證狀態變化導致角色變成 operator
    const waitForAuthStable = async () => {
      let attempts = 0;
      const maxAttempts = 20; // 最多等待 10 秒（20 * 500ms）
      
      while (attempts < maxAttempts) {
        // 檢查認證狀態是否已穩定（用戶已設置且不是 loading）
        if (user && !loading && user.role) {
          console.log('✅ 認證狀態已穩定，開始保存快照到資料庫，角色:', user.role);
          // 再等待 1 秒確保完全穩定
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            await saveScheduleItems(items);
            console.log('✅ 快照已保存到資料庫');
          } catch (err) {
            console.error('載入存檔後保存到資料庫失敗:', err);
          }
          return;
        }
        
        // 等待 500ms 後再檢查
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      // 如果超時，仍然嘗試保存（但記錄警告）
      console.warn('⚠️ 等待認證狀態穩定超時，仍嘗試保存快照到資料庫');
      try {
        await saveScheduleItems(items);
        console.log('✅ 快照已保存到資料庫（超時後）');
      } catch (err) {
        console.error('載入存檔後保存到資料庫失敗:', err);
      }
    };
    
    waitForAuthStable();
  }, [saveScheduleItems, user, loading, canEdit]);

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

  // 已移除：應用啟動時詢問是否載入存檔的功能
  // 原因：點擊「確定」載入存檔會導致訪客角色變成操作員
  // 現在排程資料直接從 Supabase 資料庫載入，不再依賴 localStorage 存檔
  // 如果需要手動載入存檔，操作員可以透過左側「存檔管理」按鈕載入
  
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
    
    let duration: number;
    
    // 清機流程：分鐘轉小時
    if (item.isCleaningProcess && item.cleaningType) {
      duration = CLEANING_PROCESS_DURATION[item.cleaningType] / 60;
    } else if (item.isMaintenance && item.maintenanceHours) {
      // 故障維修：使用 maintenanceHours
      duration = item.maintenanceHours;
    } else {
      // 使用卡片上的出量 (outputRate)，如果沒有設定則預設 50 kg/h
      const outputRate = item.outputRate || 50;
      if (outputRate <= 0) return 1;
      duration = item.quantity / outputRate;
    }
    
    // 2押或3押：時長乘以倍數（KG不變）
    if (item.is3Press) {
      duration = duration * 3;
    } else if (item.is2Press) {
      duration = duration * 2;
    }
    
    return duration;
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
      if (draggedItem) {
        // 構建更詳細的確認訊息
        let confirmMessage = `確定要刪除此卡片嗎？\n\n`;
        if (draggedItem.materialDescription) {
          confirmMessage += `類型：${draggedItem.materialDescription}\n`;
        }
        confirmMessage += `產品：${draggedItem.productName}\n`;
        confirmMessage += `批號：${draggedItem.batchNumber}\n`;
        if (draggedItem.quantity) {
          confirmMessage += `數量：${draggedItem.quantity} KG`;
        }
        
        if (window.confirm(confirmMessage)) {
          saveHistory();
          // 標記正在刪除，避免 useEffect 同步覆蓋
          setIsDeleting(true);
          
          // 先更新本地狀態（立即更新 UI）
          const filteredItems = scheduleItems.filter((item) => item.id !== draggedItemId);
          setLocalItems(filteredItems);
          
          // 同時更新 localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('factory_schedule_items', JSON.stringify(filteredItems));
            } catch (err) {
              console.error('更新 localStorage 失敗:', err);
            }
          }
          
          // 直接從資料庫刪除，然後重新載入資料以確保同步
          (async () => {
            try {
              let deleteSuccess = false;
              if (supabase) {
                const { error } = await supabase
                  .from(TABLES.SCHEDULE_ITEMS)
                  .delete()
                  .eq('id', draggedItemId);
                if (error) {
                  console.error('刪除失敗:', error);
                  alert('刪除失敗，請檢查網路連線');
                } else {
                  deleteSuccess = true;
                }
              } else {
                // 如果沒有 Supabase，直接標記為成功（使用 localStorage）
                deleteSuccess = true;
              }
              
              if (deleteSuccess) {
                console.log(`✅ 成功刪除卡片: ${draggedItemId}`);
                // 不調用 saveScheduleItems，因為它可能會失敗（例如欄位不存在）
                // 而且即使失敗，我們也無法確保 dbItems 會正確更新
                // 相反，我們直接保持 localItems 的狀態，並在同步邏輯中保護它
                
                // 刪除完成後，延遲重置標記，確保所有狀態更新完成
                // 在重置標記前，useEffect 不會同步 dbItems 到 localItems（因為 isDeleting 為 true）
                setTimeout(() => {
                  setIsDeleting(false);
                  // 重置標記後，useEffect 會同步 dbItems 到 localItems
                  // 但同步邏輯會保護 localItems，如果 dbItems 是空陣列或包含舊資料，不會覆蓋 localItems
                }, 500);
              } else {
                // 刪除失敗時，恢復本地狀態
                setLocalItems(scheduleItems);
                setIsDeleting(false);
              }
            } catch (err) {
              console.error('刪除失敗:', err);
              alert('刪除失敗，請檢查控制台錯誤訊息');
              // 刪除失敗時，恢復本地狀態
              setLocalItems(scheduleItems);
              setIsDeleting(false);
            }
          })();
        }
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

    // 混合缸卡片只能排到指定的產線
    if (draggedItem.materialDescription === "混合缸排程") {
      // 允許退回未排程區
      if (targetLineId === UNSCHEDULED_LANE.id) {
        // 允許，繼續執行
      } else if (!MIX_TANK_ALLOWED_LINES.includes(targetLineId as typeof MIX_TANK_ALLOWED_LINES[number])) {
        // 不允許的產線，提示並阻止
        const targetLine = PRODUCTION_LINES.find(line => line.id === targetLineId);
        const allowedLineNames = MIX_TANK_ALLOWED_LINES.map(id => {
          const line = PRODUCTION_LINES.find(l => l.id === id);
          return line?.name || id;
        }).join("、");
        alert(`混合缸卡片只能排到以下產線：${allowedLineNames}\n\n無法排到「${targetLine?.name || targetLineId}」`);
        return;
      }
    }

    // 生產排程卡片不能排到混合缸專用產線（故障維修卡片除外）
    if (draggedItem.materialDescription !== "混合缸排程" && 
        !draggedItem.isMaintenance &&
        targetLineId !== UNSCHEDULED_LANE.id &&
        MIX_TANK_ALLOWED_LINES.includes(targetLineId as typeof MIX_TANK_ALLOWED_LINES[number])) {
      // 不允許的產線，提示並阻止
      const targetLine = PRODUCTION_LINES.find(line => line.id === targetLineId);
      const restrictedLineNames = MIX_TANK_ALLOWED_LINES.map(id => {
        const line = PRODUCTION_LINES.find(l => l.id === id);
        return line?.name || id;
      }).join("、");
      alert(`生產排程卡片不能排到以下產線：${restrictedLineNames}\n\n這些產線僅供混合缸卡片和故障維修使用\n\n無法排到「${targetLine?.name || targetLineId}」`);
      return;
    }

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
    
    // 清機流程：分鐘轉小時，故障維修：使用 maintenanceHours，一般訂單：根據卡片出量計算
    let draggedDuration: number;
    if (draggedItem.isCleaningProcess && draggedItem.cleaningType) {
      draggedDuration = CLEANING_PROCESS_DURATION[draggedItem.cleaningType] / 60;
    } else if (draggedItem.isMaintenance && draggedItem.maintenanceHours) {
      draggedDuration = draggedItem.maintenanceHours;
    } else {
      // 使用卡片上的出量 (outputRate)，如果沒有設定則預設 50 kg/h
      const outputRate = draggedItem.outputRate || 50;
      draggedDuration = outputRate > 0 
        ? draggedItem.quantity / outputRate 
        : 1;
    }
    
    // 2押或3押：時長乘以倍數（KG不變）
    if (draggedItem.is3Press) {
      draggedDuration = draggedDuration * 3;
    } else if (draggedItem.is2Press) {
      draggedDuration = draggedDuration * 2;
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
    if (!importedItems || importedItems.length === 0) {
      console.warn('沒有可匯入的項目');
      return;
    }
    
    saveHistory();
    
    // 標記正在匯入，避免 useEffect 同步覆蓋
    setIsImporting(true);
    
    try {
      // 使用函數式更新確保獲取最新的 localItems
      let newItems: ScheduleItem[] = [];
      setLocalItems((prevItems) => {
        // 合併現有項目和匯入的項目（避免重複批號）
        const existingBatchIds = new Set(prevItems.map(item => item.batchNumber));
        newItems = [
          ...prevItems,
          ...importedItems.filter(item => !existingBatchIds.has(item.batchNumber))
        ];
        
        // 同時更新 localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('factory_schedule_items', JSON.stringify(newItems));
          } catch (err) {
            console.error('更新 localStorage 失敗:', err);
          }
        }
        
        return newItems;
      });
      
      // 明確儲存到資料庫（確保資料持久化）
      // 注意：由於 setLocalItems 是異步的，我們需要等待一下確保 newItems 已設置
      // 但實際上，由於我們在 setLocalItems 的回調中設置了 newItems，它應該已經可用
      if (newItems.length > 0) {
        try {
          await saveScheduleItems(newItems);
          console.log(`✅ 成功匯入 ${importedItems.length} 筆資料並儲存到 Supabase`);
        } catch (err) {
          console.error('❌ 匯入資料儲存失敗:', err);
          console.warn('⚠️ 匯入資料儲存到 Supabase 失敗，但已儲存到本地 localStorage');
          // 即使 Supabase 儲存失敗，資料仍會存在 localStorage 中
        }
      } else {
        console.warn('沒有新項目需要保存');
      }
    } catch (err) {
      console.error('❌ 匯入失敗:', err);
      alert('匯入失敗，請檢查控制台錯誤訊息');
    } finally {
      // 匯入完成後，重置標記
      setIsImporting(false);
    }
  };

  const handleAddItem = (item: ScheduleItem) => {
    saveHistory();
    setScheduleItems((prev) => {
      const newItems = [...prev, item];
      // 如果新增的卡片有排程日期和開始時間，觸發碰撞檢測
      if (item.scheduleDate && item.startHour !== undefined && item.lineId && item.lineId !== UNSCHEDULED_LANE.id) {
        return rearrangeLineItems(newItems, item.lineId, item.scheduleDate);
      }
      return newItems;
    });
  };

  const handleClear = async () => {
    saveHistory();
    
    // 標記正在清除，避免 useEffect 同步覆蓋
    setIsClearing(true);
    
    try {
      // 先更新本地狀態（立即更新 UI）
      setLocalItems([]);
      
      // 同時更新 localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('factory_schedule_items', JSON.stringify([]));
        } catch (err) {
          console.error('更新 localStorage 失敗:', err);
        }
      }
      
      // 從資料庫刪除所有項目
      if (supabase) {
        // 先獲取所有項目的 ID，然後批量刪除
        const { data: allItems, error: fetchError } = await supabase
          .from(TABLES.SCHEDULE_ITEMS)
          .select('id');
        
        if (fetchError) {
          console.error('獲取資料庫項目失敗:', fetchError);
        } else if (allItems && allItems.length > 0) {
          // 批量刪除所有項目
          const ids = allItems.map(item => item.id);
          const { error: deleteError } = await supabase
            .from(TABLES.SCHEDULE_ITEMS)
            .delete()
            .in('id', ids);
          
          if (deleteError) {
            console.error('清除資料庫失敗:', deleteError);
            // 即使資料庫清除失敗，本地狀態已經清除
          } else {
            console.log(`✅ 成功清除資料庫中的 ${ids.length} 筆資料`);
          }
        } else {
          console.log('✅ 資料庫中沒有資料需要清除');
        }
      }
      
      // 同時使用 saveScheduleItems 確保資料庫狀態一致
      try {
        await saveScheduleItems([]);
        console.log('✅ 已同步清除狀態到資料庫');
      } catch (err) {
        console.error('同步清除狀態失敗:', err);
        // 即使同步失敗，本地狀態已經清除
      }
      
      // 清除完成後，延遲重置標記，確保所有狀態更新完成
      setTimeout(() => {
        setIsClearing(false);
      }, 500);
    } catch (err) {
      console.error('清除失敗:', err);
      setIsClearing(false);
    }
  };

  const handleConfigUpdate = (lineId: string, avgOutput: number) => {
    setLineConfigs((prev) => {
      const updated = {
        ...prev,
        [lineId]: { ...prev[lineId], avgOutput },
      };
      // 保存到 localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('factory_line_configs', JSON.stringify(updated));
        } catch (error) {
          console.error('保存產線設定失敗:', error);
        }
      }
      return updated;
    });
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

  // 切換2押狀態（與3押互斥）
  const handleToggle2Press = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          // 如果勾選2押，取消3押；如果取消2押，保持3押不變
          return { ...item, is2Press: !item.is2Press, is3Press: item.is2Press ? false : item.is3Press };
        }
        return item;
      })
    );
  };

  // 切換3押狀態（與2押互斥）
  const handleToggle3Press = (itemId: string) => {
    saveHistory();
    setScheduleItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          // 如果勾選3押，取消2押；如果取消3押，保持2押不變
          return { ...item, is3Press: !item.is3Press, is2Press: item.is3Press ? false : item.is2Press };
        }
        return item;
      })
    );
  };

  // 更改數量
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    saveHistory();
    setScheduleItems((prev) => {
      // 先更新數量
      const updatedItems = prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      );
      
      // 找到被修改的卡片
      const changedItem = updatedItems.find((item) => item.id === itemId);
      if (!changedItem || !changedItem.scheduleDate || changedItem.startHour === undefined) {
        return updatedItems;
      }
      
      // 計算新的時長
      const outputRate = changedItem.outputRate || 50;
      let newDuration = outputRate > 0 ? newQuantity / outputRate : 1;
      if (changedItem.is3Press) newDuration *= 3;
      else if (changedItem.is2Press) newDuration *= 2;
      
      // 處理碰撞
      return resolveCollisionsAfterChange(
        updatedItems,
        itemId,
        changedItem.lineId,
        changedItem.scheduleDate,
        changedItem.startHour,
        newDuration
      );
    });
  };

  // 更改出量
  const handleOutputRateChange = (itemId: string, newOutputRate: number) => {
    saveHistory();
    setScheduleItems((prev) => {
      // 先更新出量
      const updatedItems = prev.map((item) =>
        item.id === itemId
          ? { ...item, outputRate: newOutputRate }
          : item
      );
      
      // 找到被修改的卡片
      const changedItem = updatedItems.find((item) => item.id === itemId);
      if (!changedItem || !changedItem.scheduleDate || changedItem.startHour === undefined) {
        return updatedItems;
      }
      
      // 計算新的時長
      let newDuration = newOutputRate > 0 ? changedItem.quantity / newOutputRate : 1;
      if (changedItem.is3Press) newDuration *= 3;
      else if (changedItem.is2Press) newDuration *= 2;
      
      // 處理碰撞
      return resolveCollisionsAfterChange(
        updatedItems,
        itemId,
        changedItem.lineId,
        changedItem.scheduleDate,
        changedItem.startHour,
        newDuration
      );
    });
  };

  // 更改齊料時間
  const handleMaterialReadyDateChange = (itemId: string, newDate: string) => {
    saveHistory();
    const updatedItem = scheduleItems.find((i) => i.id === itemId);
    if (!updatedItem) return;

    // 如果是混合缸卡片，同步到所有相同批號的卡片
    const shouldSync = updatedItem.materialDescription === "混合缸排程";
    
    // 更新狀態並保存到資料庫
    setScheduleItems((prev) => {
      const newItems = prev.map((item) => {
        if (item.id === itemId) {
          // 更新當前卡片
          return { ...item, materialReadyDate: newDate || undefined };
        } else if (shouldSync && item.batchNumber === updatedItem.batchNumber) {
          // 混合缸卡片：同步到所有相同批號的卡片
          console.log('🔄 同步齊料時間:', {
            from: updatedItem.batchNumber,
            to: item.batchNumber,
            itemId: item.id,
            productName: item.productName,
            newDate
          });
          return { ...item, materialReadyDate: newDate || undefined };
        }
        return item;
      });
      
      if (shouldSync) {
        const syncedCount = newItems.filter(
          (item) => item.batchNumber === updatedItem.batchNumber && item.id !== itemId
        ).length;
        console.log('✅ 混合缸齊料時間同步完成:', {
          batchNumber: updatedItem.batchNumber,
          syncedCount,
          newDate
        });
      }
      
      // 保存到資料庫（使用更新後的狀態）
      saveScheduleItems(newItems).catch((err) => {
        console.error('保存齊料時間失敗:', err);
      });
      
      return newItems;
    });
  };

  // 更改維修時長
  const handleMaintenanceHoursChange = (itemId: string, hours: number) => {
    saveHistory();
    setScheduleItems((prev) => {
      const updatedItems = prev.map((item) =>
        item.id === itemId
          ? { 
              ...item, 
              maintenanceHours: hours,
              quantity: hours * 60, // 更新 quantity (分鐘)
              materialDescription: `${hours} 小時`
            }
          : item
      );
      
      // 找到被修改的項目，觸發碰撞檢測
      const changedItem = updatedItems.find((item) => item.id === itemId);
      if (changedItem && changedItem.scheduleDate && changedItem.startHour !== undefined && changedItem.lineId) {
        return rearrangeLineItems(updatedItems, changedItem.lineId, changedItem.scheduleDate);
      }
      return updatedItems;
    });
  };

  // 未排程項目
  const unscheduledItems = scheduleItems.filter(
    (item) => item.lineId === UNSCHEDULED_LANE.id
  );

  // 計算已排程卡片的順序（按照24小時時間軸的順序）
  const scheduledItemOrder = useMemo(() => {
    if (!selectedDateStr) {
      console.log('📋 未選擇日期，無法計算排程順序');
      return [];
    }
    
    // 從所有產線收集已排程的卡片，按照時間順序排列
    const scheduledBlocks: Array<{ productName: string; startHour: number; lineId: string }> = [];
    
    for (const line of PRODUCTION_LINES) {
      const blocks = getBlocksForDate(scheduleItems, line.id, selectedDateStr, lineConfigs);
      for (const block of blocks) {
        // 只取當天開始的區塊（不包含跨日延續的）
        if (!block.isCarryOver) {
          scheduledBlocks.push({
            productName: block.item.productName,
            startHour: block.displayStartHour,
            lineId: line.id,
          });
        }
      }
    }
    
    // 按照時間順序排序
    scheduledBlocks.sort((a, b) => {
      // 先按時間排序
      if (a.startHour !== b.startHour) {
        return a.startHour - b.startHour;
      }
      // 時間相同時，按產線ID排序（保持穩定性）
      return a.lineId.localeCompare(b.lineId);
    });
    
    // 提取 productName 的前綴（例如 MO、PE、AC），並去重
    const prefixOrder: string[] = [];
    const seenPrefixes = new Set<string>();
    
    for (const block of scheduledBlocks) {
      // 提取前兩個字母作為前綴（例如 MO13425033 -> MO）
      const match = block.productName.match(/^([A-Z]{2})/);
      if (match) {
        const prefix = match[1];
        if (!seenPrefixes.has(prefix)) {
          prefixOrder.push(prefix);
          seenPrefixes.add(prefix);
        }
      }
    }
    
    console.log('📋 已排程卡片順序:', {
      date: selectedDateStr,
      totalBlocks: scheduledBlocks.length,
      prefixOrder,
      blocks: scheduledBlocks.map(b => ({
        prefix: b.productName.match(/^([A-Z]{2})/)?.[1] || '?',
        productName: b.productName,
        hour: b.startHour,
        lineId: b.lineId,
      })),
    });
    
    return prefixOrder;
  }, [scheduleItems, selectedDateStr, lineConfigs]);

  // 取得日期範圍內的日期字串陣列
  const getDateRange = (days: 1 | 15 | 30 | 31): string[] => {
    if (!selectedDay) return [];
    const dates: string[] = [];
    
    if (days === 1) {
      // 1日：只顯示選中日期當天的卡片
      const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    } else if (days === 15) {
      // 15日：顯示 1-15 日的所有卡片
      for (let day = 1; day <= 15; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }
    } else {
      // 30日或31日：顯示當月 1 日到最後一日的所有卡片
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }
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
  const getLineItemsForDateRange = (lineId: string, days: 1 | 15 | 30 | 31) => {
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
      // NG修色不計入產量
      if (item.materialDescription === "NG修色") return false;
      // 清機流程不計入產量
      if (item.isCleaningProcess) return false;
      // 故障維修不計入產量
      if (item.isMaintenance) return false;
      // 不計入產量與排程的產線不計入統計
      if (NON_CAPACITY_LINES.includes(item.lineId as typeof NON_CAPACITY_LINES[number])) return false;
      const [y, m] = item.scheduleDate.split("-").map(Number);
      return y === selectedYear && m === selectedMonth;
    })
    .reduce((sum, item) => sum + item.quantity, 0);

  // 計算選擇日期當天 24 小時內可完成的數量（根據時長和產能計算）
  const totalScheduledToday = useMemo(() => {
    if (!selectedDateStr) return 0;
    
    let total = 0;
    for (const line of PRODUCTION_LINES) {
      const blocks = getBlocksForDate(scheduleItems, line.id, selectedDateStr, lineConfigs);
      const config = lineConfigs[line.id];
      
      // 不計入產量與排程的產線不計入統計
      if (NON_CAPACITY_LINES.includes(line.id as typeof NON_CAPACITY_LINES[number])) continue;
      
      for (const block of blocks) {
        // 清機流程不計入 KG
        if (block.item.isCleaningProcess) continue;
        // 故障維修不計入 KG
        if (block.item.isMaintenance) continue;
        // NG修色不計入產量
        if (block.item.materialDescription === "NG修色") continue;
        // 異常未完成不計入 KG
        if (block.item.isAbnormalIncomplete) continue;
        
        // 根據當天顯示的時長計算可完成數量（使用卡片上的出量）
        const outputRate = block.item.outputRate || 50;
        if (outputRate > 0) {
          const dayQuantity = block.displayDuration * outputRate;
          total += dayQuantity;
        } else {
          // 無出量設定時，只有完全在當天完成的才計入
          if (!block.isCarryOver && !block.isContinued) {
            total += block.item.quantity;
          }
        }
      }
    }
    return Math.round(total);
  }, [scheduleItems, selectedDateStr, lineConfigs]);

  // 計算當日完成產量（直接使用卡片上的數量，不根據時長計算）
  const totalCompletedToday = useMemo(() => {
    if (!selectedDateStr) return 0;
    
    // 收集當日已排程的項目ID（避免跨日項目重複計算）
    const processedItemIds = new Set<string>();
    let total = 0;
    
    for (const line of PRODUCTION_LINES) {
      // 不計入產量與排程的產線不計入統計
      if (NON_CAPACITY_LINES.includes(line.id as typeof NON_CAPACITY_LINES[number])) continue;
      
      const blocks = getBlocksForDate(scheduleItems, line.id, selectedDateStr, lineConfigs);
      
      for (const block of blocks) {
        // 只計算當天開始的項目（不計算跨日延續的部分）
        if (block.isCarryOver) continue;
        
        // 避免重複計算（同一個項目可能在不同產線或不同區塊中）
        if (processedItemIds.has(block.item.id)) continue;
        processedItemIds.add(block.item.id);
        
        // 清機流程不計入 KG
        if (block.item.isCleaningProcess) continue;
        // 故障維修不計入 KG
        if (block.item.isMaintenance) continue;
        // NG修色不計入產量
        if (block.item.materialDescription === "NG修色") continue;
        // 異常未完成不計入 KG
        if (block.item.isAbnormalIncomplete) continue;
        
        // 直接使用卡片上的數量
        total += block.item.quantity;
      }
    }
    return total;
  }, [scheduleItems, selectedDateStr, lineConfigs]);

  return (
    <DndContext
      sensors={canEdit ? sensors : []}  // viewer 無法拖曳：禁用所有 sensors
      onDragStart={canEdit ? handleDragStart : undefined}
      onDragMove={canEdit ? handleDragMove : undefined}
      onDragEnd={canEdit ? handleDragEnd : undefined}
    >
      <div className="flex h-[calc(100vh-120px)]">
        {/* 左側：未排程區域 - viewer 完全隱藏 */}
        {canEdit && (
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
          onToggle2Press={handleToggle2Press}
          onToggle3Press={handleToggle3Press}
          onQuantityChange={handleQuantityChange}
          onOutputRateChange={handleOutputRateChange}
          onMaterialReadyDateChange={handleMaterialReadyDateChange}
          onToggleAbnormalIncomplete={handleToggleAbnormalIncomplete}
          isDragging={activeItem !== null}
          onAddItem={handleAddItem}
          onUndo={handleUndo}
          canUndo={history.length > 0}
          getBatchQCStatus={getBatchQCStatus}
          scheduledItemOrder={scheduledItemOrder}
          onLoadSnapshot={handleLoadSnapshot}
          getSuggestedSchedule={getSuggestedSchedule}
          onImportSuggestedSchedule={importSchedules}
          onRefreshData={reloadScheduleData}
        />
        )}

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
              {viewMode === "card" && (() => {
                // 計算當月天數（30 或 31）
                const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                const monthEndDay = daysInMonth === 30 ? 30 : 31;
                
                // 日期範圍選項：1日, 15日, 30日或31日
                const dayRangeOptions: (1 | 15 | 30 | 31)[] = [1, 15, monthEndDay];
                
                return (
                  <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-3">
                    <span className="text-xs text-gray-500 mr-1">日期範圍:</span>
                    {dayRangeOptions.map((days) => (
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
                );
              })()}

              {selectedDay && (
                <span className="text-sm text-blue-400 font-medium">
                  {viewMode === "card" && cardDayRange > 1 ? (
                    // 卡片模式：顯示日期範圍
                    cardDayRange === 15 ? (
                      // 15日：顯示 1-15 日
                      <span>
                        📅 {selectedMonth}/1 ~ {selectedMonth}/15
                      </span>
                    ) : (
                      // 30日或31日：顯示當月 1 日到最後一日
                      <span>
                        📅 {selectedMonth}/1 ~ {selectedMonth}/{cardDayRange}
                      </span>
                    )
                  ) : (
                    // 時間軸模式或1日：顯示選中的日期
                    <span>
                      📅 {selectedMonth}/{selectedDay}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* 產能摘要 */}
            <div className="flex items-center gap-4 text-xs" suppressHydrationWarning>
              <div className="text-gray-400">
                月總產能: <span className="text-white font-medium" suppressHydrationWarning>{totalCapacity.toLocaleString()}</span> KG
              </div>
              <div className="text-gray-400">
                月已排程: <span className="text-emerald-400 font-medium" suppressHydrationWarning>{totalScheduledThisMonth.toLocaleString()}</span> KG
              </div>
              {selectedDay && (
                <>
                  <div className="text-gray-400">
                    當日已排產能: <span className="text-yellow-400 font-medium" suppressHydrationWarning>{totalScheduledToday.toLocaleString()}</span> KG
                  </div>
                  <div className="text-gray-400">
                    當日完成產量: <span className="text-orange-400 font-medium" suppressHydrationWarning>{totalCompletedToday.toLocaleString()}</span> KG
                  </div>
                </>
              )}
              <div className={`${totalCapacity - totalScheduledThisMonth >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                月剩餘: <span className="font-medium" suppressHydrationWarning>{(totalCapacity - totalScheduledThisMonth).toLocaleString()}</span> KG
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
                  let lineItems: ScheduleItem[] = [];
                  
                  if (viewMode === "card") {
                    // 卡片模式：使用與時間軸相同的邏輯來排序
                    // 使用 displayStartHour 來排序，確保與時間軸順序完全一致
                    const dateRange = getDateRange(cardDayRange);
                    const itemArray: Array<{ item: ScheduleItem; date: string; hour: number }> = [];
                    const seenIds = new Set<string>();
                    
                    // 收集日期範圍內的所有項目，保留 displayStartHour 信息
                    for (const dateStr of dateRange) {
                      const blocks = getBlocksForDate(scheduleItems, line.id, dateStr, lineConfigs);
                      for (const block of blocks) {
                        // 只取當天開始的區塊（不包含跨日延續的），並過濾清機流程和故障維修
                        if (!block.isCarryOver && !block.item.isCleaningProcess && !block.item.isMaintenance) {
                          if (!seenIds.has(block.item.id)) {
                            seenIds.add(block.item.id);
                            itemArray.push({
                              item: block.item,
                              date: dateStr,
                              hour: block.displayStartHour, // 使用 displayStartHour（與時間軸一致）
                            });
                          }
                        }
                      }
                    }
                    
                    // 按照日期和 displayStartHour 排序（與時間軸順序一致）
                    itemArray.sort((a, b) => {
                      // 先按日期排序
                      const dateCompare = a.date.localeCompare(b.date);
                      if (dateCompare !== 0) {
                        return dateCompare;
                      }
                      
                      // 日期相同時，按 displayStartHour 排序（與時間軸一致）
                      return a.hour - b.hour;
                    });
                    
                    // 提取排序後的項目
                    lineItems = itemArray.map(entry => entry.item);
                  } else {
                    // 時間軸模式：使用原有的邏輯
                    lineItems = getLineItemsForDate(line.id).filter(item => !item.isCleaningProcess && !item.isMaintenance);
                  }
                  
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
                        config={lineConfigs[line.id] || DEFAULT_LINE_CONFIGS[line.id] || { id: line.id, avgOutput: 100 }}
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
                      config={lineConfigs[line.id] || DEFAULT_LINE_CONFIGS[line.id] || { id: line.id, avgOutput: 100 }}
                      onConfigUpdate={handleConfigUpdate}
                      monthlyCapacity={monthlyCapacity}
                      onToggleCrystallization={handleToggleCrystallization}
                      onToggleCCD={handleToggleCCD}
                      onToggleDryblending={handleToggleDryblending}
                      onTogglePackage={handleTogglePackage}
                      onToggle2Press={handleToggle2Press}
                      onToggle3Press={handleToggle3Press}
                      onQuantityChange={handleQuantityChange}
                      onOutputRateChange={handleOutputRateChange}
                      onMaterialReadyDateChange={handleMaterialReadyDateChange}
                      onToggleAbnormalIncomplete={handleToggleAbnormalIncomplete}
                      getBatchQCStatus={getBatchQCStatus}
                      getSuggestedSchedule={getSuggestedSchedule}
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

// 計算卡片時長的輔助函數
function getItemDuration(item: ScheduleItem): number {
  let duration: number;
  if (item.isCleaningProcess && item.cleaningType) {
    duration = CLEANING_PROCESS_DURATION[item.cleaningType] / 60;
  } else if (item.isMaintenance && item.maintenanceHours) {
    duration = item.maintenanceHours;
  } else {
    const outputRate = item.outputRate || 50;
    duration = outputRate > 0 ? item.quantity / outputRate : 1;
  }
  if (item.is3Press) duration *= 3;
  else if (item.is2Press) duration *= 2;
  return duration;
}

// 計算日期與小時的絕對時間（以小時為單位，從某個基準日期開始）
function getAbsoluteHour(scheduleDate: string, startHour: number): number {
  // 使用 UTC 時間避免時區問題
  const date = new Date(`${scheduleDate}T00:00:00Z`);
  const baseDate = new Date('2020-01-01T00:00:00Z');
  const hoursDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60));
  return hoursDiff + startHour;
}

// 從絕對時間轉換回日期和小時
function fromAbsoluteHour(absoluteHour: number): { scheduleDate: string; startHour: number } {
  // 確保 absoluteHour 是正數
  if (absoluteHour < 0) {
    absoluteHour = 0;
  }
  
  // 向上取整以避免重疊（如果結束時間是 2.5，下一張卡片應該從 3 開始）
  const ceiledHour = Math.ceil(absoluteHour);
  
  const baseDate = new Date('2020-01-01T00:00:00Z');
  const totalMilliseconds = ceiledHour * 60 * 60 * 1000;
  const newDate = new Date(baseDate.getTime() + totalMilliseconds);
  
  // 使用 UTC 時間避免時區問題
  const year = newDate.getUTCFullYear();
  const month = String(newDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(newDate.getUTCDate()).padStart(2, '0');
  const scheduleDate = `${year}-${month}-${day}`;
  const startHour = newDate.getUTCHours();
  
  return { scheduleDate, startHour };
}

// 修正所有產線的重疊卡片（用於資料載入時）
function fixAllOverlaps(items: ScheduleItem[]): ScheduleItem[] {
  // 取得所有有排程的產線 ID
  const lineIdSet = new Set(
    items
      .filter((item) => item.lineId && item.scheduleDate && item.startHour !== undefined)
      .map((item) => item.lineId)
  );
  const lineIds = Array.from(lineIdSet);
  
  let result = items;
  
  // 對每條產線執行碰撞檢測
  for (const lineId of lineIds) {
    result = rearrangeLineItems(result, lineId, '');
  }
  
  // 檢查是否有修正
  const hasChanges = result.some((item, index) => {
    const original = items[index];
    return item.scheduleDate !== original.scheduleDate || item.startHour !== original.startHour;
  });
  
  if (hasChanges) {
    console.log('🔧 已修正重疊的卡片位置');
  }
  
  return result;
}

// 重新排列同產線的所有卡片，確保不重疊（考慮跨日）
function rearrangeLineItems(
  items: ScheduleItem[],
  targetLineId: string,
  triggerDate: string
): ScheduleItem[] {
  // 取得同產線的所有已排程項目
  const lineItems = items
    .filter((item) => 
      item.lineId === targetLineId && 
      item.scheduleDate &&
      item.startHour !== undefined
    )
    .map((item) => ({
      ...item,
      duration: getItemDuration(item),
      absoluteStart: getAbsoluteHour(item.scheduleDate!, item.startHour!)
    }))
    .sort((a, b) => a.absoluteStart - b.absoluteStart);

  if (lineItems.length === 0) return items;

  // 重新計算每張卡片的開始時間，確保不重疊
  const adjustedItems: Record<string, { scheduleDate: string; startHour: number }> = {};
  
  // 使用第一張卡片的結束時間作為初始值（向上取整避免重疊）
  let currentEnd = Math.ceil(lineItems[0].absoluteStart + lineItems[0].duration);

  // 從第二張卡片開始檢查
  for (let i = 1; i < lineItems.length; i++) {
    const item = lineItems[i];
    const itemStart = item.absoluteStart;
    
    // 如果卡片開始時間早於或等於當前結束時間，表示有重疊，需要調整
    // 使用 <= 而不是 < 來確保沒有任何重疊
    if (itemStart < currentEnd) {
      // 將此卡片移動到 currentEnd 位置
      const newPosition = fromAbsoluteHour(currentEnd);
      adjustedItems[item.id] = newPosition;
      // 更新 currentEnd 為調整後的結束時間（向上取整）
      currentEnd = Math.ceil(currentEnd + item.duration);
    } else {
      // 不需要調整，更新 currentEnd 為此卡片的結束時間（向上取整）
      currentEnd = Math.ceil(itemStart + item.duration);
    }
  }

  // 如果沒有需要調整的卡片，直接返回原陣列
  if (Object.keys(adjustedItems).length === 0) {
    return items;
  }

  return items.map((item) => {
    if (adjustedItems[item.id] !== undefined) {
      return { 
        ...item, 
        scheduleDate: adjustedItems[item.id].scheduleDate,
        startHour: adjustedItems[item.id].startHour 
      };
    }
    return item;
  });
}

// 處理碰撞：修改數量或出量後，重新排列所有卡片
function resolveCollisionsAfterChange(
  items: ScheduleItem[],
  changedId: string,
  targetLineId: string,
  scheduleDate: string,
  startHour: number,
  changedDuration: number
): ScheduleItem[] {
  return rearrangeLineItems(items, targetLineId, scheduleDate);
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
  return rearrangeLineItems(items, targetLineId, scheduleDate);
}
