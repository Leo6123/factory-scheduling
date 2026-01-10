-- ============================================
-- 簡化版：修復 RLS 無限遞迴問題（最簡單的方法）
-- ============================================
-- 問題：RLS 政策在查詢時又查詢自己，造成無限遞迴
-- 解決：暫時禁用有問題的 RLS 政策，或使用更簡單的政策
-- ============================================

-- 方法 1：暫時禁用 user_profiles 的 RLS（最簡單，但不安全）
-- ============================================
-- 如果這只是開發/測試環境，可以暫時禁用 RLS
-- 生產環境不建議使用此方法

-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 方法 2：使用更簡單的 RLS 政策（推薦）
-- ============================================

-- 1. 刪除所有有問題的政策
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;

-- 刪除其他表的政策（避免查詢 user_profiles）
DROP POLICY IF EXISTS "Authenticated users can view schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Admin and operator can insert schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Admin and operator can update schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Only admin can delete schedule_items" ON public.schedule_items;

DROP POLICY IF EXISTS "Authenticated users can view line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Only admin can update line_configs" ON public.line_configs;

DROP POLICY IF EXISTS "Authenticated users can view suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Admin and operator can insert suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Only admin can update suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Only admin can delete suggested_schedules" ON public.suggested_schedules;

-- 2. 建立簡化的 user_profiles 政策（只允許用戶查看和更新自己的資料，不檢查角色）
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. 建立簡化的其他表政策（所有已登入用戶都可以操作，不檢查角色）
-- 這樣可以避免查詢 user_profiles 造成的遞迴問題

-- schedule_items 表：所有已登入用戶都可以操作
CREATE POLICY "Authenticated users can view schedule_items"
  ON public.schedule_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert schedule_items"
  ON public.schedule_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update schedule_items"
  ON public.schedule_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete schedule_items"
  ON public.schedule_items
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- line_configs 表：所有已登入用戶都可以操作
CREATE POLICY "Authenticated users can view line_configs"
  ON public.line_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update line_configs"
  ON public.line_configs
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- suggested_schedules 表：所有已登入用戶都可以操作
CREATE POLICY "Authenticated users can view suggested_schedules"
  ON public.suggested_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert suggested_schedules"
  ON public.suggested_schedules
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suggested_schedules"
  ON public.suggested_schedules
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete suggested_schedules"
  ON public.suggested_schedules
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 注意事項：
-- ============================================
-- 1. 此方法簡化了 RLS 政策，所有已登入用戶都可以操作資料
-- 2. 不再檢查用戶角色（admin/operator/viewer），避免查詢 user_profiles 造成遞迴
-- 3. 這意味著權限控制現在由應用程式層面處理（AuthContext），而不是資料庫層面
-- 4. 這是一個簡化的解決方案，適合 MVP 和開發環境
-- 5. 如果需要更嚴格的權限控制，可以之後再實作更複雜的 RLS 政策
-- ============================================

-- 驗證政策是否正確建立
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename, cmd;
