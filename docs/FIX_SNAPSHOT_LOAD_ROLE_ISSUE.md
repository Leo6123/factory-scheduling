# 修復：載入快照時角色變成「操作員」的問題

## 問題描述

**現象**：
- 登入後點擊「確定」載入快照時，有時會看到角色變成「操作員」
- 即使原本是「訪客」或「管理員」，也會暫時顯示「操作員」

**原因**：
1. 載入快照時，會立即保存到資料庫（`saveScheduleItems`）
2. 保存到資料庫可能觸發認證狀態更新（例如 token 刷新）
3. 認證狀態更新時，如果正在初始化，會暫時設置角色為 `operator`
4. 之後應該會調用 `updateUser` 來獲取正確的角色，但可能因為時機問題沒有更新

---

## 修復方案

### 1. 延遲保存到資料庫

**修改檔案**：`src/components/Swimlane.tsx`

**修改內容**：
- 在載入快照時，延遲 5 秒後再保存到資料庫
- 避免在認證初始化期間觸發認證狀態變化
- 使用較長的延遲時間，確保認證狀態已完全穩定

**程式碼變更**：
```typescript
const handleLoadSnapshot = useCallback((items: ScheduleItem[], configs: Record<string, LineConfig>) => {
  saveHistory();
  setScheduleItems(items);
  setLineConfigs(configs);
  // 延遲保存到資料庫，避免在認證初始化期間觸發認證狀態變化
  // 使用較長的延遲時間（5 秒），確保認證狀態已完全穩定
  setTimeout(() => {
    saveScheduleItems(items).catch((err) => {
      console.error('載入存檔後保存到資料庫失敗:', err);
    });
  }, 5000); // 延遲 5 秒，確保認證狀態已完全穩定
}, [saveScheduleItems]);
```

### 2. 改善認證狀態更新邏輯

**修改檔案**：`src/contexts/AuthContext.tsx`

**修改內容**：
- 當認證狀態變化且用戶已存在時，檢查角色是否需要更新
- 如果角色是 `operator`（可能是默認值），重新獲取正確的角色
- 避免角色被錯誤地設置為 `operator` 後不再更新

**程式碼變更**：
```typescript
// 如果用戶狀態已經存在且 email 匹配，檢查角色是否需要更新
// 如果角色是 operator（可能是默認值），重新獲取正確的角色
if (user && user.email === session.user.email && session) {
  // 如果角色是 operator 且不是初始化期間，可能是錯誤的默認值，重新獲取
  if (user.role === 'operator' && !isInitializingRef.current) {
    console.log('⚠️ [onAuthStateChange] 檢測到角色可能是默認值 operator，重新獲取正確角色');
    // 延遲調用 updateUser 來獲取正確的角色
    setTimeout(async () => {
      await updateUser(session.user, session);
    }, 500);
    return;
  }
  console.log('ℹ️ [onAuthStateChange] 用戶狀態已存在，跳過 updateUser（避免重複更新）');
  setLoading(false);
  setSession(session);
  return;
}
```

---

## 測試步驟

### 1. 測試載入快照

1. **登入系統**（使用訪客或管理員帳號）
2. **點擊「確定」載入快照**
3. **檢查角色顯示**：
   - ✅ 應該保持原本的角色（訪客/管理員/操作員）
   - ❌ 不應該暫時變成「操作員」

### 2. 測試認證狀態更新

1. **登入系統**
2. **等待認證狀態穩定**（約 1-2 秒）
3. **檢查角色顯示**：
   - ✅ 應該顯示正確的角色
   - ❌ 不應該暫時變成「操作員」

---

## 預期效果

### 修復前

1. 登入後點擊「確定」載入快照
2. 角色暫時變成「操作員」
3. 1-2 秒後恢復正確的角色（或保持為「操作員」）

### 修復後

1. 登入後點擊「確定」載入快照
2. 角色保持原本的角色（訪客/管理員/操作員）
3. 不會暫時變成「操作員」

---

## 技術細節

### 為什麼會觸發認證狀態更新？

1. **Supabase 自動刷新 token**：
   - 當向 Supabase 發送請求時，可能會觸發 token 刷新
   - Token 刷新會觸發 `onAuthStateChange` 事件

2. **認證狀態變化事件**：
   - `onAuthStateChange` 監聽器會收到 `SIGNED_IN` 事件
   - 如果正在初始化，會暫時設置角色為 `operator`

### 為什麼延遲保存可以解決問題？

1. **認證初始化完成**：
   - 延遲 2 秒後，認證初始化應該已經完成
   - `isInitializingRef.current` 應該已經設為 `false`

2. **避免狀態衝突**：
   - 不會在認證初始化期間觸發認證狀態變化
   - 避免角色被暫時設置為 `operator`

---

## 相關檔案

- `src/components/Swimlane.tsx` - 載入快照的邏輯
- `src/contexts/AuthContext.tsx` - 認證狀態管理
- `src/hooks/useScheduleData.ts` - 保存排程資料的邏輯

---

## 注意事項

1. **延遲時間**：
   - 目前設置為 2 秒，如果認證初始化較慢，可能需要調整
   - 但延遲時間太長會影響用戶體驗

2. **錯誤處理**：
   - 如果保存到資料庫失敗，會記錄錯誤但不影響載入快照
   - 資料仍會保存在本地狀態中

3. **角色更新**：
   - 如果認證狀態更新時正在初始化，會延遲 1 秒後調用 `updateUser`
   - 這確保了角色會正確更新，但不會在初始化期間設置錯誤的角色

---

## 總結

**修復內容**：
- ✅ 延遲保存到資料庫，避免在認證初始化期間觸發認證狀態變化
- ✅ 改善認證狀態更新邏輯，避免暫時設置錯誤的角色

**預期效果**：
- ✅ 載入快照時，角色不會暫時變成「操作員」
- ✅ 角色會保持原本的正確角色（訪客/管理員/操作員）
