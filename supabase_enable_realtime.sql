-- ============================================
-- 啟用 Supabase Realtime 功能
-- ============================================
-- 此腳本用於啟用 schedule_items 和 line_configs 表的即時同步
-- ============================================
-- 注意：此功能需要在 Supabase Dashboard 中手動啟用
-- 步驟：
-- 1. 前往 Supabase Dashboard > Database > Replication
-- 2. 找到 schedule_items 表，點擊「Enable Realtime」
-- 3. 找到 line_configs 表，點擊「Enable Realtime」
-- ============================================

-- 檢查 Realtime 是否已啟用
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename IN ('schedule_items', 'line_configs')
    ) THEN '✅ 已啟用'
    ELSE '❌ 未啟用（請在 Dashboard 中啟用）'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('schedule_items', 'line_configs');

-- ============================================
-- 添加活動用戶追蹤欄位
-- ============================================

-- 添加 last_active_at 欄位到 user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 創建索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active_at 
ON public.user_profiles(last_active_at DESC);

-- ============================================
-- 創建更新活動時間的函數（可選）
-- ============================================
-- 此函數可以在應用程式中調用，或通過觸發器自動更新

CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新當前用戶的活動時間
  UPDATE public.user_profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 驗證結果
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name = 'last_active_at';

-- ============================================
-- 使用說明：
-- ============================================
-- 1. 在 Supabase Dashboard 中啟用 Realtime：
--    - Database > Replication
--    - 啟用 schedule_items 和 line_configs 的 Realtime
--
-- 2. 在應用程式中使用 useRealtimeSchedule hook：
--    import { useRealtimeSchedule } from '@/hooks/useRealtimeSchedule';
--    
--    const { isSubscribed } = useRealtimeSchedule({
--      onScheduleChange: (items) => {
--        // 更新本地狀態
--        setScheduleItems(items);
--      },
--      onError: (error) => {
--        console.error('即時同步錯誤:', error);
--      },
--    });
--
-- 3. 顯示活動用戶：
--    import { useActiveUsers } from '@/hooks/useActiveUsers';
--    
--    const { activeUsers } = useActiveUsers();
--    // 顯示 activeUsers 列表
-- ============================================
