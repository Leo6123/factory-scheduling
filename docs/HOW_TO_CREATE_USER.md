# 如何建立和設定排程員帳號

## 📋 概述

系統使用 Supabase Auth 進行身份驗證，用戶角色（admin/operator/viewer）儲存在 `user_profiles` 表中。

---

## 🔧 方法 1：在 Supabase Dashboard 中手動建立（推薦）

### 步驟 1：建立用戶帳號（Supabase Auth）

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 前往 **Authentication** > **Users**
4. 點擊 **Add user** > **Create new user**
5. 填寫：
   - **Email**: 用戶的電子郵件（例如：operator@example.com）
   - **Password**: 設定密碼
   - **Auto Confirm User**: ✅ 勾選（自動確認用戶，不需要驗證郵件）
6. 點擊 **Create user**

### 步驟 2：在 user_profiles 表中設定角色

1. 前往 **Database** > **Tables** > **user_profiles**
2. 點擊 **Insert row**（或使用 SQL Editor）

#### 選項 A：使用 SQL Editor（推薦）

```sql
-- 先查詢剛剛建立的用戶 ID
SELECT id, email FROM auth.users WHERE email = 'operator@example.com';

-- 將 operator@example.com 替換為實際的用戶 email
-- 複製返回的 id（UUID）

-- 插入 user_profiles 記錄（將 YOUR_USER_ID 替換為實際的 UUID）
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID',  -- 從上一步複製的 UUID
  'operator@example.com',
  'operator'  -- 角色：admin, operator, 或 viewer
);
```

#### 選項 B：使用 Table Editor

1. 在 `user_profiles` 表的 **Table Editor** 中點擊 **Insert row**
2. 填寫：
   - **id**: 從 `auth.users` 表中複製用戶的 UUID
   - **email**: 用戶的電子郵件
   - **role**: `operator`（排程員）或 `admin`（管理員）或 `viewer`（訪客）
3. 點擊 **Save**

---

## 🔧 方法 2：使用 SQL 腳本批量建立

### 建立單一用戶（手動提供 UUID）

使用文件：`supabase_add_single_user_profile.sql`

```sql
-- 步驟 1：在 Supabase Dashboard > Authentication > Users 中建立用戶
-- 步驟 2：複製用戶的 UUID
-- 步驟 3：執行以下 SQL（替換 YOUR_USER_ID 和 email）

INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID',  -- 從 auth.users 表獲取的 UUID
  'operator@example.com',
  'operator'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();
```

### 為現有用戶建立 profile（使用 email 查找）

使用文件：`supabase_add_existing_user_profile.sql`

```sql
-- 如果用戶已經在 auth.users 中存在，可以使用 email 來建立 profile
INSERT INTO public.user_profiles (id, email, role)
SELECT 
  id,
  email,
  'operator'  -- 設定為排程員
FROM auth.users
WHERE email = 'operator@example.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = EXCLUDED.role,
  updated_at = NOW();
```

---

## 🔧 方法 3：建立完整的 SQL 腳本（包含建立用戶和 profile）

### 步驟 1：在 Supabase Dashboard 中建立用戶

1. 前往 **Authentication** > **Users** > **Add user**
2. 建立用戶並複製 UUID

### 步驟 2：執行以下 SQL 腳本

```sql
-- 建立排程員帳號（將以下值替換為實際值）
-- 注意：必須先在 Supabase Dashboard 中建立 auth.users 記錄

-- 替換變數：
-- - YOUR_USER_ID: 從 auth.users 表獲取的 UUID
-- - operator@example.com: 用戶的電子郵件
-- - operator: 角色（admin, operator, viewer）

INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID',  -- ⚠️ 替換為實際的 UUID
  'operator@example.com',  -- ⚠️ 替換為實際的 email
  'operator'  -- ⚠️ 可以改為 'admin' 或 'viewer'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 驗證是否建立成功
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles
WHERE email = 'operator@example.com';
```

