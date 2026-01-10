-- ============================================
-- 優化用戶角色查詢並設置管理員
-- ============================================
-- 此腳本會：
-- 1. 優化 user_profiles 表的索引
-- 2. 設置 leo.chang@avient.com 為管理員
-- 3. 驗證結果
-- ============================================

-- 1. 確保 user_profiles 表存在並有正確結構
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 創建索引以加速查詢（使用 id 作為主鍵已經有索引，但我們可以添加 email 索引）
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 3. 確保 RLS 已啟用
-- ============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. 簡化 RLS 政策（避免遞迴查詢，加速查詢）
-- ============================================
-- 先刪除所有舊政策
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update user_profiles" ON public.user_profiles;

-- 簡化的 SELECT 政策：用戶可以查看自己的記錄（直接比較 ID，不查詢表）
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 簡化的 UPDATE 政策：用戶可以更新自己的記錄
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT 政策：允許插入（在註冊時創建 profile）
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.user_profiles;
CREATE POLICY "Allow authenticated users to insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. 設置 leo.chang@avient.com 為管理員
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

-- 6. 驗證結果
-- ============================================
SELECT 
  au.id as user_id,
  au.email,
  up.role,
  up.updated_at as last_updated,
  CASE 
    WHEN up.id IS NULL THEN '❌ 缺少 user_profiles 記錄'
    WHEN up.role = 'admin' THEN '✅ 已設為管理員'
    ELSE '❌ 角色: ' || up.role
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'leo.chang@avient.com';

-- 7. 檢查索引是否創建成功
-- ============================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY indexname;

-- ============================================
-- 執行後，用戶需要重新登入才能看到新的角色
-- ============================================
