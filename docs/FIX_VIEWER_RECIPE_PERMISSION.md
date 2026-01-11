# 修復 Viewer「看配方」權限問題

## 📋 問題描述

Viewer（訪客）用戶仍然可以看到配方列表內容，應該預設為收合狀態（不顯示配方列表）。

## ✅ 代碼已正確修改

代碼已經修改為：
- Viewer（`canEdit = false`）時，配方列表不顯示：`{(canEdit ? isRecipeExpanded : false) && (`
- 只顯示「看配方: (X 項)」標籤，不顯示配方列表內容

## 🔍 問題原因

如果 Viewer 仍然可以看到配方列表，最可能的原因是：

### 原因 1：用戶角色不是 `viewer`

如果用戶在資料庫中的角色不是 `viewer`，系統會使用其他角色（如 `operator`），而 `operator` 有編輯權限，所以可以看到配方列表。

### 原因 2：用戶沒有在 `user_profiles` 表中

如果用戶沒有在 `user_profiles` 表中，系統會使用默認角色 `operator`，所以可以看到配方列表。

## 🔧 解決步驟

### 步驟 1：檢查用戶角色

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

### 步驟 2：根據結果處理

#### 情況 A：查詢沒有結果（用戶不存在）

用戶沒有在 `user_profiles` 表中，需要創建記錄：

```sql
-- 1. 先查詢 UUID
SELECT id, email 
FROM auth.users 
WHERE email = 'ali.liu@avient.com';

-- 2. 使用查到的 UUID 創建 user_profiles 記錄
-- （將 YOUR_USER_ID 替換為步驟 1 查到的 UUID）
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID',  -- 從步驟 1 複製的 UUID
  'ali.liu@avient.com',
  'viewer'  -- 設為 viewer 角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- 3. 驗證結果
SELECT id, email, role, updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

#### 情況 B：角色不是 `viewer`

更新角色為 `viewer`：

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

### 步驟 3：清除瀏覽器快取並重新登入

1. 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
2. 選擇「快取的圖片和檔案」
3. 清除所有快取
4. **關閉瀏覽器標籤**（完全關閉）
5. 重新打開瀏覽器
6. 重新登入系統

### 步驟 4：驗證結果

登入後應該看到：
- ✅ 左側邊欄完全隱藏
- ✅ 配方列表不顯示（只顯示「看配方: (X 項)」標籤）
- ✅ 無法拖曳卡片
- ✅ 用戶顯示為「訪客」（Guest）

## 📝 預期行為

### Viewer（訪客）角色：

**「看配方」功能**：
- ✅ 顯示「看配方: (X 項)」標籤（只顯示數量）
- ❌ **不顯示**配方列表內容（預設收合）
- ❌ 無法點擊展開（沒有展開按鈕）

**其他功能**：
- ✅ 可以查看排程（卡片視圖和時間軸視圖）
- ✅ 可以選擇日期和批號查詢
- ✅ 可以切換視圖和日期範圍
- ❌ **不能**使用左側邊欄（完全隱藏）
- ❌ **不能**拖曳卡片
- ❌ **不能**編輯任何內容

## 🆘 如果還是沒有解決

如果按照以上步驟操作後，Viewer 仍然可以看到配方列表，請：

1. **檢查瀏覽器控制台**：
   - 按 `F12` 打開開發者工具
   - 查看 Console 標籤
   - 查看是否有角色相關的錯誤或警告
   - 查看是否有 `✅ [Auth] 獲取用戶角色成功: viewer` 訊息

2. **確認 Vercel 部署狀態**：
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 確認最新的部署已完成
   - 確認部署沒有錯誤

3. **確認用戶角色**：
   - 再次執行 SQL 查詢確認角色是 `viewer`
   - 如果角色不是 `viewer`，執行更新 SQL

## 📚 相關文件

- `docs/VIEWER_ROLE_PERMISSIONS.md` - Viewer 角色權限詳細說明
- `docs/DEBUG_VIEWER_ISSUE.md` - Viewer 問題排查指南
- `docs/CHECK_USER_ROLE.md` - 檢查用戶角色指南
