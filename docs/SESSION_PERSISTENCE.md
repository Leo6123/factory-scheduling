# Session 持久化說明

## 問題

關閉網頁（未登出）後，重新貼上網址就可以直接進到網頁內容（無須再輸入帳密）。

## 原因

Supabase 默認使用 `localStorage` 存儲 session，即使關閉瀏覽器，session 仍然有效。

## 解決方案

使用 `sessionStorage` 替代 `localStorage`，並配合 `BroadcastChannel` 進行跨分頁同步。

### 技術細節

1. **sessionStorage 特性**：
   - 關閉瀏覽器標籤頁或窗口後，sessionStorage 會自動清除
   - 這確保了關閉瀏覽器後需要重新登入

2. **跨分頁同步**：
   - 使用 `BroadcastChannel` API 進行跨分頁通信
   - 當一個分頁登入時，會通知其他分頁
   - 其他分頁收到通知後，會將 session 保存到自己的 sessionStorage 中
   - 確保同一個瀏覽器中的多個分頁可以共享 session

3. **實現方式**：
   - 自定義 Supabase 存儲接口
   - `getItem`: 從 sessionStorage 讀取
   - `setItem`: 保存到 sessionStorage，並通知其他分頁
   - `removeItem`: 從 sessionStorage 移除，並通知其他分頁

## 行為變化

### 之前（使用 localStorage）
- ✅ 關閉瀏覽器後，重新打開仍然保持登入狀態
- ✅ 跨分頁同步正常
- ❌ 安全性較低（session 持久存在）

### 現在（使用 sessionStorage + BroadcastChannel）
- ✅ 關閉瀏覽器後，重新打開需要重新登入
- ✅ 跨分頁同步正常（通過 BroadcastChannel）
- ✅ 安全性更高（session 只在瀏覽器標籤頁打開時有效）

## 測試步驟

### 測試 1：關閉瀏覽器後需要重新登入

1. 打開瀏覽器，訪問 `factory-scheduling.vercel.app`
2. 登入帳號
3. 關閉瀏覽器標籤頁或窗口
4. 重新打開瀏覽器，訪問 `factory-scheduling.vercel.app`
5. **預期結果**：需要重新輸入帳號密碼

### 測試 2：跨分頁同步仍然正常

1. 打開瀏覽器，訪問 `factory-scheduling.vercel.app`
2. 登入帳號
3. 在同一個瀏覽器中打開新分頁，訪問 `factory-scheduling.vercel.app`
4. **預期結果**：自動登入（因為有 session，且通過 BroadcastChannel 同步）

### 測試 3：多分頁檢測

1. 打開瀏覽器，訪問 `factory-scheduling.vercel.app`
2. 登入帳號
3. 在同一個瀏覽器中打開新分頁，訪問 `factory-scheduling.vercel.app`
4. **預期結果**：顯示確認對話框「檢測到其他分頁」

## 注意事項

1. **sessionStorage 限制**：
   - 每個標籤頁都有獨立的 sessionStorage
   - 不能直接跨標籤頁訪問
   - 所以需要使用 BroadcastChannel 進行同步

2. **BroadcastChannel 兼容性**：
   - 需要現代瀏覽器支持（Chrome 54+, Firefox 38+, Safari 15.4+）
   - 如果瀏覽器不支持，會降級使用 sessionStorage（不支援跨分頁同步）

3. **安全性提升**：
   - session 只在瀏覽器標籤頁打開時有效
   - 關閉瀏覽器後，session 自動清除
   - 提高了安全性，降低了 session 洩露的風險

## 技術實現

```typescript
// 自定義存儲接口
const createCustomStorage = () => {
  return {
    getItem: (key: string) => {
      // 從 sessionStorage 讀取
      return sessionStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
      // 保存到 sessionStorage
      sessionStorage.setItem(key, value);
      // 通知其他分頁（跨分頁同步）
      broadcastChannel.postMessage({ 
        type: 'SESSION_UPDATE', 
        key, 
        value 
      });
    },
    removeItem: (key: string) => {
      // 從 sessionStorage 移除
      sessionStorage.removeItem(key);
      // 通知其他分頁（跨分頁同步）
      broadcastChannel.postMessage({ 
        type: 'SESSION_UPDATE', 
        key, 
        value: null 
      });
    },
  };
};
```

## 相關文件

- `src/lib/supabase.ts` - Supabase 客戶端配置和自定義存儲實現
- `src/components/ProtectedRoute.tsx` - 多分頁檢測邏輯
