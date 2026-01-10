# 多分頁檢測調試指南

## 問題

新視窗打開時沒有顯示確認對話框。

## 調試步驟

### 1. 打開開發者工具控制台

在兩個分頁都打開控制台（F12），觀察日誌輸出。

### 2. 測試流程

1. **分頁 A**：登入 `leo.chang@avient.com`
2. **分頁 B**：打開新視窗，應該會自動登入

### 3. 檢查控制台日誌

#### 在分頁 B（新視窗）中應該看到：

```
✅ 找到現有會話，用戶: leo.chang@avient.com
🔍 [AuthContext] 開始檢測其他分頁，用戶: leo.chang@avient.com
📤 [AuthContext] 回應檢測請求
📡 [AuthContext] 收到消息: {type: 'TAB_ALIVE', tabId: '...', email: 'leo.chang@avient.com'}
⚠️ [AuthContext] 檢測到其他分頁正在使用此帳號，tabId: ...
📢 [ProtectedRoute] 收到 BroadcastChannel 消息，需要顯示對話框
[ProtectedRoute] 檢查對話框標記 (1/20): {shouldShowDialog: true, dialogEmail: 'leo.chang@avient.com', ...}
⚠️ [ProtectedRoute] 顯示多分頁確認對話框！
```

#### 在分頁 A（舊分頁）中應該看到：

```
📤 [AuthContext 持久監聽] 回應檢測請求，email: leo.chang@avient.com
```

### 4. 如果沒有看到上述日誌

#### 問題 1：沒有看到「開始檢測其他分頁」

**可能原因**：`AuthContext` 初始化時沒有找到現有 session

**解決方法**：
- 檢查 Supabase session 是否正確保存
- 清除瀏覽器緩存並重新登入

#### 問題 2：看到「這是唯一的分頁」

**可能原因**：
- BroadcastChannel 沒有正常工作
- 分頁 A 沒有正確監聽
- 檢測時機太早，分頁 A 還沒準備好

**解決方法**：
- 檢查瀏覽器是否支持 BroadcastChannel
- 確認兩個分頁都在同一個域名下
- 等待更長時間（目前設置為 1 秒）

#### 問題 3：看到檢測但沒有顯示對話框

**可能原因**：
- `ProtectedRoute` 沒有正確檢查 `sessionStorage`
- 標記設置和檢查之間的時序問題

**解決方法**：
- 檢查 `sessionStorage.getItem('show_multitab_dialog')` 是否為 `'true'`
- 確認 `ProtectedRoute` 的 `useEffect` 正在運行

### 5. 手動測試

在控制台中執行以下代碼來手動測試：

```javascript
// 設置標記
sessionStorage.setItem('show_multitab_dialog', 'true');
sessionStorage.setItem('multitab_email', 'leo.chang@avient.com');

// 檢查標記
console.log('標記:', sessionStorage.getItem('show_multitab_dialog'));
console.log('Email:', sessionStorage.getItem('multitab_email'));

// 手動觸發 BroadcastChannel 消息
const channel = new BroadcastChannel('tab_detection');
channel.postMessage({ type: 'SHOW_MULTITAB_DIALOG', email: 'leo.chang@avient.com' });
```

### 6. 常見問題

#### Q: 為什麼檢測需要 1 秒？

A: 因為 BroadcastChannel 消息是異步的，需要給其他分頁時間回應。如果檢測到其他分頁，會立即顯示對話框，不需要等待完整 1 秒。

#### Q: 為什麼需要定期檢查？

A: 因為 `sessionStorage` 的變化在同一個窗口的不同標籤頁之間不會觸發 `storage` 事件（只有不同窗口之間才會觸發）。所以我們使用定期檢查作為備用方案。

#### Q: 檢測是否會影響性能？

A: 不會。檢測只在頁面載入後的 5 秒內進行，之後會停止。而且檢查非常輕量（只是讀取 `sessionStorage`）。

## 如果仍然無法工作

1. **檢查瀏覽器兼容性**：BroadcastChannel 需要現代瀏覽器（Chrome 54+, Firefox 38+, Safari 15.4+）

2. **檢查同源策略**：兩個分頁必須在同一個域名下（`factory-scheduling.vercel.app`）

3. **清除所有緩存**：
   - 清除瀏覽器緩存
   - 清除 `sessionStorage` 和 `localStorage`
   - 重新登入

4. **檢查網路連接**：確保網路連接正常

5. **查看完整日誌**：打開控制台的詳細日誌，查看是否有錯誤訊息

## 預期行為

當新視窗打開時：
1. **立即檢測**：在 1 秒內檢測到其他分頁
2. **顯示對話框**：在檢測到後立即顯示（通常在 500ms 內）
3. **用戶選擇**：用戶可以選擇關閉其他分頁或登出當前分頁

## 性能優化

- 檢測只運行 5 秒（20 次檢查，每次間隔 250ms）
- 檢測到其他分頁後立即停止
- 使用 BroadcastChannel 進行高效通信
- 使用 `sessionStorage` 避免跨標籤頁的同步問題
