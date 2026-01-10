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

              // 重新載入所有排程項目
              const { data, error } = await supabase
                .from(TABLES.SCHEDULE_ITEMS)
                .select('*')
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
                console.log('✅ 已更新排程資料，共', items.length, '筆');
                
                if (onScheduleChange) {
                  onScheduleChange(items);
                }
              }
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
