# 登入問題排查指南

## 問題：登入時顯示 "Invalid login credentials" 或 400 Bad Request

---

## 快速檢查清單

### 1. 確認用戶存在

在 Supabase SQL Editor 執行：

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  confirmed_at
FROM auth.users
WHERE email = 'leo.chang@avient.com';
```

**檢查項目：**
- ✅ `email_confirmed_at` 或 `confirmed_at` 應該有值（如果沒有，用戶需要確認 email）
- ✅ `email` 必須完全正確（大小寫不敏感）

---

### 2. 檢查用戶狀態

```sql
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  banned_until IS NULL as not_banned,
  deleted_at IS NULL as not_deleted,
  created_at
FROM auth.users
WHERE email = 'leo.chang@avient.com';
```

**應該看到：**
- `email_confirmed`: `true`
- `not_banned`: `true`
- `not_deleted`: `true`

---

### 3. 重置密碼（如果忘記或密碼錯誤）

#### 方法 A：通過 Supabase Dashboard（推薦）

1. 進入 Supabase Dashboard > **Authentication** > **Users**
2. 找到 `leo.chang@avient.com`
3. 點擊用戶行右側的 **三個點（...）** 或直接點擊用戶
4. 在用戶詳情頁面中：
   - 找到 **"Reset Password"** 按鈕
   - 點擊後會發送重設密碼郵件到 `leo.chang@avient.com`
5. 檢查郵件並點擊重設密碼連結
6. 設定新密碼

#### 方法 B：通過 SQL 直接更新密碼（僅用於測試環境）

```sql
-- ⚠️ 警告：僅用於測試環境，生產環境不建議使用
-- 此方法會直接設定密碼，不使用加密（不安全）
-- 建議使用方法 A（通過 Dashboard 重置）

-- 需要先安裝 pgcrypto 擴展（如果還沒有）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 更新密碼（將 'YourNewPassword123!' 改為您想要的密碼）
UPDATE auth.users
SET encrypted_password = crypt('YourNewPassword123!', gen_salt('bf'))
WHERE email = 'leo.chang@avient.com';

-- 確認 email（如果未確認）
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'leo.chang@avient.com' 
  AND email_confirmed_at IS NULL;
```

---

### 4. 確認 Email（如果需要）

如果 `email_confirmed_at` 為 `NULL`，需要確認 email。

#### 方法 A：通過 Supabase Dashboard

1. 進入 Supabase Dashboard > **Authentication** > **Settings**
2. 找到 **"Email Auth"** 區塊
3. 確認以下設定：
   - ✅ **"Enable Email Signup"** 已啟用
   - ✅ **"Confirm email"** 設定：
     - 如果設為 **"Disabled"**：用戶不需要確認 email 即可登入
     - 如果設為 **"Enabled"**：用戶必須確認 email 才能登入

#### 方法 B：手動確認 Email（用於測試）

在 SQL Editor 執行：

```sql
-- 手動確認 email（僅用於測試）
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'leo.chang@avient.com' 
  AND email_confirmed_at IS NULL;
```

---

### 5. 檢查 Supabase Auth 設定

在 Supabase Dashboard > **Authentication** > **Settings** 檢查：

1. **Email Auth** 設定：
   - ✅ **Enable Email Signup**: 已啟用
   - ✅ **Enable Email Confirmations**: 
     - 如果設為 `Enabled`，用戶必須確認 email
     - 如果設為 `Disabled`，用戶可以直接登入（推薦用於開發/測試）

2. **Site URL** 設定：
   - 應該設為您的應用 URL，例如：`https://factory-scheduling.vercel.app`
   - 或 `http://localhost:3000`（開發環境）

3. **Redirect URLs**：
   - 應該包含：`https://factory-scheduling.vercel.app/**`
   - 和：`http://localhost:3000/**`

---

### 6. 測試登入（逐步排查）

#### 步驟 1：確認用戶資料

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  created_at
FROM auth.users
WHERE email = 'leo.chang@avient.com';
```

#### 步驟 2：檢查 user_profiles 記錄

```sql
SELECT 
  up.id,
  up.email,
  up.role,
  au.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.email = 'leo.chang@avient.com';
