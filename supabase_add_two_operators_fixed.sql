-- ============================================
-- 新增 2 個排程員（operator）帳號 - 修正版
-- ============================================
-- 
-- 使用說明：
-- 1. 先在 Supabase Dashboard > Authentication > Users 中建立 2 個用戶帳號
-- 2. 複製每個用戶的 UUID
-- 3. 將下方 SQL 中的 UUID 和 email 替換為實際值
-- 4. 在 SQL Editor 中執行此腳本
--
-- ⚠️ 注意：
-- - UUID 必須用單引號包圍：'uuid-here'
-- - 每個值後面必須有逗號（最後一個值除外）
-- - 註解使用 -- 而不是其他符號
--
-- ============================================

-- 排程員 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_1',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（排程員 1）
  'operator1@example.com',  -- 排程員 1 的 email
  'operator'  -- 設為排程員角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- 排程員 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_2',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（排程員 2）
  'operator2@example.com',  -- 排程員 2 的 email
  'operator'  -- 設為排程員角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- ============================================
-- 驗證是否建立成功
-- ============================================

-- 查看所有排程員
SELECT 
  id, 
  email, 
  role, 
  created_at,
  updated_at
FROM public.user_profiles 
WHERE role = 'operator'
ORDER BY created_at DESC;

-- 驗證特定排程員（使用 IN 查詢多個 email）
-- SELECT id, email, role, created_at, updated_at
-- FROM public.user_profiles 
-- WHERE email IN ('operator1@example.com', 'operator2@example.com');  -- 使用 IN 而不是逗號

-- 或者分別查詢
-- SELECT id, email, role, created_at, updated_at
-- FROM public.user_profiles 
-- WHERE email = 'operator1@example.com';

-- SELECT id, email, role, created_at, updated_at
-- FROM public.user_profiles 
-- WHERE email = 'operator2@example.com';
