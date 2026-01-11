-- ============================================
-- 檢查 RLS 函數是否存在（單獨查詢）
-- ============================================
-- 此查詢用於檢查 get_user_role() 和 get_user_role_safe() 函數是否存在
-- ============================================

SELECT 
  proname as "函數名稱",
  prorettype::regtype as "返回類型",
  pg_get_function_arguments(oid) as "參數"
FROM pg_proc
WHERE proname IN ('get_user_role', 'get_user_role_safe')
AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- ============================================
-- 預期結果：
-- ============================================
-- 應該返回 2 行：
-- 1. get_user_role - 返回類型：text
-- 2. get_user_role_safe - 返回類型：text
-- 
-- 如果返回 0 行，表示函數不存在，需要執行 supabase_secure_rls_policies.sql
-- ============================================
