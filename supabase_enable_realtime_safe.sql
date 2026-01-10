-- ============================================
-- 安全地啟用 Realtime（即使已啟用也不會報錯）
-- ============================================
-- 此腳本會自動處理「已存在」的情況
-- ============================================

-- 1. 啟用 schedule_items 表的 Realtime（如果尚未啟用）
-- ============================================
DO $$
BEGIN
  -- 檢查是否已在 publication 中
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'schedule_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;
    RAISE NOTICE '✅ 已啟用 schedule_items 的 Realtime';
  ELSE
    RAISE NOTICE '✅ schedule_items 的 Realtime 已經啟用';
  END IF;
END $$;

-- 2. 啟用 line_configs 表的 Realtime（如果尚未啟用）
-- ============================================
DO $$
BEGIN
  -- 檢查是否已在 publication 中
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'line_configs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.line_configs;
    RAISE NOTICE '✅ 已啟用 line_configs 的 Realtime';
  ELSE
    RAISE NOTICE '✅ line_configs 的 Realtime 已經啟用';
  END IF;
END $$;

-- 3. 驗證 Realtime 狀態
-- ============================================
SELECT 
  tablename as 表名,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = t.tablename
    ) THEN '✅ Realtime 已啟用'
    ELSE '❌ Realtime 未啟用'
  END as 狀態
FROM (VALUES ('schedule_items'), ('line_configs')) AS t(tablename)
ORDER BY tablename;

-- ============================================
-- 執行說明：
-- ============================================
-- 1. 這個腳本不會因為「已存在」而報錯
-- 2. 如果表已啟用 Realtime，會顯示「已經啟用」的訊息
-- 3. 最後的驗證查詢會顯示所有表的 Realtime 狀態
-- ============================================
