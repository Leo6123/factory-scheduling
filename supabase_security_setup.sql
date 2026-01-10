-- ============================================
-- Supabase 資安設定腳本
-- 基本保護：身份驗證 + RLS 政策 + 角色系統
-- ============================================

-- 1. 建立 user_profiles 表（儲存用戶角色）
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 啟用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能查看和更新自己的資料，管理員可以查看所有（先刪除舊政策避免重複建立錯誤）
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow authenticated users to insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 建立觸發器：自動建立 user_profile 當用戶註冊時
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    -- 第一個用戶自動為管理員，其他為操作員
    CASE 
      WHEN (SELECT COUNT(*) FROM public.user_profiles) = 0 THEN 'admin'
      ELSE 'operator'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果觸發器不存在，則建立
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. 確保 schedule_items 表存在（如果不存在則建立基本結構）
-- ============================================

-- 注意：如果表已存在，此部分不會改變現有結構
-- 如果表不存在，建立基本表結構
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  material_description TEXT,
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  delivery_date DATE NOT NULL,
  material_ready_date DATE,
  line_id TEXT NOT NULL,
  schedule_date DATE,
  start_hour NUMERIC(5,2),
  needs_crystallization BOOLEAN DEFAULT FALSE,
  needs_ccd BOOLEAN DEFAULT FALSE,
  needs_dryblending BOOLEAN DEFAULT FALSE,
  needs_package BOOLEAN DEFAULT FALSE,
  is_2_press BOOLEAN DEFAULT FALSE,
  is_3_press BOOLEAN DEFAULT FALSE,
  is_cleaning_process BOOLEAN DEFAULT FALSE,
  cleaning_type TEXT CHECK (cleaning_type IN ('A', 'B', 'C', 'D', 'E')),
  is_abnormal_incomplete BOOLEAN DEFAULT FALSE,
  is_maintenance BOOLEAN DEFAULT FALSE,
  maintenance_hours NUMERIC(5,2),
  process_order TEXT,
  customer TEXT,
  sales_document TEXT,
  remark TEXT,
  recipe_items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_schedule_items_line_id ON public.schedule_items(line_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule_date ON public.schedule_items(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_delivery_date ON public.schedule_items(delivery_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_batch_number ON public.schedule_items(batch_number);

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- 刪除舊的寬鬆政策（如果存在）
DROP POLICY IF EXISTS "Allow all operations on schedule_items" ON public.schedule_items;

-- 建立基於角色的政策（先刪除舊政策避免重複建立錯誤）
DROP POLICY IF EXISTS "Authenticated users can view schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Admin and operator can insert schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Admin and operator can update schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Only admin can delete schedule_items" ON public.schedule_items;

-- 查看政策：所有已登入用戶都可以查看
CREATE POLICY "Authenticated users can view schedule_items"
  ON public.schedule_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 插入政策：管理員和操作員可以新增
CREATE POLICY "Admin and operator can insert schedule_items"
  ON public.schedule_items
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- 更新政策：管理員和操作員可以更新
CREATE POLICY "Admin and operator can update schedule_items"
  ON public.schedule_items
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- 刪除政策：只有管理員可以刪除
CREATE POLICY "Only admin can delete schedule_items"
  ON public.schedule_items
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. 建立或強化 line_configs 表的 RLS 政策
-- ============================================

-- 如果表不存在，先建立它
CREATE TABLE IF NOT EXISTS public.line_configs (
  line_id TEXT PRIMARY KEY,
  avg_output NUMERIC NOT NULL DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE public.line_configs ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）以避免重複建立錯誤
DROP POLICY IF EXISTS "Allow all operations on line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Authenticated users can view line_configs" ON public.line_configs;
DROP POLICY IF EXISTS "Only admin can update line_configs" ON public.line_configs;

-- 查看政策：所有已登入用戶都可以查看
CREATE POLICY "Authenticated users can view line_configs"
  ON public.line_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 更新政策：只有管理員可以更新
CREATE POLICY "Only admin can update line_configs"
  ON public.line_configs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. 建立或強化 suggested_schedules 表的 RLS 政策
-- ============================================

-- 如果表不存在，先建立它
CREATE TABLE IF NOT EXISTS public.suggested_schedules (
  material_number TEXT PRIMARY KEY,
  suggested_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_suggested_schedules_last_updated 
ON public.suggested_schedules(last_updated DESC);

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE public.suggested_schedules ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）以避免重複建立錯誤
DROP POLICY IF EXISTS "Authenticated users can view suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Admin and operator can insert suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Only admin can update suggested_schedules" ON public.suggested_schedules;
DROP POLICY IF EXISTS "Only admin can delete suggested_schedules" ON public.suggested_schedules;

-- 查看政策：所有已登入用戶都可以查看
CREATE POLICY "Authenticated users can view suggested_schedules"
  ON public.suggested_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 插入政策：管理員和操作員可以新增
CREATE POLICY "Admin and operator can insert suggested_schedules"
  ON public.suggested_schedules
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'operator')
    )
  );

-- 更新政策：只有管理員可以更新
CREATE POLICY "Only admin can update suggested_schedules"
  ON public.suggested_schedules
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 刪除政策：只有管理員可以刪除
CREATE POLICY "Only admin can delete suggested_schedules"
  ON public.suggested_schedules
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. 驗證設定
-- ============================================

-- 檢查 RLS 是否啟用（只檢查存在的表）
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('schedule_items', 'line_configs', 'suggested_schedules', 'user_profiles')
ORDER BY tablename;

-- 檢查 RLS 政策（只顯示存在的表）
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Command",
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('schedule_items', 'line_configs', 'suggested_schedules', 'user_profiles')
ORDER BY tablename, cmd;

-- ============================================
-- 注意事項：
-- ============================================
-- 1. 此腳本需要在 Supabase SQL Editor 中執行
-- 2. 第一個註冊的用戶會自動成為管理員
-- 3. 後續用戶預設為操作員
-- 4. 管理員可以手動更新 user_profiles 表來修改用戶角色
-- 5. 建議在執行此腳本前備份資料庫
-- ============================================
