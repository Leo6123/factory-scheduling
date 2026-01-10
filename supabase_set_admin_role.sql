-- ============================================
-- 將指定用戶設定為管理員 (admin)
-- ============================================
-- 此腳本用於將 leo.chang@avient.com 設定為管理員角色
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

-- 2. 更新或建立 user_profiles 記錄，將角色設為 admin
-- ============================================
DO $$
DECLARE
  target_email TEXT := 'leo.chang@avient.com';
  target_user_id UUID;
BEGIN
  -- 檢查目標用戶是否存在
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '❌ 用戶不存在: %。請先在 Supabase Auth 中建立此用戶。', target_email;
  END IF;
  
  -- 使用 INSERT ... ON CONFLICT 來更新或建立記錄
  INSERT INTO public.user_profiles (id, email, role, updated_at)
  VALUES (target_user_id, target_email, 'admin', NOW())
  ON CONFLICT (id) 
  DO UPDATE 
    SET role = 'admin',
        updated_at = NOW();
  
  RAISE NOTICE '✅ 已將用戶 % (ID: %) 設定為管理員 (admin)', target_email, target_user_id;
END $$;

-- 3. 驗證結果
-- ============================================
SELECT 
  au.id as user_id,
  au.email,
  up.role,
  up.updated_at as last_updated,
  CASE 
    WHEN up.id IS NULL THEN '❌ 缺少 user_profiles 記錄'
    WHEN up.role = 'admin' THEN '✅ 已設為管理員'
    ELSE '⚠️ 角色: ' || up.role
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'leo.chang@avient.com';

-- ============================================
-- 執行說明：
-- ============================================
-- 1. 將此腳本複製到 Supabase Dashboard > SQL Editor
-- 2. 點擊「Run」執行
-- 3. 檢查驗證結果，確認 status 顯示為「✅ 已設為管理員」
-- 4. 用戶需要重新登入才會看到新的角色
-- ============================================
