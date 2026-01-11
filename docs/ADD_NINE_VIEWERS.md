# 新增 9 個 Viewer（讀者）帳號 - 完整步驟指南

## 📋 概述

本指南將協助您新增 9 個 viewer（讀者）帳號。每個帳號需要兩個步驟：
1. 在 Supabase Dashboard 中建立用戶帳號（Authentication）
2. 在資料庫中建立 user_profiles 記錄並設定角色為 `viewer`

**Viewer 角色權限**：
- ✅ 可以查看排程資料（卡片視圖和時間軸視圖）
- ✅ 可以選擇日期和批號查詢
- ✅ 可以切換視圖和日期範圍
- ❌ **不能**編輯任何內容
- ❌ **不能**使用左側邊欄功能
- ❌ **不能**拖曳或修改卡片

---

## 🔧 完整步驟

### 步驟 1：在 Supabase Dashboard 建立 9 個用戶帳號

對每個 viewer 重複以下步驟（共 9 次）：

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 前往 **Authentication** > **Users**
4. 點擊 **Add user** > **Create new user**
5. 填寫 Viewer 的資訊：
   - **Email**: `viewer1@example.com`（⚠️ 替換為實際 email）
   - **Password**: 設定密碼（例如：`TempPassword123!`）
   - **Auto Confirm User**: ✅ **勾選**（自動確認，不需要驗證郵件）
6. 點擊 **Create user**
7. **複製用戶的 UUID**（例如：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`）
   - UUID 會顯示在用戶列表中或用戶詳情頁面
8. 記錄 UUID 和 email（建議使用 Excel 或文字檔記錄，方便後續使用）

重複步驟 4-8，建立剩餘的 8 個 viewer 帳號。

---

### 步驟 2：在 SQL Editor 中執行腳本

1. 在 Supabase Dashboard 中前往 **SQL Editor**
2. 點擊 **New query**
3. 打開 `supabase_add_nine_viewers.sql` 文件
4. 將以下內容替換為實際值：

   **Viewer 1：**
   - `YOUR_USER_ID_1` → 從步驟 1 複製的 UUID（第 1 個 viewer）
   - `viewer1@example.com` → 實際的 email（第 1 個 viewer）

   **Viewer 2-9：**
   - 同樣方式替換對應的 UUID 和 email

5. 將修改後的 SQL 腳本複製到 SQL Editor
6. 點擊 **Run** 執行

---

## 📝 SQL 腳本範例

假設：
- **Viewer 1**: Email = `viewer1@factory.com`, UUID = `11111111-1111-1111-1111-111111111111`
- **Viewer 2**: Email = `viewer2@factory.com`, UUID = `22222222-2222-2222-2222-222222222222`
- **Viewer 3**: Email = `viewer3@factory.com`, UUID = `33333333-3333-3333-3333-333333333333`
- ...（依此類推到 Viewer 9）

執行以下 SQL：

```sql
-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',  -- 從步驟 1 複製的 UUID
  'viewer1@factory.com',  -- Viewer 1 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',  -- 從步驟 2 複製的 UUID
  'viewer2@factory.com',  -- Viewer 2 的 email
  'viewer'  -- 設為讀者角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- ...（依此類推到 Viewer 9）

-- 驗證
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles 
WHERE role = 'viewer'
ORDER BY created_at DESC;
```

---

## ✅ 驗證步驟

### 1. 檢查 user_profiles 記錄

在 SQL Editor 中執行：

```sql
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
```

應該會看到所有 viewer 帳號（包括新建立的 9 個）。

### 2. 查看所有角色統計

```sql
-- 查看所有角色的統計
SELECT 
  role,
  COUNT(*) as user_count
