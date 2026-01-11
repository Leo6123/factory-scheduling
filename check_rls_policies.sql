-- ============================================
-- 檢查 RLS 政策實施狀態
-- ============================================
-- 此腳本用於檢查 RLS 政策是否已正確實施
-- ============================================

-- 步驟 1：檢查 RLS 是否已啟用
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS 已啟用"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename;

-- 步驟 2：檢查是否存在 get_user_role_safe() 函數
-- ============================================
SELECT 
  proname as "函數名稱",
  prorettype::regtype as "返回類型",
  pg_get_function_arguments(oid) as "參數"
FROM pg_proc
WHERE proname IN ('get_user_role', 'get_user_role_safe')
AND pronamespace = 'public'::regnamespace;

-- 步驟 3：檢查所有 RLS 政策
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname as "政策名稱",
  cmd as "操作類型",
  qual as "USING 條件",
  with_check as "WITH CHECK 條件"
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

-- 步驟 4：檢查 user_profiles 表的政策（詳細）
-- ============================================
SELECT 
  policyname as "政策名稱",
  cmd as "操作",
  CASE cmd
    WHEN 'SELECT' THEN '查看'
    WHEN 'INSERT' THEN '新增'
    WHEN 'UPDATE' THEN '更新'
    WHEN 'DELETE' THEN '刪除'
    ELSE cmd
  END as "操作類型",
  qual as "USING 條件"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_profiles'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- 步驟 5：檢查 schedule_items 表的政策（詳細）
-- ============================================
SELECT 
  policyname as "政策名稱",
  cmd as "操作",
  CASE cmd
    WHEN 'SELECT' THEN '查看'
    WHEN 'INSERT' THEN '新增'
    WHEN 'UPDATE' THEN '更新'
    WHEN 'DELETE' THEN '刪除'
    ELSE cmd
  END as "操作類型",
  CASE 
    WHEN cmd = 'SELECT' THEN '所有已登入用戶可以查看'
    WHEN cmd = 'INSERT' THEN 'admin 和 operator 可以新增'
    WHEN cmd = 'UPDATE' THEN 'admin 和 operator 可以更新'
    WHEN cmd = 'DELETE' THEN '只有 admin 可以刪除'
    ELSE '未知'
  END as "預期權限"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'schedule_items'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- 步驟 6：檢查 line_configs 表的政策（詳細）
-- ============================================
SELECT 
  policyname as "政策名稱",
  cmd as "操作",
  CASE cmd
    WHEN 'SELECT' THEN '查看'
    WHEN 'UPDATE' THEN '更新'
    ELSE cmd
  END as "操作類型",
  CASE 
    WHEN cmd = 'SELECT' THEN '所有已登入用戶可以查看'
    WHEN cmd = 'UPDATE' THEN 'admin 和 operator 可以更新'
    ELSE '未知'
  END as "預期權限"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'line_configs'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'UPDATE' THEN 2
    ELSE 3
  END;

-- 步驟 7：檢查 suggested_schedules 表的政策（詳細）
-- ============================================
SELECT 
  policyname as "政策名稱",
  cmd as "操作",
  CASE cmd
    WHEN 'SELECT' THEN '查看'
    WHEN 'INSERT' THEN '新增'
    WHEN 'UPDATE' THEN '更新'
    WHEN 'DELETE' THEN '刪除'
    ELSE cmd
  END as "操作類型",
  CASE 
    WHEN cmd = 'SELECT' THEN '所有已登入用戶可以查看'
    WHEN cmd = 'INSERT' THEN 'admin 和 operator 可以新增'
    WHEN cmd = 'UPDATE' THEN '只有 admin 可以更新'
    WHEN cmd = 'DELETE' THEN '只有 admin 可以刪除'
    ELSE '未知'
  END as "預期權限"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'suggested_schedules'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- 步驟 8：統計各表的政策數量（快速檢查）
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

-- ============================================
-- 預期結果：
-- ============================================
-- 1. user_profiles: RLS 已啟用，至少有 3 個政策（SELECT, UPDATE, INSERT）
-- 2. schedule_items: RLS 已啟用，至少有 4 個政策（SELECT, INSERT, UPDATE, DELETE）
-- 3. line_configs: RLS 已啟用，至少有 2 個政策（SELECT, UPDATE）
-- 4. suggested_schedules: RLS 已啟用，至少有 4 個政策（SELECT, INSERT, UPDATE, DELETE）
-- 5. get_user_role_safe() 函數存在
-- ============================================
