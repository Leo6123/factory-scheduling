-- ============================================
-- 新增 9 個 viewer（讀者）帳號 - 完整執行腳本
-- ============================================

-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '434c8e6e-d5fa-4c1a-a967-505a146a4d82',  -- 替換為實際 UUID
  'ali.liu@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '091c1409-c47e-46d4-a841-c1a24a6458cc',  -- 替換為實際 UUID
  'david.hung@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 3
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'd9003281-b80b-4016-8b64-8343e1455b3b',  -- 替換為實際 UUID
  'eva.cheng@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 4
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '12ed8471-4327-48a2-8335-b133f8dcb376',  -- 替換為實際 UUID
  'flora.hsiao@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 5
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'cc451e88-f135-4c49-b8b0-eaa61974848d',  -- 替換為實際 UUID
  'jc.huang@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 6
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'db8cd8cf-de1a-44a7-9101-3215052c2cd7',  -- 替換為實際 UUID
  'kelly.chien@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 7
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'a376d328-842e-46d9-9d43-16b0bc1e32d6',  -- 替換為實際 UUID
  'vicky.zhao@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 8
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '820aeb82-8ccc-487e-b1c6-0b3cbd807a59',  -- 替換為實際 UUID
  'vincent.chen@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 9
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'b0a04081-62bd-4f61-881f-dc18c7dae173',  -- 替換為實際 UUID
  'wenchi.chen@avient.com',  -- 替換為實際 email
  'viewer'
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

-- 驗證特定 9 個 viewer
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com',
  'eva.cheng@avient.com',
  'flora.hsiao@avient.com',
  'jc.huang@avient.com',
  'kelly.chien@avient.com',
  'vicky.zhao@avient.com',
  'vincent.chen@avient.com',
  'wenchi.chen@avient.com'
)
ORDER BY email;

-- 統計各角色數量
SELECT 
  role,
  COUNT(*) as user_count
FROM public.user_profiles 
GROUP BY role
ORDER BY role;
