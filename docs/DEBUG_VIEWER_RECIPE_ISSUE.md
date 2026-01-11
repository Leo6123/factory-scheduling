# 排查 Viewer「看配方」權限問題

## 📋 問題描述

所有 viewer（訪客）用戶仍然可以看到配方列表內容，應該預設為收合狀態（不顯示配方列表）。

從圖片可以看到：
- ❌ 左側邊欄（未排程區域）仍然顯示（應該隱藏）
- ❌ 配方列表內容仍然顯示（應該隱藏）

這表示這些用戶可能**不是 `viewer` 角色**。

## ✅ 代碼已正確修改

代碼已經正確修改並部署（commit a8b8c49）：

### 1. 左側邊欄隱藏（Swimlane.tsx）
```typescript
{canEdit && (<UnscheduledSidebar ... />)}
```
- Viewer（`canEdit = false`）時，左側邊欄不顯示

### 2. 配方列表隱藏（DraggableCard.tsx）
```typescript
{(canEdit ? isRecipeExpanded : false) && (
  <div className="mt-2 ml-4 space-y-1.5 border-l-2 border-blue-500/30 pl-3">
    {item.recipeItems.map((recipe: RecipeItem, idx: number) => (
      // ... 配方列表內容 ...
    ))}
  </div>
)}
```
- Viewer（`canEdit = false`）時，配方列表不顯示（只顯示「看配方: (X 項)」標籤）

## 🔍 問題原因

如果 Viewer 仍然可以看到配方列表和左側邊欄，最可能的原因是：

### 原因 1：用戶角色不是 `viewer`

如果用戶在資料庫中的角色不是 `viewer`，系統會使用其他角色（如 `operator`），而 `operator` 有編輯權限，所以可以看到配方列表和左側邊欄。

### 原因 2：用戶沒有在 `user_profiles` 表中

如果用戶沒有在 `user_profiles` 表中，系統會使用默認角色 `operator`，所以可以看到配方列表和左側邊欄。

## 🔧 解決步驟

### 步驟 1：檢查用戶角色

在 Supabase SQL Editor 中執行以下 SQL：

```sql
-- 檢查特定用戶的角色
SELECT 
  id, 
  email, 
  role, 
  created_at, 
  updated_at
FROM public.user_profiles 
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY email;
```

### 步驟 2：檢查用戶是否在 `user_profiles` 中

```sql
-- 檢查這些用戶是否在 auth.users 中，但不在 user_profiles 中
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN up.id IS NULL THEN '⚠️ 缺少 user_profiles 記錄（會使用默認角色 operator）'
    WHEN up.role != 'viewer' THEN CONCAT('⚠️ 角色是: ', up.role, '（不是 viewer）')
    ELSE '✅ 正確設定為 viewer'
  END as status,
  up.role as current_role
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY au.email;
```

### 步驟 3：根據結果處理

#### 情況 A：用戶在 `user_profiles` 中，但角色不是 `viewer`

更新角色為 `viewer`：

```sql
-- 更新用戶角色為 viewer
UPDATE public.user_profiles
SET 
  role = 'viewer',
  updated_at = NOW()
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
);

-- 驗證更新結果
SELECT id, email, role, updated_at
FROM public.user_profiles 
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY email;
```

#### 情況 B：用戶不在 `user_profiles` 中

需要創建記錄：

```sql
-- 1. 先查詢 UUID
SELECT id, email 
FROM auth.users 
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
);

-- 2. 使用查到的 UUID 創建 user_profiles 記錄
-- （將 YOUR_USER_ID_1 和 YOUR_USER_ID_2 替換為步驟 1 查到的 UUID）
INSERT INTO public.user_profiles (id, email, role)
VALUES 
  ('YOUR_USER_ID_1', 'ali.liu@avient.com', 'viewer'),
  ('YOUR_USER_ID_2', 'david.hung@avient.com', 'viewer')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- 3. 驗證結果
SELECT id, email, role, updated_at
FROM public.user_profiles 
WHERE email IN (
  'ali.liu@avient.com',
  'david.hung@avient.com'
)
ORDER BY email;
```

### 步驟 4：清除瀏覽器快取並重新登入

1. **清除瀏覽器快取**：
   - 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
   - 選擇「快取的圖片和檔案」
   - 清除所有快取

2. **完全關閉瀏覽器標籤**：
   - 不要只刷新頁面
   - 必須完全關閉瀏覽器標籤

3. **重新打開瀏覽器並重新登入**：
   - 重新打開瀏覽器
   - 重新登入系統

### 步驟 5：驗證結果

登入後應該看到：
- ✅ 左側邊欄完全隱藏（未排程區域不顯示）
- ✅ 配方列表不顯示（只顯示「看配方: (X 項)」標籤）
- ✅ 無法拖曳卡片
- ✅ 用戶顯示為「訪客」（Guest）

## 🆘 如果還是沒有解決

如果按照以上步驟操作後，Viewer 仍然可以看到配方列表和左側邊欄，請：

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

## 📝 預期行為

### Viewer（訪客）角色：

**左側邊欄**：
- ❌ **完全隱藏**（未排程區域不顯示）

**「看配方」功能**：
- ✅ 顯示「看配方: (X 項)」標籤（只顯示數量）
- ❌ **不顯示**配方列表內容（預設收合）
- ❌ 無法點擊展開（沒有展開按鈕）

**其他功能**：
- ✅ 可以查看排程（卡片視圖和時間軸視圖）
- ✅ 可以選擇日期和批號查詢
- ✅ 可以切換視圖和日期範圍
- ❌ **不能**拖曳卡片
- ❌ **不能**編輯任何內容

## 📚 相關文件

- `docs/VIEWER_ROLE_PERMISSIONS.md` - Viewer 角色權限詳細說明
- `docs/FIX_VIEWER_RECIPE_PERMISSION.md` - 修復 Viewer「看配方」權限問題
- `docs/CHECK_USER_ROLE.md` - 檢查用戶角色指南
- `fix_all_viewers_recipe.sql` - 檢查並修復所有 viewer 用戶的 SQL 腳本
