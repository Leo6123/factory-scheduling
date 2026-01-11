-- ============================================
-- 新增 9 個 viewer（讀者）帳號
-- ============================================
-- 
-- 使用說明：
-- 1. 先在 Supabase Dashboard > Authentication > Users 中建立 9 個用戶帳號
-- 2. 複製每個用戶的 UUID
-- 3. 將下方 SQL 中的 UUID 和 email 替換為實際值
-- 4. 在 SQL Editor 中執行此腳本
--
-- ⚠️ 注意：
-- - UUID 必須用單引號包圍：'uuid-here'
-- - 每個值後面必須有逗號（最後一個值除外）
-- - 角色必須設為 'viewer'（讀者）
--
-- ============================================

-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_1',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 1）
  'viewer1@example.com',  -- Viewer 1 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_2',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 2）
  'viewer2@example.com',  -- Viewer 2 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 3
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_3',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 3）
  'viewer3@example.com',  -- Viewer 3 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 4
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_4',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 4）
  'viewer4@example.com',  -- Viewer 4 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 5
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_5',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 5）
  'viewer5@example.com',  -- Viewer 5 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 6
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_6',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 6）
  'viewer6@example.com',  -- Viewer 6 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 7
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_7',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 7）
  'viewer7@example.com',  -- Viewer 7 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 8
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_8',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 8）
  'viewer8@example.com',  -- Viewer 8 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 9
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_9',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 9）
  'viewer9@example.com',  -- Viewer 9 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- ============================================
-- 驗證是否建立成功
-- ============================================

-- 查看所有 viewer（讀者）
SELECT 
  id, 
  email, 
  role, 
  created_at,
  updated_at
FROM public.user_profiles 
WHERE role = 'viewer'
ORDER BY created_at DESC;

-- 驗證特定 viewer（使用 IN 查詢多個 email）
-- SELECT id, email, role, created_at, updated_at
-- FROM public.user_profiles 
-- WHERE email IN ('viewer1@example.com', 'viewer2@example.com', 'viewer3@example.com', 'viewer4@example.com', 'viewer5@example.com', 'viewer6@example.com', 'viewer7@example.com', 'viewer8@example.com', 'viewer9@example.com');  -- ⚠️ 替換為實際 email

-- 或者分別查詢
-- SELECT id, email, role, created_at, updated_at
-- FROM public.user_profiles 
-- WHERE email = 'viewer1@example.com';  -- ⚠️ 替換為實際 email
