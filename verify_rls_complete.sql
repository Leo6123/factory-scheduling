-- ============================================
-- 完整驗證 RLS 政策實施狀態
-- ============================================
-- 此腳本用於完整檢查 RLS 政策是否已正確實施
-- ============================================

-- 步驟 1：檢查函數是否存在（最重要）
-- ============================================
SELECT 
  proname as "函數名稱",
  prorettype::regtype as "返回類型",
  pg_get_function_arguments(oid) as "參數"
FROM pg_proc
WHERE proname IN ('get_user_role', 'get_user_role_safe')
AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 預期結果：應該返回 2 行（兩個函數都存在）
-- 如果返回 0 行，表示函數不存在，RLS 政策無法正常工作

-- 步驟 2：檢查 RLS 是否已啟用
-- ============================================
SELECT 
  tablename as "表名",
  rowsecurity as "RLS 已啟用"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename;

-- 預期結果：所有表的 "RLS 已啟用" 都應該是 true

-- 步驟 3：檢查政策數量
-- ============================================
SELECT 
  tablename as "表名",
  COUNT(*) as "政策數量",
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as "SELECT 政策",
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as "INSERT 政策",
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as "UPDATE 政策",
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as "DELETE 政策"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
GROUP BY tablename
ORDER BY tablename;

-- 預期結果：
-- user_profiles: 3 個政策 (SELECT, INSERT, UPDATE)
-- schedule_items: 4 個政策 (SELECT, INSERT, UPDATE, DELETE)
-- line_configs: 2 個政策 (SELECT, UPDATE)
-- suggested_schedules: 4 個政策 (SELECT, INSERT, UPDATE, DELETE)

-- 步驟 4：檢查所有政策的詳細資訊
-- ============================================
SELECT 
  tablename as "表名",
  policyname as "政策名稱",
  cmd as "操作",
  CASE cmd
    WHEN 'SELECT' THEN '查看'
    WHEN 'INSERT' THEN '新增'
    WHEN 'UPDATE' THEN '更新'
    WHEN 'DELETE' THEN '刪除'
    ELSE cmd
  END as "操作類型"
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

-- ============================================
-- 驗證檢查清單
-- ============================================
-- [ ] 函數存在：get_user_role 和 get_user_role_safe（步驟 1 返回 2 行）
-- [ ] RLS 已啟用：所有表的 rowsecurity = true（步驟 2）
-- [ ] 政策數量正確：符合預期數量（步驟 3）
-- [ ] 政策名稱正確：符合預期的政策名稱（步驟 4）
-- ============================================
