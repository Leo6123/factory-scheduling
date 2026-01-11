-- ============================================
-- 檢查所有 viewer 用戶的角色
-- ============================================

-- 步驟 1：檢查所有 viewer 用戶
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE role = 'viewer'
ORDER BY email;

-- 步驟 2：檢查特定用戶的角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY email;

-- 步驟 3：檢查這些用戶是否在 auth.users 中，但不在 user_profiles 中
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN up.id IS NULL THEN '⚠️ 缺少 user_profiles 記錄（會使用默認角色 operator）'
    WHEN up.role != 'viewer' THEN CONCAT('⚠️ 角色是: ', up.role, '（不是 viewer）')
    ELSE '✅ 正確設定為 viewer'
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY au.email;

-- 步驟 4：批量更新所有 viewer 用戶（如果需要）
-- 如果發現某些用戶的角色不是 viewer，可以使用以下 SQL 更新
-- UPDATE public.user_profiles
-- SET 
--   role = 'viewer',
--   updated_at = NOW()
-- WHERE email IN (
--   'ali.liu@avient.com',
--   'david.hung@avient.com'
-- );
