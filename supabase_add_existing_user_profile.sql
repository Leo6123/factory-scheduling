-- ============================================
-- 為現有 Supabase Auth 用戶建立 user_profiles 記錄
-- ============================================
-- 此腳本用於在執行 supabase_security_setup.sql 之前已建立的用戶
-- 執行後，這些用戶將能夠正常使用系統功能（存檔、匯入等）
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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. 為所有現有 auth.users 中的用戶建立 user_profiles 記錄
-- ============================================
-- 注意：第一個用戶會自動成為管理員（admin），其他用戶預設為操作員（operator）

DO $$
DECLARE
  user_count INTEGER;
  first_user_id UUID;
BEGIN
  -- 檢查是否已有 user_profiles 記錄
  SELECT COUNT(*) INTO user_count FROM public.user_profiles;
  
  -- 為每個 auth.users 中的用戶建立記錄
  INSERT INTO public.user_profiles (id, email, role)
  SELECT 
    au.id,
    au.email,
    CASE 
      WHEN user_count = 0 AND NOT EXISTS (SELECT 1 FROM public.user_profiles LIMIT 1) THEN 'admin'
      ELSE 'operator'
    END as role
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- 如果沒有任何記錄，將第一個用戶設為管理員
  IF (SELECT COUNT(*) FROM public.user_profiles) = 1 THEN
    UPDATE public.user_profiles 
    SET role = 'admin' 
    WHERE id = (SELECT id FROM public.user_profiles ORDER BY created_at ASC LIMIT 1)
    AND role != 'admin';
  END IF;
  
  RAISE NOTICE '已為現有用戶建立 user_profiles 記錄';
END $$;

-- 3. 驗證結果
-- ============================================
SELECT 
  up.id,
  up.email,
  up.role,
  up.created_at,
  au.created_at as auth_created_at
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY au.created_at ASC;

-- ============================================
-- 注意事項：
-- ============================================
-- 1. 此腳本會為所有現有的 auth.users 用戶建立對應的 user_profiles 記錄
-- 2. 第一個用戶（按創建時間）會被設為管理員（admin）
-- 3. 其他用戶預設為操作員（operator）
-- 4. 如果某個用戶已經有 user_profiles 記錄，則不會重複建立
-- 5. 執行此腳本後，現有用戶即可正常使用系統功能（存檔、匯入、匯出等）
-- ============================================
