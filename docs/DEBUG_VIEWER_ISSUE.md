# Viewer 權限問題排查指南

## 🔍 問題描述

Viewer 用戶仍然可以看到：
- 左側邊欄（未排程區域）
- 配方列表內容

## 📋 排查步驟

### 步驟 1：確認用戶角色（最重要）

在 Supabase SQL Editor 中執行：

```sql
-- 檢查用戶角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

**預期結果**：
- 應該看到 `role = 'viewer'`
- 如果角色不是 `viewer`，需要更新

**如果角色不是 viewer**，執行：

```sql
-- 更新用戶角色為 viewer
UPDATE public.user_profiles
SET 
  role = 'viewer',
  updated_at = NOW()
WHERE email = 'ali.liu@avient.com';

-- 驗證更新結果
SELECT id, email, role, updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

### 步驟 2：檢查瀏覽器控制台

1. 按 `F12` 打開開發者工具
2. 查看 **Console** 標籤
3. 查看是否有以下訊息：
   - `✅ [Auth] 獲取用戶角色成功: viewer`
   - `⚠️ [Auth] 獲取用戶角色失敗`（如果有錯誤）
   - `⚠️ [Auth] user_profiles 中沒有該用戶記錄`（如果沒有記錄）

### 步驟 3：清除瀏覽器快取和重新登入

1. 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
2. 選擇「快取的圖片和檔案」
3. 清除所有快取
4. **關閉瀏覽器標籤**（不要只刷新）
5. 重新打開瀏覽器
6. 重新登入系統

### 步驟 4：檢查 Vercel 部署狀態

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 確認最新的部署已完成（狀態為 "Ready"）
4. 如果部署失敗，查看錯誤訊息

### 步驟 5：確認用戶是否在 user_profiles 表中

如果 SQL 查詢沒有結果，說明用戶沒有在 `user_profiles` 表中：

```sql
-- 檢查用戶是否在 auth.users 中
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'ali.liu@avient.com';
```

如果用戶在 `auth.users` 中但不在 `user_profiles` 中，需要創建 `user_profiles` 記錄：

```sql
-- 先查詢 UUID
SELECT id, email 
FROM auth.users 
WHERE email = 'ali.liu@avient.com';

-- 然後插入 user_profiles（替換 YOUR_USER_ID 為實際 UUID）
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID',  -- 從上一步複製的 UUID
  'ali.liu@avient.com',
  'viewer'  -- 設為 viewer 角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();
```

## ⚠️ 已知問題

### 問題 1：默認角色是 operator

在 `AuthContext.tsx` 中，當角色查詢失敗或找不到記錄時，默認角色是 `'operator'`（而不是 `'viewer'`）。

這意味著：
- 如果 `user_profiles` 表中沒有記錄，用戶會得到 `operator` 角色
- 如果角色查詢失敗，用戶會得到 `operator` 角色
- `operator` 角色有編輯權限（`canEdit = true`），所以可以看到左側邊欄和配方列表

### 問題 2：角色更新是異步的

在登入時，系統會：
1. 先設置默認角色 `'operator'`（立即顯示）
2. 然後在後台異步查詢實際角色
3. 如果查詢成功，更新為實際角色

這可能導致：
- 登入時短暫顯示 `operator` 角色
- 如果查詢失敗，會保持 `operator` 角色

## ✅ 解決方案

### 方案 1：確保用戶在 user_profiles 表中（推薦）

確保所有用戶都在 `user_profiles` 表中有記錄，且角色正確：

```sql
-- 檢查所有沒有 user_profiles 記錄的用戶
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 為缺失的用戶創建 user_profiles 記錄（批量）
INSERT INTO public.user_profiles (id, email, role)
SELECT 
  au.id,
  au.email,
  'viewer'  -- 默認設為 viewer（或根據需求修改）
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### 方案 2：檢查 RLS 政策

確認 `user_profiles` 表的 RLS 政策允許用戶查詢自己的角色：

```sql
-- 檢查 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
ORDER BY policyname;
```

應該看到至少有一個 `SELECT` 政策允許已認證用戶查詢。

## 🧪 測試步驟

1. **確認用戶角色**：
   ```sql
   SELECT id, email, role FROM public.user_profiles WHERE email = 'ali.liu@avient.com';
   ```

2. **清除瀏覽器快取並重新登入**

3. **檢查控制台**：
   - 應該看到 `✅ [Auth] 獲取用戶角色成功: viewer`

4. **驗證權限**：
   - 左側邊欄應該完全隱藏
   - 配方列表應該不顯示（只顯示「看配方: (X 項)」）
   - 無法拖曳卡片
