-- ============================================
-- 完整修復 RLS 無限遞迴問題（包含表建立）
-- ============================================
-- 此腳本會：
-- 1. 確保所有表都存在
-- 2. 刪除所有舊的 RLS 政策
-- 3. 建立簡化的 RLS 政策（避免遞迴）
-- ============================================

-- 步驟 1：確保所有表都存在
-- ============================================

-- 1.1 確保 user_profiles 表存在
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 1.2 確保 suggested_schedules 表存在
CREATE TABLE IF NOT EXISTS public.suggested_schedules (
  material_number TEXT PRIMARY KEY,
  suggested_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggested_schedules_last_updated 
ON public.suggested_schedules(last_updated DESC);

-- 步驟 2：刪除所有舊的 RLS 政策
-- ============================================

-- 2.1 刪除 user_profiles 表的政策
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.user_profiles;

-- 2.2 刪除 schedule_items 表的政策
DROP POLICY IF EXISTS "Authenticated users can view schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can insert schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can update schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Authenticated users can delete schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Admin and operator can insert schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Admin and operator can update schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Only admin can delete schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Allow all operations on schedule_items" ON public.schedule_items;

-- 2.3 刪除 line_configs 表的政策
DROP POLICY IF EXISTS "Authenticated users can view line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Authenticated users can update line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Only admin can update line_configs" ON public.line_configs;

-- 2.4 刪除 suggested_schedules 表的政策
DROP POLICY IF EXISTS "Authenticated users can view suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Authenticated users can insert suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Authenticated users can update suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Admin and operator can insert suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Only admin can update suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Only admin can delete suggested_schedules" ON public.suggested_schedules;

-- 步驟 3：啟用 RLS（如果尚未啟用）
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_schedules ENABLE ROW LEVEL SECURITY;

-- 步驟 4：建立簡化的 RLS 政策（避免遞迴）
-- ============================================

-- 4.1 user_profiles 表的政策（只允許用戶查看和更新自己的資料）
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

-- 4.2 schedule_items 表的政策（所有已登入用戶都可以操作）
DROP POLICY IF EXISTS "Authenticated users can view schedule_items" ON public.schedule_items;
CREATE POLICY "Authenticated users can view schedule_items"
  ON public.schedule_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert schedule_items" ON public.schedule_items;
CREATE POLICY "Authenticated users can insert schedule_items"
  ON public.schedule_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update schedule_items" ON public.schedule_items;
CREATE POLICY "Authenticated users can update schedule_items"
  ON public.schedule_items
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete schedule_items" ON public.schedule_items;
CREATE POLICY "Authenticated users can delete schedule_items"
  ON public.schedule_items
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 4.3 line_configs 表的政策（所有已登入用戶都可以操作）
DROP POLICY IF EXISTS "Authenticated users can view line_configs" ON public.line_configs;
CREATE POLICY "Authenticated users can view line_configs"
  ON public.line_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update line_configs" ON public.line_configs;
CREATE POLICY "Authenticated users can update line_configs"
  ON public.line_configs
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 4.4 suggested_schedules 表的政策（所有已登入用戶都可以操作）
DROP POLICY IF EXISTS "Authenticated users can view suggested_schedules" ON public.suggested_schedules;
CREATE POLICY "Authenticated users can view suggested_schedules"
  ON public.suggested_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert suggested_schedules" ON public.suggested_schedules;
CREATE POLICY "Authenticated users can insert suggested_schedules"
  ON public.suggested_schedules
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update suggested_schedules" ON public.suggested_schedules;
CREATE POLICY "Authenticated users can update suggested_schedules"
  ON public.suggested_schedules
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete suggested_schedules" ON public.suggested_schedules;
CREATE POLICY "Authenticated users can delete suggested_schedules"
  ON public.suggested_schedules
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- 步驟 5：驗證所有政策是否正確建立
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

-- 檢查是否有缺失的政策
SELECT 
  'user_profiles' as tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_count,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'INSERT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'UPDATE') > 0 
    THEN '✅ 完整'
    ELSE '❌ 不完整'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'

UNION ALL

SELECT 
  'schedule_items' as tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_count,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'INSERT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'UPDATE') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'DELETE') > 0 
    THEN '✅ 完整'
    ELSE '❌ 不完整'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'schedule_items'

UNION ALL

SELECT 
  'line_configs' as tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_count,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'UPDATE') > 0 
    THEN '✅ 完整'
    ELSE '❌ 不完整'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'line_configs'

UNION ALL

SELECT 
  'suggested_schedules' as tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_count,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'INSERT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'UPDATE') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'DELETE') > 0 
    THEN '✅ 完整'
    ELSE '❌ 不完整'
  END as status
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'suggested_schedules';

-- ============================================
-- 完成！所有表和政策都應該已建立
-- ============================================
