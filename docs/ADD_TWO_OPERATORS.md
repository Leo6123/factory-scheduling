# 新增 2 個排程員帳號 - 完整步驟指南

## 📋 概述

本指南將協助您新增 2 個排程員（operator）帳號。每個帳號需要兩個步驟：
1. 在 Supabase Dashboard 中建立用戶帳號（Authentication）
2. 在資料庫中建立 user_profiles 記錄並設定角色為 `operator`

---

## 🔧 完整步驟

### 步驟 1：在 Supabase Dashboard 建立第 1 個排程員帳號

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 前往 **Authentication** > **Users**
4. 點擊 **Add user** > **Create new user**
5. 填寫第 1 個排程員的資訊：
   - **Email**: `operator1@example.com`（⚠️ 替換為實際 email）
   - **Password**: 設定密碼（例如：`TempPassword123!`）
   - **Auto Confirm User**: ✅ **勾選**（自動確認，不需要驗證郵件）
6. 點擊 **Create user**
7. **複製用戶的 UUID**（例如：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`）
   - UUID 會顯示在用戶列表中或用戶詳情頁面

### 步驟 2：在 Supabase Dashboard 建立第 2 個排程員帳號

重複步驟 1，但填寫第 2 個排程員的資訊：
- **Email**: `operator2@example.com`（⚠️ 替換為實際 email）
- **Password**: 設定密碼（例如：`TempPassword456!`）
- **Auto Confirm User**: ✅ **勾選**
- **複製用戶的 UUID**

---

### 步驟 3：在 SQL Editor 中執行腳本

1. 在 Supabase Dashboard 中前往 **SQL Editor**
2. 點擊 **New query**
3. 打開 `supabase_add_two_operators.sql` 文件
4. 將以下內容替換為實際值：

   **排程員 1：**
   - `YOUR_USER_ID_1` → 從步驟 1 複製的 UUID（第 1 個排程員）
   - `operator1@example.com` → 實際的 email（第 1 個排程員）

   **排程員 2：**
   - `YOUR_USER_ID_2` → 從步驟 2 複製的 UUID（第 2 個排程員）
   - `operator2@example.com` → 實際的 email（第 2 個排程員）

5. 將修改後的 SQL 腳本複製到 SQL Editor
6. 點擊 **Run** 執行

---

## 📝 SQL 腳本範例

假設：
- **排程員 1**: Email = `operator1@factory.com`, UUID = `11111111-1111-1111-1111-111111111111`
- **排程員 2**: Email = `operator2@factory.com`, UUID = `22222222-2222-2222-2222-222222222222`

執行以下 SQL：

```sql
-- 排程員 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',  -- 從步驟 1 複製的 UUID
  'operator1@factory.com',  -- 排程員 1 的 email
  'operator'  -- 設為排程員角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- 排程員 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',  -- 從步驟 2 複製的 UUID
  'operator2@factory.com',  -- 排程員 2 的 email
  'operator'  -- 設為排程員角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- 驗證
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles 
WHERE role = 'operator'
ORDER BY created_at DESC;
```

---

## ✅ 驗證步驟

### 1. 檢查 user_profiles 記錄

在 SQL Editor 中執行：

```sql
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
```

應該會看到 3 個排程員（包括之前建立的 `cti912@hotmail.com`）。

### 2. 測試登入

1. 前往系統登入頁面
2. 使用第 1 個排程員的 email 和密碼登入
3. 確認用戶角色顯示為「操作員」或「排程員」
4. 確認「匯入建議排程」按鈕**不顯示**（排程員不應該看到）
5. 登出，使用第 2 個排程員的 email 和密碼登入
6. 重複步驟 3-4

---

## 🔍 常見問題

### Q1: 如何查詢已建立的用戶 UUID？

在 SQL Editor 中執行：

```sql
-- 查詢所有用戶（包含 UUID 和 email）
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

### Q2: 如果忘記用戶 UUID 怎麼辦？

在 Supabase Dashboard：
1. 前往 **Authentication** > **Users**
2. 找到對應的用戶
3. 點擊用戶進入詳情頁面
4. UUID 會顯示在頁面上

### Q3: 如何批量查詢哪些用戶還沒有 profile？

```sql
-- 查看哪些用戶還沒有 user_profiles 記錄
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
WHERE up.id IS NULL  -- 只顯示沒有 profile 的用戶
ORDER BY au.email;
```

### Q4: 如何修改已建立用戶的角色？

```sql
-- 將用戶角色改為 operator（排程員）
UPDATE public.user_profiles
SET 
  role = 'operator',
  updated_at = NOW()
WHERE email = 'operator1@example.com';  -- ⚠️ 替換為實際 email
```

---

## 📚 相關文件

- `docs/HOW_TO_CREATE_USER.md` - 完整的用戶建立指南
- `supabase_add_two_operators.sql` - SQL 腳本文件
- `src/types/auth.ts` - 角色和權限定義

---

## ⚠️ 注意事項

1. **必須先建立 auth.users 記錄**：
   - 不能直接在 `user_profiles` 表中建立用戶
   - 必須先使用 Supabase Dashboard 建立 `auth.users` 記錄
   - `user_profiles.id` 必須對應到 `auth.users.id`

2. **角色選項**：
   - `admin`：管理員（所有權限，包括匯入建議排程）
   - `operator`：排程員（所有權限，但**不能**匯入建議排程）
   - `viewer`：訪客（只能查看，不能編輯）

3. **安全性**：
   - 不要將密碼儲存在 SQL 腳本中
   - 使用強密碼（至少 8 個字元，包含大小寫字母、數字）
   - 建議首次登入後要求使用者更改密碼

4. **密碼管理**：
   - 可以暫時將密碼提供給使用者
   - 建議使用者首次登入後更改密碼
   - 如果使用者忘記密碼，可以使用「忘記密碼」功能（已實作）

---

## ✅ 快速檢查清單

建立 2 個排程員帳號時，確保：

- [ ] 在 Supabase Dashboard > Authentication > Users 中建立了 2 個用戶
- [ ] 複製了 2 個用戶的 UUID
- [ ] 在 SQL Editor 中執行了 `supabase_add_two_operators.sql` 腳本
- [ ] 已將 SQL 腳本中的 UUID 和 email 替換為實際值
- [ ] 執行了驗證查詢，確認記錄建立成功
- [ ] 測試了 2 個排程員都可以登入
- [ ] 確認 2 個排程員的角色都顯示為「操作員」或「排程員」
- [ ] 確認「匯入建議排程」按鈕**不顯示**（排程員不應該看到）
