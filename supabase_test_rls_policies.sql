-- ============================================
-- 測試 RLS 政策的 SQL 腳本
-- ============================================
-- 此腳本用於驗證基於角色的 RLS 政策是否正常工作
-- ============================================

-- 測試 1：檢查當前用戶的角色
-- ============================================
SELECT 
  auth.uid() as current_user_id,
  public.get_user_role_safe() as current_user_role,
  CASE 
    WHEN public.get_user_role_safe() = 'admin' THEN '✅ 管理員'
    WHEN public.get_user_role_safe() = 'operator' THEN '✅ 操作員'
    WHEN public.get_user_role_safe() = 'viewer' THEN '✅ 訪客'
    ELSE '❌ 未定義角色'
  END as role_status;

-- 測試 2：檢查所有 RLS 政策是否已啟用
-- ============================================
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN tablename = 'user_profiles' THEN 
      CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND cmd IN ('SELECT', 'INSERT', 'UPDATE')) >= 3 THEN '✅ 完整' ELSE '❌ 不完整' END
    WHEN tablename = 'schedule_items' THEN
      CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'schedule_items' AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) >= 4 THEN '✅ 完整' ELSE '❌ 不完整' END
    WHEN tablename = 'line_configs' THEN
      CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'line_configs' AND cmd IN ('SELECT', 'UPDATE')) >= 2 THEN '✅ 完整' ELSE '❌ 不完整' END
    WHEN tablename = 'suggested_schedules' THEN
      CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suggested_schedules' AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) >= 4 THEN '✅ 完整' ELSE '❌ 不完整' END
    ELSE '❓ 未知'
  END as policy_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename;

-- 測試 3：檢查 schedule_items 表的政策詳情
-- ============================================
SELECT 
  policyname as "政策名稱",
  cmd as "操作",
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ 所有已登入用戶'
    WHEN cmd = 'INSERT' THEN '✅ Admin 和 Operator'
    WHEN cmd = 'UPDATE' THEN '✅ Admin 和 Operator'
    WHEN cmd = 'DELETE' THEN '✅ 只有 Admin'
    ELSE '❓ 未知'
  END as "允許的角色",
  qual as "USING 條件",
  with_check as "WITH CHECK 條件"
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

-- 測試 4：驗證用戶角色分配
-- ============================================
SELECT 
  up.email,
  up.role,
  CASE 
    WHEN up.role = 'admin' THEN '✅ 可以所有操作'
    WHEN up.role = 'operator' THEN '✅ 可以查看、新增、修改（不能刪除）'
    WHEN up.role = 'viewer' THEN '✅ 只能查看'
    ELSE '❌ 未定義角色'
  END as "權限摘要",
  up.created_at,
  up.updated_at
FROM public.user_profiles up
ORDER BY up.role, up.email;

-- 測試 5：檢查是否有用戶沒有角色（應該默認為 viewer）
-- ============================================
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN up.id IS NULL THEN '⚠️ 沒有 user_profiles 記錄（將使用默認角色 viewer）'
    ELSE '✅ 有 user_profiles 記錄'
  END as profile_status,
  COALESCE(up.role, 'viewer') as effective_role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.email;

-- ============================================
-- 手動測試步驟（需要在不同的用戶角色下執行）
-- ============================================
-- 
-- 1. 以 viewer 角色登入，嘗試：
--    - SELECT schedule_items：應該成功 ✅
--    - INSERT schedule_items：應該失敗 ❌
--    - UPDATE schedule_items：應該失敗 ❌
--    - DELETE schedule_items：應該失敗 ❌
--
-- 2. 以 operator 角色登入，嘗試：
--    - SELECT schedule_items：應該成功 ✅
--    - INSERT schedule_items：應該成功 ✅
--    - UPDATE schedule_items：應該成功 ✅
--    - DELETE schedule_items：應該失敗 ❌
--
-- 3. 以 admin 角色登入，嘗試：
--    - SELECT schedule_items：應該成功 ✅
--    - INSERT schedule_items：應該成功 ✅
--    - UPDATE schedule_items：應該成功 ✅
--    - DELETE schedule_items：應該成功 ✅
--
-- ============================================
