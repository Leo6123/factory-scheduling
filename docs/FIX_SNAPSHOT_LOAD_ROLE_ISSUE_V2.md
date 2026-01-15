# 修復隔天第一次登入載入快照後變成操作員的問題

## 問題描述

隔天訪客第一次登入時，會詢問"偵測到存檔，是否載入"，載入後就進到操作員模式。

## 問題原因

1. **時機問題**：應用啟動時會立即檢查是否有快照，並在 500ms 後提示載入
2. **認證狀態未穩定**：此時認證狀態可能還在初始化中（`isInitializingRef.current` 為 `true`）
3. **觸發認證狀態更新**：載入快照時會調用 `saveScheduleItems`，這會觸發認證狀態更新
4. **角色被錯誤設置**：在認證初始化期間，角色可能被錯誤地設置為 `operator`

## 解決方案

### 1. 等待認證狀態穩定後再提示載入快照

**修改檔案**：`src/components/Swimlane.tsx`

**修改內容**：
- 在提示載入快照前，先等待認證狀態完全穩定
- 檢查條件：`user && !loading && user.role`
- 最多等待 10 秒（20 * 500ms），確保認證狀態已完全穩定

**程式碼變更**：
```typescript
// 等待認證狀態穩定後再提示載入快照
const waitForAuthAndPrompt = async () => {
  let attempts = 0;
  const maxAttempts = 20; // 最多等待 10 秒（20 * 500ms）
  
  // 等待認證狀態穩定
  while (attempts < maxAttempts) {
    if (user && !loading && user.role) {
      console.log('✅ 認證狀態已穩定，提示載入快照，角色:', user.role);
      // 再等待 1 秒確保完全穩定
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 現在可以安全地提示載入快照
      if (window.confirm('📦 偵測到有存檔，是否要載入存檔？...')) {
        // 載入快照
      }
      return;
    }
    
    // 等待 500ms 後再檢查
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
};
```

### 2. 等待認證狀態穩定後再保存到資料庫

**修改檔案**：`src/components/Swimlane.tsx`

**修改內容**：
- 在 `handleLoadSnapshot` 中，等待認證狀態穩定後再保存到資料庫
- 避免在認證初始化期間觸發認證狀態更新

**程式碼變更**：
```typescript
const handleLoadSnapshot = useCallback((items: ScheduleItem[], configs: Record<string, LineConfig>) => {
  saveHistory();
  setScheduleItems(items);
  setLineConfigs(configs);
  
  // 等待認證狀態完全穩定後再保存到資料庫
  const waitForAuthStable = async () => {
    let attempts = 0;
    const maxAttempts = 20; // 最多等待 10 秒（20 * 500ms）
    
    while (attempts < maxAttempts) {
      // 檢查認證狀態是否已穩定
      if (user && !loading && user.role) {
        console.log('✅ 認證狀態已穩定，開始保存快照到資料庫，角色:', user.role);
        // 再等待 1 秒確保完全穩定
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await saveScheduleItems(items);
          console.log('✅ 快照已保存到資料庫');
        } catch (err) {
          console.error('載入存檔後保存到資料庫失敗:', err);
        }
        return;
      }
      
      // 等待 500ms 後再檢查
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    // 如果超時，仍然嘗試保存（但記錄警告）
    console.warn('⚠️ 等待認證狀態穩定超時，仍嘗試保存快照到資料庫');
    try {
      await saveScheduleItems(items);
    } catch (err) {
      console.error('載入存檔後保存到資料庫失敗:', err);
    }
  };
  
  waitForAuthStable();
}, [saveScheduleItems, user, loading]);
```

## 修改的檔案

1. `src/components/Swimlane.tsx` - 改善快照載入邏輯，等待認證狀態穩定

## 測試步驟

1. 重新啟動開發伺服器（如果正在運行）
2. 使用訪客帳號登入系統
3. 檢查是否會詢問載入快照：
   - 應該會等待認證狀態穩定後再提示
   - 控制台應該看到 `✅ 認證狀態已穩定，提示載入快照，角色: viewer`
4. 點擊「確定」載入快照：
   - 應該保持「訪客」角色
   - 不應該變成「操作員」
5. 檢查控制台日誌：
   - 應該看到 `✅ 認證狀態已穩定，開始保存快照到資料庫，角色: viewer`
   - 應該看到 `✅ 快照已保存到資料庫`

## 改進效果

- **時機控制**：確保在認證狀態完全穩定後才載入快照
- **避免角色錯誤**：避免在認證初始化期間觸發認證狀態更新
- **更好的用戶體驗**：用戶不會看到角色暫時變成操作員

## 注意事項

- 如果認證狀態在 10 秒內未穩定，系統仍會嘗試載入快照（但會記錄警告）
- 這確保了即使認證狀態有問題，用戶仍能使用系統
