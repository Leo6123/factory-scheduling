-- ============================================
-- 檢查並修復 ali.liu@avient.com 的角色
-- ============================================

-- 步驟 1：檢查用戶是否在 auth.users 中
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'ali.liu@avient.com';

-- 步驟 2：檢查用戶在 user_profiles 中的角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';

-- 步驟 3：如果查詢結果顯示角色不是 'viewer'，或者沒有記錄，執行以下 SQL
-- （先執行步驟 1 取得 UUID，然後替換 YOUR_USER_ID）

-- 情況 A：如果用戶在 user_profiles 中，但角色不是 'viewer'
-- UPDATE public.user_profiles
-- SET 
--   role = 'viewer',
--   updated_at = NOW()
-- WHERE email = 'ali.liu@avient.com';

-- 情況 B：如果用戶不在 user_profiles 中，需要創建記錄
-- （先執行步驟 1 取得 UUID，然後替換 YOUR_USER_ID）
-- INSERT INTO public.user_profiles (id, email, role)
-- VALUES (
--   'YOUR_USER_ID',  -- 從步驟 1 複製的 UUID
--   'ali.liu@avient.com',
--   'viewer'  -- 設為 viewer 角色
-- )
-- ON CONFLICT (id) DO UPDATE SET 
--   email = EXCLUDED.email, 
--   role = EXCLUDED.role, 
--   updated_at = NOW();

-- 步驟 4：驗證更新結果
-- SELECT id, email, role, updated_at
-- FROM public.user_profiles 
-- WHERE email = 'ali.liu@avient.com';
