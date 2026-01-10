-- ============================================
-- 為單一現有 Supabase Auth 用戶建立 user_profiles 記錄
-- ============================================
-- 此腳本用於為已存在的 auth.users 用戶建立對應的 user_profiles 記錄
-- 使用方式：將 'leo.chang@avient.com' 改為您的 email
-- ============================================

-- 1. 確保 user_profiles 表存在
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. 為指定用戶建立 user_profiles 記錄
-- ============================================
-- 將 'leo.chang@avient.com' 改為您的 email

DO $$
DECLARE
  target_email TEXT := 'leo.chang@avient.com';  -- 改為您的 email
  user_count INTEGER;
  target_user_id UUID;
  new_role TEXT;
BEGIN
  -- 檢查目標用戶是否存在
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '用戶不存在: %', target_email;
  END IF;
  
  -- 檢查是否已有 user_profiles 記錄
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = target_user_id) THEN
    RAISE NOTICE '用戶 % 已有 user_profiles 記錄，跳過建立', target_email;
    -- 更新現有記錄的角色為 admin（如果還沒有）
    UPDATE public.user_profiles 
    SET role = 'admin' 
    WHERE id = target_user_id AND role != 'admin';
    RETURN;
  END IF;
  
  -- 檢查是否是第一個用戶（決定角色）
  SELECT COUNT(*) INTO user_count FROM public.user_profiles;
  
  IF user_count = 0 THEN
    new_role := 'admin';
    RAISE NOTICE '這是第一個用戶，設為管理員 (admin)';
  ELSE
    new_role := 'admin';  -- 也可以設為 'operator'，這裡預設為 admin
    RAISE NOTICE '已有 % 個用戶，設為管理員 (admin)', user_count;
  END IF;
  
  -- 建立 user_profiles 記錄
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (target_user_id, target_email, new_role)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        updated_at = NOW();
  
  RAISE NOTICE '已為用戶 % (ID: %) 建立 user_profiles 記錄，角色: %', target_email, target_user_id, new_role;
END $$;

-- 3. 驗證結果
-- ============================================
SELECT 
  au.id as user_id,
  au.email,
  up.role,
  up.created_at as profile_created_at,
  au.created_at as auth_created_at,
  CASE 
    WHEN up.id IS NULL THEN '❌ 缺少 user_profiles 記錄'
    ELSE '✅ 正常'
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'leo.chang@avient.com';  -- 改為您的 email

-- ============================================
-- 注意事項：
-- ============================================
-- 1. 執行前請將 'leo.chang@avient.com' 改為實際的 email
-- 2. 第一個建立的用戶會自動設為 admin 角色
-- 3. 如果用戶已有 user_profiles 記錄，腳本會更新角色為 admin（如果還不是）
-- 4. 執行後請驗證結果，確認 status 顯示為 '✅ 正常'
-- ============================================
