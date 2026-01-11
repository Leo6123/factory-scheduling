# 排查 Viewer UI 顯示問題

## 📋 問題描述

即使 SQL 已成功執行（9 個用戶都設置為 `viewer` 角色），但登錄後仍然可以看到：
- ❌ 左側邊欄（未排程區域）
- ❌ 配方列表內容（展開狀態）

用戶顯示為「訪客」（Guest），表示角色可能已更新，但 UI 組件沒有正確反應。

## 🔍 可能原因

### 原因 1：Session 中的角色信息沒有更新

**最可能的原因**：Supabase 的 session 會緩存用戶信息，即使資料庫中的角色已經更新，當前 session 中的角色信息可能還是舊的。

### 原因 2：瀏覽器快取了舊的 JavaScript 代碼

瀏覽器可能快取了舊版本的 JavaScript 代碼，導致新的權限邏輯沒有生效。

### 原因 3：代碼沒有正確部署

雖然代碼已經修改並提交，但可能還沒有部署到 Vercel。

### 原因 4：用戶角色沒有正確從資料庫獲取

雖然 SQL 執行成功，但在運行時查詢資料庫時可能失敗，導致使用了默認角色。

## 🔧 詳細排查步驟

### 步驟 1：檢查瀏覽器控制台

**這是最重要的步驟**，可以幫助我們確定問題所在：

1. **打開開發者工具**：
   - 按 `F12` 打開開發者工具
   - 切換到 **Console** 標籤

2. **查看登錄時的日誌**：
   
   應該看到的訊息：
   ```
   🔍 [Auth] 開始獲取用戶角色，用戶 ID: ... Email: david.hung@avient.com
   ✅ [Auth] 獲取用戶角色成功: viewer Email: david.hung@avient.com
   ```

   如果看到錯誤訊息：
   - `⚠️ [Auth] user_profiles 中沒有該用戶記錄`：表示用戶沒有在 `user_profiles` 表中
   - `⚠️ [Auth] 獲取用戶角色失敗，使用默認角色 operator`：表示查詢失敗，使用了默認角色 `operator`

3. **查看權限檢查日誌**：
   
   在 Console 中搜索 `canEdit` 或 `hasPermission`，看看是否有相關的日誌。

4. **截圖或複製控制台日誌**：
   - 請截圖或複製控制台中的所有日誌
   - 特別是包含 `[Auth]` 的日誌

### 步驟 2：完全登出並清除所有資料

**必須完全清除，不能只刷新頁面**：

1. **登出系統**：
   - 點擊右上角的「登出」按鈕
   - 確認已登出（應該跳轉到登錄頁面）

2. **清除瀏覽器資料**：
   - 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
   - 選擇：
     - ✅ **Cookie 和其他網站資料**（必須）
     - ✅ **快取的圖片和檔案**（必須）
     - ✅ **瀏覽記錄**（可選，但建議）
   - 時間範圍選擇「**全部時間**」
   - 點擊「**清除資料**」

3. **關閉所有瀏覽器標籤和視窗**：
   - 不要只關閉一個標籤
   - 必須完全關閉所有瀏覽器標籤（或整個瀏覽器）

4. **重新打開瀏覽器**：
   - 重新打開瀏覽器（全新的瀏覽器實例）
   - 前往 `https://factory-scheduling.vercel.app/login`
   - 重新登錄

### 步驟 3：使用隱私模式（無痕模式）測試

如果步驟 2 仍然沒有解決，使用隱私模式測試：

1. **打開隱私/無痕視窗**：
   - 按 `Ctrl + Shift + N`（Chrome）或 `Cmd + Shift + N`（Chrome Mac）
   - 或 `Ctrl + Shift + P`（Firefox）或 `Cmd + Shift + P`（Firefox Mac）

2. **在隱私模式下登錄**：
   - 前往 `https://factory-scheduling.vercel.app/login`
   - 使用 `david.hung@avient.com` 登錄

3. **檢查結果**：
   - 如果隱私模式下正常工作（左側邊欄隱藏，配方列表隱藏），說明是瀏覽器快取問題
   - 如果隱私模式下仍然有問題，說明不是快取問題，可能是代碼或資料庫問題

### 步驟 4：驗證資料庫中的用戶角色

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
WHERE email = 'david.hung@avient.com';
```

**確認**：
- ✅ `role` 欄位應該是 `viewer`
- ✅ `updated_at` 時間戳應該是最新的（剛才執行 SQL 的時間）

如果 `role` 不是 `viewer`，重新執行 SQL 腳本。

### 步驟 5：檢查 Vercel 部署狀態

1. **檢查部署狀態**：
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 選擇專案
   - 確認最新的部署已完成且沒有錯誤

2. **檢查部署時間**：
   - 確認最新的部署時間是否在修改代碼之後
   - 如果沒有部署，需要觸發部署（例如：push 到 GitHub）

3. **強制重新部署（如果需要）**：
   - 如果部署時間很舊，可以觸發一次新的部署
   - 或直接在 Vercel Dashboard 中點擊 "Redeploy"

### 步驟 6：添加調試日誌（臨時）

如果以上步驟都沒有解決，可以在代碼中添加調試日誌來確認問題：

1. **檢查 `canEdit` 的值**：
   - 在 `src/components/Swimlane.tsx` 的 `canEdit` 定義後添加：
     ```typescript
     console.log('🔍 [Swimlane] canEdit:', canEdit, 'user.role:', user?.role);
     ```
   - 在 `src/components/DraggableCard.tsx` 的 `canEdit` 定義後添加：
     ```typescript
     console.log('🔍 [DraggableCard] canEdit:', canEdit, 'user.role:', user?.role);
     ```

2. **重新部署**：
   - 提交代碼更改
   - 推送到 GitHub
   - 等待 Vercel 自動部署

3. **檢查控制台日誌**：
   - 登錄後查看控制台
   - 查看 `canEdit` 的值和 `user.role` 的值

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
🔍 [Auth] 開始獲取用戶角色，用戶 ID: 091c1409-c47e-46d4-a841-c1a24a6458cc Email: david.hung@avient.com
✅ [Auth] 獲取用戶角色成功: viewer Email: david.hung@avient.com
🔍 [Swimlane] canEdit: false user.role: viewer
🔍 [DraggableCard] canEdit: false user.role: viewer
```

## 🆘 如果還是沒有解決

如果按照以上步驟操作後，Viewer 仍然可以看到配方列表和左側邊欄，請：

1. **提供控制台日誌**：
   - 截圖或複製控制台中的所有日誌
   - 特別是包含 `[Auth]` 的日誌

2. **提供資料庫查詢結果**：
   - 執行步驟 4 的 SQL 查詢
   - 提供查詢結果

3. **提供隱私模式測試結果**：
   - 在隱私模式下登錄
   - 告訴我們隱私模式下是否正常工作

## 📚 相關文件

- `supabase_set_all_viewers.sql` - 設置所有 Viewer 用戶的 SQL 腳本
- `docs/TROUBLESHOOT_VIEWER_PERMISSIONS.md` - 排查 Viewer 權限問題
- `docs/VIEWER_ROLE_PERMISSIONS.md` - Viewer 角色權限詳細說明
