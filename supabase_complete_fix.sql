-- ============================================
-- 完整修復腳本：解決所有問題
-- ============================================
-- 此腳本會：
-- 1. 優化 user_profiles 表（添加索引）
-- 2. 設置 leo.chang@avient.com 為管理員
-- 3. 簡化 RLS 政策（避免查詢超時）
-- 4. 啟用 Realtime（如果尚未啟用）
-- ============================================

-- 步驟 1：確保 user_profiles 表存在並有正確結構
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步驟 2：創建索引以加速查詢
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 步驟 3：簡化 RLS 政策（避免查詢超時）
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 刪除所有舊政策
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all device sessions" ON public.user_profiles;

-- 創建簡化的 SELECT 政策（直接比較 ID，不查詢表，避免遞迴）
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 創建 UPDATE 政策
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 創建 INSERT 政策
CREATE POLICY "Allow authenticated users to insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 步驟 4：設置 leo.chang@avient.com 為管理員
-- ============================================
DO $$
DECLARE
  target_email TEXT := 'leo.chang@avient.com';
  target_user_id UUID;
BEGIN
  -- 從 auth.users 獲取用戶 ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '❌ 用戶不存在: %。請先在 Supabase Auth 中創建此用戶。', target_email;
  END IF;
  
  -- 使用 INSERT ... ON CONFLICT 來更新或建立記錄
  INSERT INTO public.user_profiles (id, email, role, updated_at)
  VALUES (target_user_id, target_email, 'admin', NOW())
  ON CONFLICT (id) 
  DO UPDATE 
    SET role = 'admin',
        email = EXCLUDED.email,
        updated_at = NOW();
  
  RAISE NOTICE '✅ 已將用戶 % (ID: %) 設置為管理員 (admin)', target_email, target_user_id;
END $$;

-- 步驟 5：啟用 Realtime（如果尚未啟用）
-- ============================================
DO $$
BEGIN
  -- 嘗試添加 schedule_items 到 Realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;
    RAISE NOTICE '✅ 已啟用 schedule_items 的 Realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ schedule_items 的 Realtime 已經啟用';
    WHEN OTHERS THEN
      RAISE WARNING '⚠️ 無法啟用 schedule_items 的 Realtime: %', SQLERRM;
  END;
  
  -- 嘗試添加 line_configs 到 Realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.line_configs;
    RAISE NOTICE '✅ 已啟用 line_configs 的 Realtime';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ line_configs 的 Realtime 已經啟用';
    WHEN OTHERS THEN
      RAISE WARNING '⚠️ 無法啟用 line_configs 的 Realtime: %', SQLERRM;
  END;
END $$;

-- 步驟 6：驗證所有設置
-- ============================================
-- 驗證管理員設置
SELECT 
  '用戶角色' as 檢查項目,
  au.email,
  up.role,
  CASE 
    WHEN up.role = 'admin' THEN '✅ 已設為管理員'
    ELSE '❌ 角色: ' || up.role
  END as 狀態
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'leo.chang@avient.com';

-- 驗證索引
SELECT 
  '索引檢查' as 檢查項目,
  COUNT(*) as 索引數量
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- 驗證 Realtime
SELECT 
  'Realtime 檢查' as 檢查項目,
  tablename as 表名,
  '✅ Realtime 已啟用' as 狀態
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('schedule_items', 'line_configs');

-- ============================================
-- 執行後請：
-- 1. 在應用程式中登出並重新登入
-- 2. 應該會看到「管理員」而不是「操作員」
-- 3. 角色查詢應該不會再超時（因為有索引和簡化的 RLS）
-- ============================================
