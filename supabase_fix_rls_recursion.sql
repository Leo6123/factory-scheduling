-- ============================================
-- 修復 RLS 政策無限遞迴問題
-- ============================================
-- 問題：user_profiles 表的 SELECT 政策在查詢時又查詢 user_profiles，
--       造成無限遞迴（錯誤代碼: 42P17）
-- ============================================

-- 1. 刪除所有有問題的 RLS 政策
-- ============================================

-- 刪除 user_profiles 表的政策
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;

-- 刪除其他表的政策（它們也會查詢 user_profiles，造成遞迴）
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

-- 2. 建立輔助函數來獲取用戶角色（使用 SECURITY DEFINER 避免 RLS 檢查）
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 使用 SECURITY DEFINER，繞過 RLS 政策
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'operator');
END;
$$;

-- 3. 重新建立 user_profiles 表的 RLS 政策（簡化，避免遞迴）
-- ============================================

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT 政策：用戶只能查看自己的資料，或者使用函數獲取角色後再決定
-- 簡化版本：只允許用戶查看自己的資料（避免遞迴）
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE 政策：用戶只能更新自己的資料
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT 政策：用戶只能插入自己的資料（觸發器會自動建立）
CREATE POLICY "Allow authenticated users to insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. 重新建立其他表的 RLS 政策（使用輔助函數，避免遞迴）
-- ============================================

-- schedule_items 表的政策
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- 查看：所有已登入用戶都可以查看
CREATE POLICY "Authenticated users can view schedule_items"
  ON public.schedule_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 插入：使用輔助函數檢查角色（避免遞迴）
CREATE POLICY "Admin and operator can insert schedule_items"
  ON public.schedule_items
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) IN ('admin', 'operator')
  );

-- 更新：使用輔助函數檢查角色（避免遞迴）
CREATE POLICY "Admin and operator can update schedule_items"
  ON public.schedule_items
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) IN ('admin', 'operator')
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) IN ('admin', 'operator')
  );

-- 刪除：只有管理員可以刪除
CREATE POLICY "Only admin can delete schedule_items"
  ON public.schedule_items
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

-- line_configs 表的政策
ALTER TABLE public.line_configs ENABLE ROW LEVEL SECURITY;

-- 查看：所有已登入用戶都可以查看
CREATE POLICY "Authenticated users can view line_configs"
  ON public.line_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 更新：只有管理員可以更新
CREATE POLICY "Only admin can update line_configs"
  ON public.line_configs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

-- suggested_schedules 表的政策
ALTER TABLE public.suggested_schedules ENABLE ROW LEVEL SECURITY;

-- 查看：所有已登入用戶都可以查看
CREATE POLICY "Authenticated users can view suggested_schedules"
  ON public.suggested_schedules
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 插入：管理員和操作員可以新增
CREATE POLICY "Admin and operator can insert suggested_schedules"
  ON public.suggested_schedules
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) IN ('admin', 'operator')
  );

-- 更新：只有管理員可以更新
CREATE POLICY "Only admin can update suggested_schedules"
  ON public.suggested_schedules
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

-- 刪除：只有管理員可以刪除
CREATE POLICY "Only admin can delete suggested_schedules"
  ON public.suggested_schedules
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    public.get_user_role(auth.uid()) = 'admin'
  );

-- 5. 驗證修復
-- ============================================

-- 檢查政策是否正確建立
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'schedule_items', 'line_configs', 'suggested_schedules')
ORDER BY tablename, cmd;

-- 測試輔助函數
SELECT 
  'get_user_role function exists' as status,
  EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_role' 
    AND pronamespace = 'public'::regnamespace
  ) as function_exists;

-- ============================================
-- 注意事項：
-- ============================================
-- 1. 此腳本使用 SECURITY DEFINER 函數來避免 RLS 遞迴
-- 2. user_profiles 表的 SELECT 政策已簡化，只允許用戶查看自己的資料
-- 3. 其他表的政策使用 get_user_role() 函數來檢查角色，避免直接查詢 user_profiles
-- 4. 執行此腳本後，無限遞迴問題應該會解決
-- 5. 如果還有問題，可能需要暫時禁用 RLS 來測試
-- ============================================
