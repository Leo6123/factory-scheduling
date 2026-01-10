# 登入設定指南

## 問題：登入時顯示 "Invalid login credentials"

這個錯誤表示用戶尚未在 Supabase Auth 中建立帳號，或密碼不正確。

---

## 解決方法：在 Supabase 建立用戶帳號

### 方法 1：通過 Supabase Dashboard 建立用戶（推薦）

#### 步驟 1：進入 Supabase Dashboard

1. 訪問 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 進入 **Authentication** > **Users**

#### 步驟 2：建立新用戶

1. 點擊右上角的 **Add User** 按鈕
2. 選擇 **Create new user**

3. 填寫用戶資訊：
   - **Email**: `leo.chang@avient.com`（或您的 email）
   - **Password**: 輸入您想要的密碼（至少 6 個字元）
   - **Auto Confirm User**: ✅ **請勾選此選項**（這樣用戶才能立即登入）
   - **Send invite email**: 可選（如果您想發送邀請郵件）

4. 點擊 **Create User**

#### 步驟 3：建立 user_profiles 記錄

**重要**：建立用戶後，需要執行 SQL 腳本為用戶建立 `user_profiles` 記錄，這樣用戶才能正常使用系統功能（存檔、匯入等）。

1. 進入 **SQL Editor**
2. 執行以下 SQL（將 `your-email@example.com` 改為您的 email）：

```sql
-- 為新建立的用戶建立 user_profiles 記錄
INSERT INTO public.user_profiles (id, email, role)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.user_profiles) = 0 THEN 'admin'
    ELSE 'operator'
  END as role
FROM auth.users au
WHERE au.email = 'your-email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
  );
```

**或者**，如果有多個用戶需要建立記錄，執行 `supabase_add_existing_user_profile.sql` 腳本（會自動為所有用戶建立記錄）。

#### 步驟 4：驗證用戶已建立

在 SQL Editor 中執行：

```sql
-- 檢查用戶和角色
SELECT 
  au.email,
  up.role,
  au.created_at as auth_created_at,
  up.created_at as profile_created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;
```

您應該能看到：
- Email: `leo.chang@avient.com`
- Role: `admin`（如果這是第一個用戶）或 `operator`

#### 步驟 5：嘗試登入

1. 返回應用程式登入頁面
2. 輸入 email 和剛才設定的密碼
3. 點擊「登入」

---

### 方法 2：使用 SQL 直接建立用戶（進階）

如果您熟悉 Supabase，也可以直接使用 SQL 建立用戶：

```sql
-- 注意：此方法需要管理員權限
-- Supabase 不建議直接操作 auth.users 表
-- 建議使用方法 1（通過 Dashboard）
```

---

## 常見問題

### Q1: 登入後一直重定向到登入頁面

**原因**：
- `user_profiles` 表中沒有該用戶的記錄
- RLS 政策阻止訪問

**解決方法**：
1. 執行 `supabase_add_existing_user_profile.sql` 腳本
2. 或手動為用戶建立 `user_profiles` 記錄（見上面步驟 3）

### Q2: 建立用戶後仍然無法登入

**檢查項目**：
1. ✅ 確認 Email 輸入正確
2. ✅ 確認密碼輸入正確（注意大小寫）
3. ✅ 確認在 Supabase Dashboard > Authentication > Users 中能看到該用戶
4. ✅ 確認 "Auto Confirm User" 已勾選
5. ✅ 確認 `user_profiles` 表中有該用戶的記錄

**查看錯誤日誌**：
- 在 Supabase Dashboard > Logs > Auth Logs 中查看詳細錯誤訊息

### Q3: 忘記密碼

**方法 1：通過 Supabase Dashboard 重置**

1. 進入 Supabase Dashboard > Authentication > Users
2. 找到該用戶
3. 點擊 **Reset Password**（會發送重設密碼郵件）

**方法 2：通過應用程式（如果已實作）**

目前應用程式尚未實作「忘記密碼」功能，建議使用方法 1。

### Q4: 如何將用戶設為管理員？

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'leo.chang@avient.com';
```

### Q5: 如何刪除用戶？

1. 在 Supabase Dashboard > Authentication > Users 中刪除用戶
2. 由於設定了 `ON DELETE CASCADE`，`user_profiles` 表中的記錄會自動刪除

---

## 驗證設定

執行以下 SQL 查詢來驗證所有設定：

```sql
-- 1. 檢查所有用戶
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 2. 檢查所有 user_profiles
SELECT id, email, role, created_at 
FROM public.user_profiles 
ORDER BY created_at DESC;

-- 3. 檢查用戶是否都有對應的 user_profiles 記錄
SELECT 
  au.email,
  CASE 
    WHEN up.id IS NULL THEN '❌ 缺少 user_profiles 記錄'
    ELSE '✅ 正常'
  END as status,
  up.role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;
```

---

## 下一步

設定完成後，請：
1. ✅ 測試登入功能
2. ✅ 測試存檔功能（確認權限正確）
3. ✅ 測試匯入/匯出功能（確認角色權限）

---

## 需要協助？

如果仍有問題，請：
1. 檢查 Supabase Dashboard > Logs 中的錯誤日誌
2. 檢查瀏覽器控制台 (F12) 的錯誤訊息
3. 參考 [SECURITY_SETUP_GUIDE.md](./SECURITY_SETUP_GUIDE.md)
