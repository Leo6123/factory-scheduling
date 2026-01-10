-- ============================================
-- 緊急修復：將 leo.chang@avient.com 設為管理員
-- ============================================
-- 此腳本會強制更新，即使已存在記錄也會更新
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

-- 2. 強制更新為管理員（使用 INSERT ... ON CONFLICT）
-- ============================================
INSERT INTO public.user_profiles (id, email, role, updated_at)
SELECT 
  au.id,
  au.email,
  'admin'::TEXT,
  NOW()
FROM auth.users au
WHERE au.email = 'leo.chang@avient.com'
ON CONFLICT (id) 
DO UPDATE 
  SET role = 'admin',
      email = EXCLUDED.email,
      updated_at = NOW();

-- 3. 驗證結果（應該顯示 admin）
-- ============================================
SELECT 
  au.id as user_id,
  au.email,
  up.role,
  up.updated_at as last_updated,
  CASE 
    WHEN up.role = 'admin' THEN '✅ 已設為管理員'
    ELSE '❌ 角色: ' || up.role
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'leo.chang@avient.com';

-- 如果上面顯示「✅ 已設為管理員」，表示成功！
-- 然後在應用程式中登出並重新登入，應該會顯示「管理員」
