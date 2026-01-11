# 修復 Viewer UI 更新問題

## 📋 問題描述

即使控制台日誌顯示用戶角色已正確獲取為 `viewer`：
```
[Auth] 獲取用戶角色成功: viewer Email: david.hung@avient.com
```

但 UI 仍然顯示：
- ❌ 左側邊欄（未排程區域）
- ❌ 配方列表內容（展開狀態）

## 🔍 問題原因

登錄時，系統會：
1. 先設置臨時默認角色 `operator`（有編輯權限）
2. 然後在後台異步從資料庫獲取真實角色
3. 當角色更新為 `viewer` 時，組件可能沒有正確響應

問題在於：
- `isRecipeExpanded` 是一個 `useState`，初始值是 `false`
- 但如果用戶在角色更新前點擊了「展開」按鈕，`isRecipeExpanded` 會變為 `true`
- 當角色更新為 `viewer` 時，雖然 `canEdit` 變為 `false`，但 `isRecipeExpanded` 仍然是 `true`
- 代碼邏輯 `{(canEdit ? isRecipeExpanded : false) && (` 應該會隱藏配方列表，但可能組件沒有重新渲染

## ✅ 修復方案

### 1. 添加 `useEffect` 監聽 `canEdit` 變化

在 `DraggableCard.tsx` 中添加：
```typescript
// 當 canEdit 變為 false 時（例如角色從 operator 更新為 viewer），強制收合配方列表
useEffect(() => {
  if (!canEdit && isRecipeExpanded) {
    setIsRecipeExpanded(false);
  }
}, [canEdit, isRecipeExpanded]);
```

### 2. 添加調試日誌

在 `DraggableCard.tsx` 和 `Swimlane.tsx` 中添加調試日誌：
```typescript
// 調試日誌：確認權限檢查是否正確
useEffect(() => {
  console.log('🔍 [DraggableCard] 權限檢查 - canEdit:', canEdit, 'user.role:', user?.role, 'item.id:', item.id);
}, [canEdit, user?.role, item.id]);
```

## 🔧 測試步驟

### 步驟 1：等待 Vercel 部署完成

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案
3. 等待最新的部署完成（應該會自動觸發）

### 步驟 2：清除瀏覽器快取並重新登錄

1. **清除瀏覽器快取**：
   - 按 `Ctrl + Shift + Delete`（Windows）或 `Cmd + Shift + Delete`（Mac）
   - 選擇「Cookie 和其他網站資料」和「快取的圖片和檔案」
   - 時間範圍選擇「全部時間」
   - 點擊「清除資料」

2. **關閉所有瀏覽器標籤**：
   - 完全關閉所有瀏覽器標籤（或整個瀏覽器）

3. **重新打開瀏覽器並重新登錄**：
   - 重新打開瀏覽器
   - 前往 `https://factory-scheduling.vercel.app/login`
   - 使用 `david.hung@avient.com` 登錄

### 步驟 3：檢查控制台日誌

登錄後，按 `F12` 打開開發者工具，查看 Console 標籤：

**應該看到的新日誌**：
```
🔍 [Swimlane] 權限檢查 - canEdit: false user.role: viewer
🔍 [DraggableCard] 權限檢查 - canEdit: false user.role: viewer item.id: ...
```

**如果看到**：
```
🔍 [Swimlane] 權限檢查 - canEdit: true user.role: viewer
```
這表示權限檢查邏輯有問題，需要進一步排查。

### 步驟 4：驗證 UI

登錄後應該看到：
- ✅ 左側邊欄完全隱藏（未排程區域不顯示）
- ✅ 配方列表不顯示（只顯示「看配方: (X 項)」標籤）
- ✅ 無法拖曳卡片
- ✅ 用戶顯示為「訪客」（Guest）

## 🎯 預期結果

### 控制台日誌（完整流程）：

```
✅ 找到現有會話，用戶: david.hung@avient.com
🔍 [Auth] 開始獲取用戶角色，用戶 ID: ... Email: david.hung@avient.com
✅ [Auth] 獲取用戶角色成功: viewer Email: david.hung@avient.com
✅ 後台獲取角色成功，更新為: viewer
🔍 [Swimlane] 權限檢查 - canEdit: false user.role: viewer
🔍 [DraggableCard] 權限檢查 - canEdit: false user.role: viewer item.id: ...
```

### UI 顯示：

- ✅ **左側邊欄完全隱藏**（未排程區域不顯示）
- ✅ **配方列表不顯示**（只顯示「看配方: (X 項)」標籤）
- ✅ **無法拖曳卡片**
- ✅ **無法編輯任何內容**

## 🆘 如果還是沒有解決

如果按照以上步驟操作後，Viewer 仍然可以看到配方列表和左側邊欄，請：

1. **提供控制台日誌**：
   - 截圖或複製控制台中的所有日誌
   - 特別是包含 `[Swimlane]` 和 `[DraggableCard]` 的日誌

2. **確認 `canEdit` 的值**：
   - 查看控制台日誌中 `canEdit` 的值
   - 如果 `canEdit` 是 `true` 但 `user.role` 是 `viewer`，說明權限檢查邏輯有問題

3. **檢查 Vercel 部署狀態**：
   - 確認最新的部署已完成
   - 確認部署沒有錯誤

## 📚 相關文件

- `docs/TROUBLESHOOT_VIEWER_PERMISSIONS.md` - 完整的排查步驟
- `docs/DEBUG_VIEWER_UI_ISSUE.md` - 排查 Viewer UI 顯示問題
- `docs/CHECK_BROWSER_CONSOLE.md` - 檢查瀏覽器控制台日誌
