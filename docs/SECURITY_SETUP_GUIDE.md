# 資安設定指南 - 基本保護

本指南說明如何設置基本保護功能：身份驗證 + RLS 政策 + 角色系統。

---

## 📋 前置準備

### 1. Supabase 專案準備
- 確認 Supabase 專案已建立
- 確認環境變數已設定：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. 啟用 Supabase Auth
1. 進入 Supabase Dashboard
2. 選擇您的專案
3. 進入 **Authentication** > **Settings**
4. 確認 **Enable Email Signup** 已啟用
5. 設定 **Site URL** 為您的應用 URL（例如：`https://factory-scheduling.vercel.app`）

---

## 🔧 設定步驟

### 步驟 1：執行 SQL 腳本

1. 進入 Supabase Dashboard
2. 選擇您的專案
3. 進入 **SQL Editor**
4. 複製 `supabase_security_setup.sql` 的內容
5. 貼上並執行腳本

**重要**：執行前請備份資料庫！

### 步驟 2：建立第一個管理員帳號

#### 方法 A：通過 Supabase Dashboard（推薦）

1. 進入 **Authentication** > **Users**
2. 點擊 **Add User** > **Create new user**
3. 輸入：
   - Email: `admin@example.com`（改為您的管理員信箱）
   - Password: `your-secure-password`
   - Auto Confirm User: ✅ 勾選
4. 點擊 **Create User**

**注意**：第一個註冊的用戶會自動成為管理員（透過觸發器設定）。

#### 方法 B：手動更新角色

如果您已經有用戶，可以手動更新為管理員：

```sql
-- 將特定用戶設為管理員
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your-admin@example.com';
```

### 步驟 3：建立其他用戶帳號

1. 進入 **Authentication** > **Users**
2. 點擊 **Add User** > **Create new user**
3. 輸入 Email 和 Password
4. 點擊 **Create User**

**注意**：後續用戶預設為「操作員」角色。

### 步驟 4：驗證設定

執行以下 SQL 查詢來驗證設定：

```sql
-- 檢查 user_profiles 表
SELECT id, email, role, created_at
FROM public.user_profiles
ORDER BY created_at;

-- 檢查 RLS 政策
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

---

## 🔐 角色權限說明

### 管理員 (admin)
- ✅ 匯入訂單
- ✅ 匯出排程
- ✅ 清除全部
- ✅ 編輯排程
- ✅ 刪除項目
- ✅ 查看排程

### 操作員 (operator)
- ✅ 匯入訂單
- ✅ 匯出排程
- ❌ 清除全部（已禁用）
- ✅ 編輯排程
- ✅ 刪除項目
- ✅ 查看排程

### 訪客 (viewer)
- ❌ 匯入訂單
- ✅ 匯出排程
- ❌ 清除全部
- ❌ 編輯排程
- ❌ 刪除項目
- ✅ 查看排程

---

## 🚀 測試流程

### 1. 測試登入功能

1. 訪問應用首頁
2. 應該自動重定向到 `/login`
3. 使用管理員帳號登入
4. 應該可以看到所有功能按鈕

### 2. 測試角色權限

#### 測試管理員權限
- ✅ 應該可以看到「匯入訂單」按鈕
- ✅ 應該可以看到「匯出排程」按鈕
- ✅ 應該可以看到「清除全部」按鈕（雖然已禁用，但仍顯示）
- ✅ 應該可以編輯和刪除排程項目

#### 測試操作員權限
1. 建立一個操作員帳號
2. 使用操作員帳號登入
3. 檢查：
   - ✅ 可以看到「匯入訂單」按鈕
   - ✅ 可以看到「匯出排程」按鈕
   - ❌ 不應該看到「清除全部」按鈕
   - ✅ 可以編輯和刪除排程項目

#### 測試訪客權限
1. 將用戶角色設為 `viewer`：
   ```sql
   UPDATE public.user_profiles
   SET role = 'viewer'
   WHERE email = 'viewer@example.com';
   ```
2. 使用訪客帳號登入
3. 檢查：
   - ❌ 不應該看到「匯入訂單」按鈕
   - ✅ 可以看到「匯出排程」按鈕
   - ❌ 不應該看到任何編輯功能
   - ✅ 只能查看排程

### 3. 測試 RLS 政策

執行以下測試來驗證 RLS 政策是否正確運作：

```sql
-- 測試：未登入用戶應該無法訪問數據（應該返回空結果）
-- 這個測試需要在應用中進行，因為 SQL Editor 會繞過 RLS

