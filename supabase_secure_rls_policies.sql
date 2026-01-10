-- ============================================
-- 安全強化的 RLS 政策（基於角色的權限控制）
-- ============================================
-- 此腳本會：
-- 1. 建立函數來獲取用戶角色
-- 2. 建立基於角色的 RLS 政策
-- 3. 確保只有相應角色的用戶才能執行相應操作
-- ============================================

-- 步驟 1：確保 user_profiles 表存在且已啟用 RLS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- user_profiles 表的 RLS 政策（只允許用戶查看和更新自己的資料）
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;
CREATE POLICY "Allow authenticated users to insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 步驟 2：建立函數來獲取當前用戶的角色
-- ============================================
-- 注意：使用 SECURITY DEFINER 確保可以查詢 user_profiles 表
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 如果用戶不存在，返回 'viewer'（最嚴格的默認角色）
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()),
    'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 步驟 3：確保 schedule_items 表已啟用 RLS
-- ============================================
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- 刪除舊的寬鬆政策
DROP POLICY IF EXISTS "Allow all operations on schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can view schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can insert schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can update schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can delete schedule_items" ON public.schedule_items;

-- 建立基於角色的 SELECT 政策（所有已登入用戶都可以查看）
CREATE POLICY "Authenticated users can view schedule_items"
  ON public.schedule_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 建立基於角色的 INSERT 政策（admin 和 operator 可以新增）
CREATE POLICY "Admin and operator can insert schedule_items"
  ON public.schedule_items
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')
  );

-- 建立基於角色的 UPDATE 政策（admin 和 operator 可以修改）
CREATE POLICY "Admin and operator can update schedule_items"
  ON public.schedule_items
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')
  );

-- 建立基於角色的 DELETE 政策（只有 admin 可以刪除）
CREATE POLICY "Only admin can delete schedule_items"
  ON public.schedule_items
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() = 'admin'
  );

-- 步驟 4：確保 line_configs 表已啟用 RLS
-- ============================================
ALTER TABLE public.line_configs ENABLE ROW LEVEL SECURITY;

-- 刪除舊的寬鬆政策
DROP POLICY IF EXISTS "Allow all operations on line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Authenticated users can view line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Authenticated users can update line_configs" ON public.line_configs;

-- 建立基於角色的 SELECT 政策（所有已登入用戶都可以查看）
CREATE POLICY "Authenticated users can view line_configs"
  ON public.line_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 建立基於角色的 UPDATE 政策（admin 和 operator 可以修改）
CREATE POLICY "Admin and operator can update line_configs"
  ON public.line_configs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')
  );

-- 步驟 5：確保 suggested_schedules 表已啟用 RLS
-- ============================================
ALTER TABLE public.suggested_schedules ENABLE ROW LEVEL SECURITY;

-- 刪除舊的寬鬆政策
DROP POLICY IF EXISTS "Authenticated users can view suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Authenticated users can insert suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Authenticated users can update suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete suggested_schedules" ON public.suggested_schedules;

-- 建立基於角色的 SELECT 政策（所有已登入用戶都可以查看）
CREATE POLICY "Authenticated users can view suggested_schedules"
  ON public.suggested_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 建立基於角色的 INSERT 政策（admin 和 operator 可以新增）
CREATE POLICY "Admin and operator can insert suggested_schedules"
  ON public.suggested_schedules
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')
  );

-- 建立基於角色的 UPDATE 政策（只有 admin 可以修改）
CREATE POLICY "Only admin can update suggested_schedules"
  ON public.suggested_schedules
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() = 'admin'
  );

-- 建立基於角色的 DELETE 政策（只有 admin 可以刪除）
CREATE POLICY "Only admin can delete suggested_schedules"
  ON public.suggested_schedules
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() = 'admin'
  );

-- 步驟 6：驗證所有政策是否正確建立
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Command",
  CASE 
    WHEN cmd = 'SELECT' THEN '查看'
    WHEN cmd = 'INSERT' THEN '新增'
    WHEN cmd = 'UPDATE' THEN '更新'
    WHEN cmd = 'DELETE' THEN '刪除'
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

-- 步驟 7：測試函數是否正常工作
-- ============================================
-- 注意：這個查詢需要在已登入的 session 中執行
-- SELECT public.get_user_role_safe() as current_user_role;

-- ============================================
-- 完成！所有基於角色的 RLS 政策已建立
-- ============================================
-- 
-- 權限摘要：
-- - viewer（訪客）：只能 SELECT（查看）
-- - operator（操作員）：可以 SELECT、INSERT、UPDATE（查看、新增、修改）
-- - admin（管理員）：可以 SELECT、INSERT、UPDATE、DELETE（所有操作）
--
-- 注意：
-- 1. 所有政策都檢查 auth.role() = 'authenticated'（必須已登入）
-- 2. 所有政策都使用 get_user_role_safe() 來獲取用戶角色
-- 3. 如果用戶不存在於 user_profiles 表中，默認角色為 'viewer'（最嚴格）
-- ============================================
