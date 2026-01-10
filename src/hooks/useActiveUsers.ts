"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface ActiveUser {
  id: string;
  email: string;
  role: string;
  lastActiveAt: string;
}

/**
 * 追蹤和顯示活動用戶的 Hook
 */
export function useActiveUsers() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 更新當前用戶的活動時間
  const updateMyActivity = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 更新 user_profiles 的 last_active_at
      const { error } = await supabase
        .from('user_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.warn('⚠️ 更新活動時間失敗:', error);
      }
    } catch (err) {
      console.warn('⚠️ 更新活動時間異常:', err);
    }
  }, []);

  // 載入活動用戶列表（最近 5 分鐘內活躍）
  const loadActiveUsers = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, role, last_active_at')
        .gte('last_active_at', fiveMinutesAgo)
        .order('last_active_at', { ascending: false });

      if (error) {
        console.error('❌ 載入活動用戶失敗:', error);
        setActiveUsers([]);
        return;
      }

      if (data) {
        setActiveUsers(data.map(user => ({
          id: user.id,
          email: user.email,
          role: user.role,
          lastActiveAt: user.last_active_at,
        })));
      }
    } catch (err) {
      console.error('❌ 載入活動用戶異常:', err);
      setActiveUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 定期更新活動時間和載入活動用戶
  useEffect(() => {
    // 立即更新一次
    updateMyActivity();
    loadActiveUsers();

    // 每 30 秒更新一次活動時間
    updateIntervalRef.current = setInterval(() => {
      updateMyActivity();
      loadActiveUsers();
    }, 30000); // 30 秒

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [updateMyActivity, loadActiveUsers]);

  return {
    activeUsers,
    isLoading,
    updateMyActivity,
    refresh: loadActiveUsers,
  };
}