-- 測試：已登入用戶應該可以查看數據
-- 在應用中使用不同角色的用戶登入，檢查是否可以訪問數據
```

---

## 🛠️ 常見問題

### Q1: 登入後一直重定向到登入頁面

**原因**：Supabase Auth 會話未正確建立。

**解決方案**：
1. 檢查 Supabase Auth 設定是否正確
2. 確認 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 環境變數是否正確
3. 檢查瀏覽器控制台是否有錯誤訊息
4. 清除瀏覽器快取和 Cookie

### Q2: 第一個用戶不是管理員

**原因**：觸發器可能未正確執行。

**解決方案**：
```sql
-- 手動將第一個用戶設為管理員
UPDATE public.user_profiles
SET role = 'admin'
WHERE id = (SELECT id FROM public.user_profiles ORDER BY created_at LIMIT 1);
```

### Q3: RLS 政策阻止所有操作 / 無法存檔

**原因**：`user_profiles` 表中沒有該用戶的記錄，導致 RLS 政策拒絕操作。

**解決方案（選擇其中一個）：**

#### 方法 A：使用 SQL 腳本自動建立記錄（推薦）

1. 在 Supabase SQL Editor 中執行 `supabase_add_existing_user_profile.sql`
2. 這會為所有現有的 `auth.users` 用戶自動建立對應的 `user_profiles` 記錄
3. 第一個用戶會自動成為管理員（admin），其他用戶預設為操作員（operator）

#### 方法 B：手動建立記錄

```sql
-- 為特定用戶建立 user_profiles 記錄
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'your-user-id-here',  -- 從 auth.users 表中獲取的用戶 ID
  'user@example.com',   -- 用戶的 email
  'admin'               -- 角色：'admin', 'operator', 或 'viewer'
);
```

**獲取用戶 ID 的方法：**
1. 在 Supabase Dashboard > Authentication > Users 中找到用戶
2. 複製用戶的 UUID（ID）
3. 或在 SQL Editor 中執行：
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```

#### 方法 C：重新註冊用戶（如果用戶較少）

1. 刪除現有用戶（Supabase Dashboard > Authentication > Users）
2. 重新註冊（會自動觸發 `handle_new_user` 函數建立 `user_profiles` 記錄）

### Q4: 無法看到功能按鈕

**原因**：權限檢查失敗。

**解決方案**：
1. 檢查用戶角色是否正確
2. 檢查 `ROLE_PERMISSIONS` 設定是否正確
3. 查看瀏覽器控制台是否有錯誤訊息

---

## 📝 更新用戶角色

### 將用戶設為管理員

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'user@example.com';
```

### 將用戶設為操作員

```sql
UPDATE public.user_profiles
SET role = 'operator'
WHERE email = 'user@example.com';
```

### 將用戶設為訪客

```sql
UPDATE public.user_profiles
SET role = 'viewer'
WHERE email = 'user@example.com';
```

---

## 🔒 安全建議

### 1. 生產環境設定

- ✅ 使用強密碼政策
- ✅ 啟用 Email 驗證
- ✅ 啟用多因素驗證（MFA）（Supabase 支援）
- ✅ 定期審查用戶角色和權限
- ✅ 監控異常登入行為

### 2. 資料庫安全

- ✅ 定期備份資料庫
- ✅ 限制資料庫訪問 IP（如可能）
- ✅ 定期審查 RLS 政策
- ✅ 監控資料庫操作日誌

### 3. 應用安全

- ✅ 使用 HTTPS（Vercel 自動提供）
- ✅ 定期更新依賴套件
- ✅ 移除開發環境調試代碼
- ✅ 實施錯誤監控（例如 Sentry）

---

## 📚 相關文檔

- [Supabase Auth 文檔](https://supabase.com/docs/guides/auth)
- [Supabase RLS 文檔](https://supabase.com/docs/guides/auth/row-level-security)
- [資安建議文檔](./SECURITY_RECOMMENDATIONS.md)

---

## 🆘 需要協助？

如果遇到問題，請：
1. 檢查瀏覽器控制台錯誤訊息
2. 檢查 Supabase Dashboard 的日誌
3. 參考 [常見問題](#-常見問題) 部分
4. 查看相關文檔