```

#### 步驟 3：測試密碼（如果可能）

如果使用 SQL 更新了密碼，確保：
- 密碼長度至少 6 個字元
- 密碼包含字母和數字（Supabase 的預設要求）
- 沒有特殊字符問題（某些特殊字符可能需要轉義）

---

## 常見錯誤和解決方法

### 錯誤 1: "Invalid login credentials"

**可能原因：**
1. ❌ 密碼錯誤
2. ❌ Email 未確認（如果啟用了 email 確認）
3. ❌ 用戶不存在

**解決方法：**
1. 確認 email 輸入正確
2. 重置密碼（見上面的方法 A）
3. 檢查 email 確認狀態（執行上面的 SQL 查詢）

### 錯誤 2: "400 Bad Request"

**可能原因：**
1. ❌ 認證請求格式錯誤
2. ❌ Supabase 環境變數設定錯誤
3. ❌ 用戶狀態異常

**解決方法：**
1. 檢查瀏覽器控制台的詳細錯誤訊息
2. 確認環境變數 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正確
3. 檢查 Supabase Dashboard > Logs > Auth Logs 查看詳細錯誤

### 錯誤 3: "Email not confirmed"

**解決方法：**
1. 檢查郵件收件箱（包括垃圾郵件）尋找確認郵件
2. 或手動確認 email（見上面的方法 B）
3. 或關閉 email 確認要求（僅用於開發環境）

---

## 完整重置流程（如果以上都不行）

### 1. 刪除現有用戶並重新建立

在 Supabase Dashboard > **Authentication** > **Users**：
1. 找到 `leo.chang@avient.com`
2. 點擊 **刪除用戶**（⚠️ 注意：這會刪除所有相關資料）
3. 重新建立用戶：
   - 點擊 **Add User** > **Create new user**
   - Email: `leo.chang@avient.com`
   - Password: 輸入新密碼
   - ✅ **Auto Confirm User**: 勾選（重要！）
4. 執行 SQL 建立 `user_profiles` 記錄（見 `supabase_add_single_user_profile.sql`）

### 2. 驗證完整設定

執行以下查詢確認所有設定正確：

```sql
-- 完整檢查
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.banned_until IS NULL as not_banned,
  au.deleted_at IS NULL as not_deleted,
  up.role,
  CASE 
    WHEN up.id IS NULL THEN '❌ 缺少 user_profiles'
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email 未確認'
    WHEN au.banned_until IS NOT NULL THEN '❌ 用戶已被封鎖'
    WHEN au.deleted_at IS NOT NULL THEN '❌ 用戶已刪除'
    ELSE '✅ 正常'
  END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'leo.chang@avient.com';
```

**應該看到：**
- `email_confirmed`: `true`
- `not_banned`: `true`
- `not_deleted`: `true`
- `role`: `admin`
- `status`: `✅ 正常`

---

## 如果仍然無法登入

請提供以下資訊：

1. **Supabase Dashboard 用戶狀態截圖**
   - Authentication > Users > 用戶詳情

2. **瀏覽器控制台完整錯誤訊息**
   - 按 F12 > Console 標籤
   - 複製所有紅色錯誤訊息

3. **Supabase Dashboard 日誌**
   - Logs > Auth Logs
   - 找到最近的登入嘗試記錄

4. **執行過的 SQL 和結果**
   - 執行上面的驗證查詢
   - 提供查詢結果

---

## 推薦設定（開發/測試環境）

為了避免登入問題，建議在 Supabase Dashboard > **Authentication** > **Settings** 設定：

1. ✅ **Enable Email Signup**: 啟用
2. ❌ **Enable Email Confirmations**: **關閉**（用於開發/測試，方便快速登入）
3. ✅ **Auto Confirm Users**: 啟用（如果選項存在）
4. ✅ **Site URL**: 設為 `https://factory-scheduling.vercel.app`
5. ✅ **Redirect URLs**: 包含 `https://factory-scheduling.vercel.app/**` 和 `http://localhost:3000/**`

這樣設定後，建立用戶時：
- 不需要確認 email
- 可以直接使用密碼登入
- 減少登入問題
