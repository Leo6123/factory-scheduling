-- ============================================
-- 簡單方法：啟用 schedule_items 表的 Realtime
-- ============================================
-- 直接在 SQL Editor 中執行此腳本即可
-- ============================================

-- 方法 1：直接添加到 Realtime Publication（推薦）
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;

-- 如果上面的命令成功，您會看到訊息：
-- "ALTER PUBLICATION"

-- 如果出現錯誤 "table "schedule_items" is already in publication "supabase_realtime""，
-- 表示 Realtime 已經啟用，可以忽略此錯誤。

-- ============================================
-- 同時啟用 line_configs 表（如果需要）
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.line_configs;

-- ============================================
-- 驗證 Realtime 是否已啟用
-- ============================================
SELECT 
  tablename as 表名,
  '✅ Realtime 已啟用' as 狀態
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('schedule_items', 'line_configs');

-- 如果查詢返回結果，表示 Realtime 已成功啟用！