---

## 📝 完整範例：建立排程員帳號

### 假設要建立：
- Email: `operator@factory.com`
- 角色: `operator`（排程員）

### 步驟 1：在 Supabase Dashboard 建立用戶

1. **Authentication** > **Users** > **Add user** > **Create new user**
2. Email: `operator@factory.com`
3. Password: 設定密碼（例如：`TempPassword123!`）
4. ✅ Auto Confirm User
5. 點擊 **Create user**
6. 複製用戶的 **UUID**（例如：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`）

### 步驟 2：在 SQL Editor 中執行

```sql
-- 插入排程員 profile
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- 從步驟 1 複製的 UUID
  'operator@factory.com',
  'operator'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = NOW();

-- 驗證
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles
WHERE email = 'operator@factory.com';
```

### 步驟 3：測試登入

1. 前往系統登入頁面
2. 使用 `operator@factory.com` 和設定的密碼登入
3. 確認用戶角色顯示為「排程員」

---

## 🔍 檢查現有用戶和角色

```sql
-- 查看所有用戶及其角色
SELECT 
  up.id,
  up.email,
  up.role,
  up.created_at,
  up.updated_at,
  CASE 
    WHEN up.role = 'admin' THEN '✅ 管理員'
    WHEN up.role = 'operator' THEN '✅ 排程員'
    WHEN up.role = 'viewer' THEN '✅ 訪客'
    ELSE '❌ 未定義'
  END as role_description
FROM public.user_profiles up
ORDER BY up.role, up.email;

-- 查看哪些用戶還沒有 profile（需要建立）
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN up.id IS NULL THEN '⚠️ 缺少 user_profiles 記錄'
    ELSE '✅ 已有 profile'
  END as profile_status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.email;
```

---

## 🔄 修改現有用戶的角色

```sql
-- 將用戶角色從 operator 改為 admin
UPDATE public.user_profiles
SET 
  role = 'admin',  -- 改為 admin, operator, 或 viewer
  updated_at = NOW()
WHERE email = 'operator@factory.com';

-- 驗證
SELECT email, role, updated_at
FROM public.user_profiles
WHERE email = 'operator@factory.com';
```

---

## ⚠️ 注意事項

1. **必須先建立 auth.users 記錄**：
   - 不能直接在 `user_profiles` 表中建立用戶
   - 必須先使用 Supabase Dashboard 或 API 建立 `auth.users` 記錄
   - `user_profiles.id` 必須對應到 `auth.users.id`

2. **角色選項**：
   - `admin`：管理員（所有權限，包括匯入建議排程）
   - `operator`：排程員（所有權限，但**不能**匯入建議排程）
   - `viewer`：訪客（只能查看，不能編輯）

3. **如果用戶沒有 profile**：
   - 系統會使用默認角色 `viewer`（訪客）
   - 建議為所有用戶建立 `user_profiles` 記錄

4. **安全性**：
   - 不要將密碼儲存在 SQL 腳本中
   - 使用強密碼
   - 定期檢查用戶角色設定

---

## 📚 相關文件

- `supabase_add_single_user_profile.sql` - 建立單一用戶 profile 的腳本
- `supabase_add_existing_user_profile.sql` - 為現有用戶建立 profile 的腳本
- `supabase_fix_rls_complete.sql` - RLS 政策設定（包含 user_profiles 表結構）
- `src/types/auth.ts` - 權限定義

---

## ✅ 快速檢查清單

建立排程員帳號時，確保：

- [ ] 在 Supabase Dashboard > Authentication > Users 中建立用戶
- [ ] 複製用戶的 UUID
- [ ] 在 `user_profiles` 表中插入記錄，角色設為 `operator`
- [ ] 驗證記錄是否建立成功
- [ ] 測試用戶是否可以登入
- [ ] 確認用戶角色正確顯示（「排程員」）
- [ ] 確認「匯入建議排程」按鈕**不顯示**（排程員不應該看到）
