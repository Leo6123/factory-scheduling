-- ============================================
-- 快速啟用 schedule_items 表的 Realtime
-- ============================================
-- 在 SQL Editor 中直接執行此腳本即可
-- ============================================

-- 1. 直接添加到 Realtime Publication
-- ============================================
-- 如果報錯 "relation does not exist"，表示 publication 不存在，需要通過 Dashboard UI 啟用

ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;

-- 如果有 line_configs 表，也一併啟用
ALTER PUBLICATION supabase_realtime ADD TABLE public.line_configs;

-- 2. 驗證是否成功
-- ============================================
SELECT 
  tablename,
  '✅ Realtime 已啟用' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('schedule_items', 'line_configs');

-- ============================================
-- 如果上面出現錯誤，請嘗試以下方法：
-- ============================================
-- 1. 在 Table Editor 中點擊「Definition」標籤
-- 2. 尋找「Realtime」或「Replication」選項
-- 3. 將開關切換為 ON
-- ============================================
