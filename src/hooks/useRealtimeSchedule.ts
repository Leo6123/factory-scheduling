"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, TABLES, dbToScheduleItem } from '@/lib/supabase';
import { ScheduleItem } from '@/types/schedule';

interface UseRealtimeScheduleOptions {
  onScheduleChange?: (items: ScheduleItem[]) => void;
  onError?: (error: Error) => void;
  enabled?: boolean; // 是否啟用即時同步
}

/**
 * 即時同步排程資料的 Hook
 * 使用 Supabase Realtime 監聽 schedule_items 表的變更
 */
export function useRealtimeSchedule(options: UseRealtimeScheduleOptions = {}) {
  const {
    onScheduleChange,
    onError,
    enabled = true,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  // 事件節流：避免短時間內多個事件觸發多次查詢
  const eventThrottleRef = useRef<{ timer: NodeJS.Timeout | null; lastEvent: any }>({ timer: null, lastEvent: null });

  // 訂閱即時變更
  const subscribe = useCallback(() => {
    if (!enabled || !supabase || isSubscribed) {
      return;
    }

    try {
      console.log('🔔 開始訂閱 schedule_items 即時變更...');

      // 訂閱 schedule_items 表的所有變更
      const channel = supabase
        .channel('schedule_items_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // 監聽所有事件 (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: TABLES.SCHEDULE_ITEMS,
          },
          async (payload) => {
            console.log('📡 收到即時變更:', payload.eventType, payload);

            try {
              if (!supabase) {
                console.warn('⚠️ Supabase 未初始化，跳過即時同步');
                return;
              }

              // 優化：使用事件節流，避免短時間內多個事件觸發多次查詢
              // 這可以大幅減少 Egress 使用量（特別是批次操作時）
              
              // 清除之前的計時器
              if (eventThrottleRef.current.timer) {
                clearTimeout(eventThrottleRef.current.timer);
              }
              
              // 保存當前事件
              eventThrottleRef.current.lastEvent = payload;
              
              // 設置節流：1000ms 內只處理最後一個事件（避免批次操作時觸發大量查詢）
              eventThrottleRef.current.timer = setTimeout(async () => {
                const latestPayload = eventThrottleRef.current.lastEvent;
                if (!latestPayload) return;
                
                // 檢查 supabase 是否可用
                if (!supabase) {
                  console.warn('⚠️ Supabase 未初始化，跳過即時同步');
                  return;
                }
                
                try {
                  // 優化：只查詢需要的欄位，減少數據傳輸量
                  const selectFields = 'id, product_name, batch_number, quantity, line_id, schedule_date, start_hour, end_hour, created_at, updated_at, material_ready_date, recipe_items';
                  
                  if (latestPayload.eventType === 'INSERT' || latestPayload.eventType === 'UPDATE' || latestPayload.eventType === 'DELETE') {
                    // 對於所有變更事件，統一重新載入所有資料（但添加節流和優化查詢欄位）
                    // 注意：雖然可以進一步優化為增量更新，但為了保持向後兼容和簡化邏輯，暫時使用全量載入
                    // 節流機制已經大幅減少了查詢次數（批次操作時只查詢一次）
                    console.log(`📡 [Realtime] 處理 ${latestPayload.eventType} 事件（節流後）`);
                    
                    const { data, error } = await supabase
                      .from(TABLES.SCHEDULE_ITEMS)
                      .select(selectFields)
                      .order('created_at', { ascending: true });

                    if (error) {
                      console.error('❌ 載入變更後的資料失敗:', error);
                      if (onError) {
                        onError(new Error(`載入資料失敗: ${error.message}`));
                      }
                      return;
                    }

                    if (data && Array.isArray(data)) {
                      const items = data.map(dbToScheduleItem);
                      console.log(`✅ [Realtime] 已更新排程資料，共 ${items.length} 筆（節流優化後）`);
                      
                      if (onScheduleChange) {
                        onScheduleChange(items);
                      }
                    }
                  } else {
                    // 其他事件類型：重新載入所有資料
                    if (!supabase) {
                      console.warn('⚠️ Supabase 未初始化，跳過即時同步');
                      return;
                    }
                    console.log('⚠️ [Realtime] 未知事件類型，重新載入所有資料');
                    const { data, error } = await supabase
                      .from(TABLES.SCHEDULE_ITEMS)
                      .select(selectFields)
                      .order('created_at', { ascending: true });

                    if (error) {
                      console.error('❌ 載入變更後的資料失敗:', error);
                      if (onError) {
                        onError(new Error(`載入資料失敗: ${error.message}`));
                      }
                      return;
                    }

                    if (data && Array.isArray(data)) {
                      const items = data.map(dbToScheduleItem);
                      console.log('✅ [Realtime] 已更新排程資料，共', items.length, '筆');
                      
                      if (onScheduleChange) {
                        onScheduleChange(items);
                      }
                    }
                  }
                } catch (err) {
                  console.error('❌ [Realtime] 處理事件異常:', err);
                  if (onError) {
                    onError(err instanceof Error ? err : new Error('處理事件失敗'));
                  }
                }
              }, 1000); // 1000ms 節流，避免短時間內多個事件觸發多次查詢
              
              // 不等待節流計時器，立即返回（避免阻塞）
              return;
            } catch (err) {
              console.error('❌ 處理即時變更異常:', err);
              if (onError) {
                onError(err instanceof Error ? err : new Error('處理變更失敗'));
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 訂閱狀態:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsSubscribed(true);
            console.log('✅ 已成功訂閱 schedule_items 即時變更');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ 訂閱頻道錯誤');
            setIsSubscribed(false);
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ 訂閱超時');
            setIsSubscribed(false);
          } else if (status === 'CLOSED') {
            console.warn('🔒 訂閱已關閉');
            setIsSubscribed(false);
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error('❌ 訂閱即時變更失敗:', err);
      if (onError) {
        onError(err instanceof Error ? err : new Error('訂閱失敗'));
      }
    }
  }, [enabled, onScheduleChange, onError]);

  // 取消訂閱
  const unsubscribe = useCallback(() => {
    if (channelRef.current && supabase) {
      console.log('🔕 取消訂閱 schedule_items 即時變更');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
    }
  }, []);

  // 組件掛載時訂閱，卸載時取消
  // 注意：不要將 isSubscribed 加入依賴項，避免無限循環
  useEffect(() => {
    if (enabled && !isSubscribed) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled]); // 只依賴 enabled，不依賴 isSubscribed 和函數引用

  return {
    subscribe,
    unsubscribe,
    isSubscribed,
  };
}
