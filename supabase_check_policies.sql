-- ============================================
-- 檢查 RLS 政策是否完整建立
-- ============================================

-- 檢查所有表的政策
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Command",
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ 查看'
    WHEN cmd = 'INSERT' THEN '✅ 新增'
    WHEN cmd = 'UPDATE' THEN '✅ 更新'
    WHEN cmd = 'DELETE' THEN '✅ 刪除'
    ELSE cmd
  END as "權限類型"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename, 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- 檢查是否有缺失的政策
SELECT 
  t.tablename,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.cmd = 'SELECT') THEN '❌ 缺少 SELECT 政策'
    ELSE '✅ SELECT 政策已建立'
  END as select_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.cmd = 'INSERT') THEN '❌ 缺少 INSERT 政策'
    ELSE '✅ INSERT 政策已建立'
  END as insert_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.cmd = 'UPDATE') THEN '❌ 缺少 UPDATE 政策'
    ELSE '✅ UPDATE 政策已建立'
  END as update_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename = t.tablename AND p.cmd = 'DELETE') THEN '❌ 缺少 DELETE 政策'
    ELSE '✅ DELETE 政策已建立'
  END as delete_status
FROM (VALUES 
  ('user_profiles'),
  ('schedule_items'),
  ('line_configs'),
  ('suggested_schedules')
) AS t(tablename);
