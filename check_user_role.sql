-- 檢查 ali.liu@avient.com 的用戶角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';

-- 如果角色不是 viewer，執行以下 SQL 更新：
-- UPDATE public.user_profiles
-- SET 
--   role = 'viewer',
--   updated_at = NOW()
-- WHERE email = 'ali.liu@avient.com';

-- 驗證更新結果
-- SELECT id, email, role, updated_at
-- FROM public.user_profiles 
-- WHERE email = 'ali.liu@avient.com';
