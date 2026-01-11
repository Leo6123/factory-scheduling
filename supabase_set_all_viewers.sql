-- ============================================
-- 設置所有 Viewer 用戶角色
-- ============================================
-- 此腳本將 9 個用戶設置為 viewer 角色
-- 如果用戶已存在，則更新角色為 viewer
-- 如果用戶不存在，則創建新記錄
-- ============================================

-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '434c8e6e-d5fa-4c1a-a967-505a146a4d82',  -- ali.liu@avient.com
  'ali.liu@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '091c1409-c47e-46d4-a841-c1a24a6458cc',  -- david.hung@avient.com
  'david.hung@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 3
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'd9003281-b80b-4016-8b64-8343e1455b3b',  -- eva.cheng@avient.com
  'eva.cheng@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 4
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '12ed8471-4327-48a2-8335-b133f8dcb376',  -- flora.hsiao@avient.com
  'flora.hsiao@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 5
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'cc451e88-f135-4c49-b8b0-eaa61974848d',  -- jc.huang@avient.com
  'jc.huang@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 6
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'db8cd8cf-de1a-44a7-9101-3215052c2cd7',  -- kelly.chien@avient.com
  'kelly.chien@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 7
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'a376d328-842e-46d9-9d43-16b0bc1e32d6',  -- vicky.zhao@avient.com
  'vicky.zhao@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 8
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '820aeb82-8ccc-487e-b1c6-0b3cbd807a59',  -- vincent.chen@avient.com
  'vincent.chen@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 9
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'b0a04081-62bd-4f61-881f-dc18c7dae173',  -- wenchi.chen@avient.com
  'wenchi.chen@avient.com',
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- ============================================
-- 驗證是否建立成功
-- ============================================
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
