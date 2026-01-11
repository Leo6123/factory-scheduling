# 排查 Viewer 權限問題

## 📋 問題描述

SQL 已成功執行（9 個用戶都設置為 `viewer` 角色），但登錄後仍然可以看到：
- ❌ 左側邊欄（未排程區域）
- ❌ 配方列表內容（展開狀態）

## 🔍 可能原因

### 原因 1：用戶沒有重新登錄（Session 仍在使用舊的角色信息）

**最可能的原因**：Supabase 的 session 會緩存用戶信息，即使資料庫中的角色已經更新，**當前 session 中的角色信息可能還是舊的**。

### 原因 2：瀏覽器快取問題

瀏覽器可能緩存了舊的 JavaScript 代碼或 session 信息。

### 原因 3：代碼沒有正確部署到生產環境

雖然代碼已經修改並提交，但可能還沒有部署到 Vercel。

## 🔧 解決步驟

### 步驟 1：完全登出並清除瀏覽器資料

**重要：必須完全清除 session 和快取**

1. **登出系統**：
   - 點擊右上角的「登出」按鈕
   - 確保完全登出

2. **清除瀏覽器快取和 Cookie**：
   - 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
   - 選擇以下選項：
     - ✅ **Cookie 和其他網站資料**（必須）
     - ✅ **快取的圖片和檔案**（必須）
     - ✅ **瀏覽記錄**（可選，但建議）
   - 時間範圍選擇「全部時間」
   - 點擊「清除資料」

3. **關閉所有瀏覽器標籤**：
   - 不要只關閉一個標籤
   - 必須完全關閉所有瀏覽器標籤（或整個瀏覽器）

4. **重新打開瀏覽器**：
   - 重新打開瀏覽器
   - 前往 `https://factory-scheduling.vercel.app/login`
   - 重新登錄

### 步驟 2：檢查瀏覽器控制台

登錄後，按 `F12` 打開開發者工具，查看 Console 標籤：

#### 應該看到的訊息：

```
🔍 [Auth] 開始獲取用戶角色，用戶 ID: 434c8e6e-d5fa-4c1a-a967-505a146a4d82 Email: ali.liu@avient.com
✅ [Auth] 獲取用戶角色成功: viewer Email: ali.liu@avient.com
```

#### 如果看到錯誤訊息：

- `⚠️ [Auth] user_profiles 中沒有該用戶記錄`：表示用戶沒有在 `user_profiles` 表中
- `⚠️ [Auth] 獲取用戶角色失敗，使用默認角色 operator`：表示查詢失敗，使用了默認角色

### 步驟 3：驗證用戶角色（SQL 查詢）

在 Supabase SQL Editor 中執行：

```sql
-- 檢查特定用戶的角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

**確認**：
- ✅ `role` 欄位應該是 `viewer`
- ✅ `updated_at` 時間戳應該是最新的（剛才執行 SQL 的時間）

### 步驟 4：確認代碼已部署

1. **檢查 Vercel 部署狀態**：
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 選擇專案
   - 確認最新的部署已完成且沒有錯誤

2. **檢查部署時間**：
   - 確認最新的部署時間是否在修改代碼之後
   - 如果沒有部署，需要觸發部署（例如：push 到 GitHub）

### 步驟 5：強制重新載入頁面

如果步驟 1-4 都正確，但仍然看到問題，嘗試：

1. **硬重新載入**：
   - 按 `Ctrl + Shift + R`（Windows）或 `Cmd + Shift + R`（Mac）
   - 這會強制重新載入所有資源，忽略快取

2. **使用隱私模式（無痕模式）**：
   - 打開新的隱私/無痕視窗
   - 前往 `https://factory-scheduling.vercel.app/login`
   - 登錄測試
   - 如果隱私模式下正常工作，說明是瀏覽器快取問題

## 🎯 預期結果

登錄後應該看到：

### Viewer（訪客）角色：

- ✅ **用戶顯示為「訪客」（Guest）**
- ✅ **左側邊欄完全隱藏**（未排程區域不顯示）
- ✅ **配方列表不顯示**（只顯示「看配方: (X 項)」標籤）
- ✅ **無法拖曳卡片**
- ✅ **無法編輯任何內容**

### 控制台日誌：

```
🔍 [Auth] 開始獲取用戶角色，用戶 ID: ... Email: ali.liu@avient.com
✅ [Auth] 獲取用戶角色成功: viewer Email: ali.liu@avient.com
```

## 🆘 如果還是沒有解決

如果按照以上步驟操作後，Viewer 仍然可以看到配方列表和左側邊欄，請：

### 1. 檢查 SQL 執行結果

再次執行驗證查詢：

```sql
SELECT 
  id, 
  email, 
  role, 
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
```

**確認所有用戶的 `role` 都是 `viewer`**。

### 2. 檢查 RLS 政策

確認 `user_profiles` 表的 RLS 政策允許用戶查詢自己的記錄：

```sql
-- 檢查 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
```

### 3. 測試 SQL 查詢（以用戶身份）

在 Supabase SQL Editor 中，切換到 `authenticator` 角色並測試：

```sql
-- 測試查詢（模擬用戶查詢）
SET LOCAL role TO 'authenticator';
SET LOCAL request.jwt.claims TO '{"sub": "434c8e6e-d5fa-4c1a-a967-505a146a4d82"}';

SELECT role
FROM public.user_profiles
WHERE id = '434c8e6e-d5fa-4c1a-a967-505a146a4d82';
```

### 4. 檢查代碼邏輯

確認代碼中 `hasPermission('canEdit')` 的邏輯：

- `src/contexts/AuthContext.tsx`：`hasPermission` 函數
- `src/types/auth.ts`：`ROLE_PERMISSIONS` 中 `viewer` 的 `canEdit` 應該是 `false`

## 📚 相關文件

- `supabase_set_all_viewers.sql` - 設置所有 Viewer 用戶的 SQL 腳本
- `docs/SET_ALL_VIEWERS.md` - 設置 Viewer 用戶的說明
- `docs/VIEWER_ROLE_PERMISSIONS.md` - Viewer 角色權限詳細說明
- `docs/DEBUG_VIEWER_RECIPE_ISSUE.md` - 排查 Viewer「看配方」權限問題
