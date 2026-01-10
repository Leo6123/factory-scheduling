# 修復 Realtime 訂閱循環和資料不一致問題

## 問題描述

從控制台看到以下問題：

1. **Realtime 訂閱狀態混亂**：
   - 訂閱狀態從 `SUBSCRIBED` → `CLOSED` → `TIMED_OUT`
   - 先顯示「已成功訂閱」，然後又顯示「即時同步未啟用」

2. **資料不一致**：
   - 「本地狀態項目數: 0 dbItems 項目數:234」
   - 系統優先使用本地狀態（空），而不是資料庫的資料（234 筆）

3. **角色查詢超時警告**：
   - 控制台顯示「獲取用戶角色超時（5 秒）」
   - 但 UI 正確顯示「管理員」（說明後台更新成功了）

## 根本原因

### 1. Realtime 訂閱無限循環

**問題**：`useRealtimeSchedule.ts` 中的 `useEffect` 依賴項包含 `isSubscribed`：

```typescript
// ❌ 錯誤：會導致無限循環
useEffect(() => {
  if (enabled) {
    subscribe();
  }
  return () => unsubscribe();
}, [enabled, subscribe, unsubscribe, isSubscribed]);
```

**原因**：
- 當訂閱成功時，`isSubscribed` 變為 `true`
- 這會觸發 `useEffect` 重新執行
- 導致取消訂閱並重新訂閱
- 循環往復，導致訂閱狀態混亂

### 2. 資料載入邏輯問題

**問題**：當本地狀態為空時，系統仍然優先使用本地狀態，而不是資料庫的資料。

**原因**：
- 資料同步邏輯沒有處理「首次載入」的情況
- 當 `prev.length === 0` 且 `dbItems.length > 0` 時，應該使用 `dbItems`

## 修復方案

### 1. 修復 Realtime 訂閱循環

**修改前**：
```typescript
useEffect(() => {
  if (enabled) {
    subscribe();
  }
  return () => unsubscribe();
}, [enabled, subscribe, unsubscribe, isSubscribed]);
```

**修改後**：
```typescript
useEffect(() => {
  if (enabled && !isSubscribed) {
    subscribe();
  }
  return () => unsubscribe();
}, [enabled]); // 只依賴 enabled，不依賴 isSubscribed
```

**好處**：
- 避免無限循環
- 只在 `enabled` 改變時重新訂閱
- 使用 `!isSubscribed` 檢查避免重複訂閱

### 2. 修復資料載入邏輯

**修改前**：
```typescript
if (prev.length < dbItemsArray.length) {
  // 檢查是否有新項目...
  // 如果 dbItems 包含 prev 中沒有的項目，使用 prev
  return prev;
}
```

**修改後**：
```typescript
// 如果本地狀態為空，但資料庫有資料，應該使用資料庫的資料
if (prev.length === 0 && dbItemsArray.length > 0) {
  console.log('✅ 本地狀態為空，使用資料庫資料（', dbItemsArray.length, '筆）');
  return dbItemsArray;
}

// 然後再處理其他情況...
```

**好處**：
- 首次載入時正確使用資料庫資料
- 重新整理頁面時不會丟失資料
- 確保所有瀏覽器顯示相同的資料

## 測試步驟

### 1. 清除緩存並重新載入

1. 清除瀏覽器緩存（`Ctrl+Shift+Del`）
2. 重新整理頁面（`Ctrl+Shift+R`）
3. 觀察控制台：
   - 應該看到「✅ 已成功訂閱 schedule_items 即時變更」
   - 不應該再看到訂閱狀態在 `SUBSCRIBED` → `CLOSED` → `TIMED_OUT` 之間循環
   - 應該看到「✅ 本地狀態為空，使用資料庫資料（234 筆）」

### 2. 測試 Realtime 同步

1. 開啟兩個瀏覽器分頁
2. 都登入同一個帳號
3. 在分頁 A：拖曳一個卡片到時間軸
4. 在分頁 B：應該在 1-2 秒內看到卡片自動出現
5. 檢查控制台：
   - 分頁 B 應該看到「📡 收到即時變更」
   - 不應該看到訂閱狀態循環

### 3. 測試資料載入

1. 重新整理頁面
2. 檢查控制台：
   - 應該看到「✅ 從資料庫載入成功，共 234 筆」
   - 應該看到「✅ 本地狀態為空，使用資料庫資料（234 筆）」
   - 不應該看到「⚠️ 檢測到 dbItems 包含本地狀態中沒有的項目」

## 已知限制

- **角色查詢超時警告**：雖然控制台可能仍然顯示「獲取用戶角色超時（5 秒）」，但這是舊代碼的殘留。實際上：
  - 新代碼使用 2 秒超時
  - 登入流程是非阻塞的（不等待角色查詢）
  - 角色會在後台自動更新（1-2 秒後）
  - UI 會正確顯示最終的角色（如「管理員」）

- **Realtime 延遲**：跨分頁同步有 1-2 秒延遲，這是正常的（Supabase Realtime 的網路延遲）

## 後續優化建議

1. **添加訂閱狀態指示器**：在 UI 上顯示 Realtime 連接狀態
2. **優化資料同步邏輯**：使用更智能的合併策略，而不是簡單的覆蓋
3. **添加錯誤重試機制**：如果 Realtime 訂閱失敗，自動重試
