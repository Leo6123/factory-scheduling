-- ============================================
-- 檢查並修復所有 viewer 用戶的角色
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

-- 步驟 2：檢查特定用戶的角色（ali.liu@avient.com 和 david.hung@avient.com）
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
-- （這種情況下，系統會使用默認角色 operator，而不是 viewer）
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN up.id IS NULL THEN '⚠️ 缺少 user_profiles 記錄（會使用默認角色 operator）'
    WHEN up.role != 'viewer' THEN CONCAT('⚠️ 角色是: ', up.role, '（不是 viewer）')
    ELSE '✅ 正確設定為 viewer'
  END as status,
  up.role as current_role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY au.email;

-- 步驟 4：批量更新這些用戶為 viewer 角色（如果需要）
-- 注意：先執行步驟 1、2、3 確認問題，然後再執行以下 SQL

-- 情況 A：如果用戶在 user_profiles 中，但角色不是 'viewer'
-- UPDATE public.user_profiles
-- SET 
--   role = 'viewer',
--   updated_at = NOW()
-- WHERE email IN (
--   'ali.liu@avient.com',
--   'david.hung@avient.com'
-- );

-- 情況 B：如果用戶不在 user_profiles 中，需要創建記錄
-- 先執行以下 SQL 查詢 UUID：
-- SELECT id, email 
-- FROM auth.users 
-- WHERE email IN (
--   'ali.liu@avient.com',
--   'david.hung@avient.com'
-- );
-- 然後使用查到的 UUID 創建 user_profiles 記錄（替換 YOUR_USER_ID）：
-- INSERT INTO public.user_profiles (id, email, role)
-- VALUES 
--   ('YOUR_USER_ID_1', 'ali.liu@avient.com', 'viewer'),
--   ('YOUR_USER_ID_2', 'david.hung@avient.com', 'viewer')
-- ON CONFLICT (id) DO UPDATE SET 
--   email = EXCLUDED.email, 
--   role = EXCLUDED.role, 
--   updated_at = NOW();

-- 步驟 5：驗證更新結果
-- SELECT id, email, role, updated_at
-- FROM public.user_profiles 
-- WHERE email IN (
--   'ali.liu@avient.com',
--   'david.hung@avient.com'
-- )
-- ORDER BY email;
