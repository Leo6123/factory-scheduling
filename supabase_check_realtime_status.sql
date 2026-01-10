-- ============================================
-- 檢查 Realtime 狀態（簡單驗證）
-- ============================================
-- 只執行此腳本即可檢查當前狀態，不會修改任何設定
-- ============================================

-- 檢查哪些表已啟用 Realtime
SELECT 
  tablename as 表名,
  '✅ Realtime 已啟用' as 狀態
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('schedule_items', 'line_configs')
ORDER BY tablename;

-- 如果上面的查詢返回結果，表示 Realtime 已成功啟用！
-- 如果沒有返回結果，表示需要啟用 Realtime（執行 supabase_enable_realtime_safe.sql）