FROM public.user_profiles 
GROUP BY role
ORDER BY role;
```

應該會看到類似：
- `admin`: 1
- `operator`: 3（包括之前建立的）
- `viewer`: 9

### 3. 測試登入

1. 前往系統登入頁面
2. 使用其中一個 viewer 的 email 和密碼登入
3. 確認用戶角色顯示為「訪客」或「讀者」
4. 確認左側邊欄**完全隱藏**
5. 確認無法拖曳卡片
6. 確認可以查看排程、選擇日期、批號查詢
7. 確認視圖切換和日期範圍選項可用

---

## 🔍 常見問題

### Q1: 如何批量查詢所有用戶的 UUID？

在 SQL Editor 中執行：

```sql
-- 查詢所有用戶（包含 UUID 和 email），按創建時間排序
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;  -- 限制顯示最近 20 個用戶
```

### Q2: 如果忘記某個用戶的 UUID 怎麼辦？

在 Supabase Dashboard：
1. 前往 **Authentication** > **Users**
2. 找到對應的用戶
3. 點擊用戶進入詳情頁面
4. UUID 會顯示在頁面上

### Q3: 如何批量查看哪些用戶還沒有 profile？

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
-- 將用戶角色改為 viewer（讀者）
UPDATE public.user_profiles
SET 
  role = 'viewer',
  updated_at = NOW()
WHERE email = 'viewer1@example.com';  -- ⚠️ 替換為實際 email
```

### Q5: 如何批量設定多個用戶為 viewer 角色？

```sql
-- 批量設定多個用戶為 viewer 角色（使用 email 列表）
UPDATE public.user_profiles
SET 
  role = 'viewer',
  updated_at = NOW()
WHERE email IN (
  'viewer1@example.com',
  'viewer2@example.com',
  'viewer3@example.com'
  -- ... 添加更多 email
);
```

---

## 📚 相關文件

- `docs/HOW_TO_CREATE_USER.md` - 完整的用戶建立指南
- `docs/VIEWER_ROLE_PERMISSIONS.md` - Viewer 角色權限詳細說明
- `supabase_add_nine_viewers.sql` - SQL 腳本文件
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
   - `viewer`：讀者（只能查看，**不能**編輯任何內容）

3. **安全性**：
   - 不要將密碼儲存在 SQL 腳本中
   - 使用強密碼（至少 8 個字元，包含大小寫字母、數字）
   - 建議首次登入後要求使用者更改密碼

4. **密碼管理**：
   - 可以暫時將密碼提供給使用者
   - 建議使用者首次登入後更改密碼
   - 如果使用者忘記密碼，可以使用「忘記密碼」功能（已實作）

5. **Viewer 角色限制**：
   - Viewer 只能查看排程資料，無法進行任何編輯
   - 左側邊欄對 viewer 完全隱藏
   - 無法拖曳卡片或修改任何設定

---

## ✅ 快速檢查清單

建立 9 個 viewer 帳號時，確保：

- [ ] 在 Supabase Dashboard > Authentication > Users 中建立了 9 個用戶
- [ ] 複製了 9 個用戶的 UUID
- [ ] 在 SQL Editor 中執行了 `supabase_add_nine_viewers.sql` 腳本
- [ ] 已將 SQL 腳本中的 UUID 和 email 替換為實際值
- [ ] 執行了驗證查詢，確認記錄建立成功
- [ ] 測試了至少 1 個 viewer 可以登入
- [ ] 確認 viewer 的角色都顯示為「訪客」或「讀者」
- [ ] 確認左側邊欄**完全隱藏**
- [ ] 確認無法拖曳卡片
- [ ] 確認可以查看排程、選擇日期、批號查詢

---

## 💡 批量建立提示

如果需要在短時間內建立大量帳號，建議：

1. **使用 Excel 記錄**：
   - 創建一個 Excel 表格，記錄每個用戶的：
     - 序號（1-9）
     - Email
     - UUID（從 Supabase Dashboard 複製）
     - 密碼（臨時密碼）
   - 這樣可以方便管理，避免遺漏

2. **分批建立**：
   - 如果一次建立 9 個帳號覺得太多，可以分 2-3 批建立
   - 每批建立 3-4 個，確保每個都正確記錄 UUID

3. **驗證順序**：
   - 建立完所有帳號後，使用驗證 SQL 查詢確認
   - 建議測試至少 1-2 個帳號可以正常登入
