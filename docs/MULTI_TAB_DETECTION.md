# 多分頁檢測與確認對話框

## 功能說明

當用戶在新視窗/分頁打開應用時，如果檢測到該帳號已在其他分頁登入，系統會自動顯示確認對話框，詢問用戶是否要關閉其他分頁。

## 工作流程

### 場景：新視窗打開時檢測到其他分頁

**流程**：
1. 用戶在分頁 A 已登入 `leo.chang@avient.com`
2. 用戶打開新視窗/分頁 B
3. 新視窗自動檢測到現有 session，自動登入
4. **新功能**：系統檢測到分頁 A 也在使用同一帳號
5. 顯示確認對話框：
   - **標題**：檢測到其他分頁
   - **訊息**：此帳號已在其他分頁登入，是否要關閉其他分頁並繼續使用此分頁？
6. 用戶選擇：
   - **確認（關閉其他分頁）**：通知其他分頁登出，當前分頁繼續使用
   - **取消（登出此分頁）**：登出當前分頁，保留其他分頁

## 技術實現

### 1. BroadcastChannel 分頁通信

**技術**：使用 BroadcastChannel API 實現跨分頁通信

**實現流程**：
1. 當分頁載入時，發送 `TAB_DETECTION_REQUEST` 消息
2. 其他分頁收到請求後，回應 `TAB_ALIVE` 消息
3. 如果收到回應，說明有其他分頁存在
4. 顯示確認對話框

### 2. 檢測邏輯

**文件**：`src/components/ProtectedRoute.tsx`

**檢測流程**：
```typescript
// 1. 發送檢測請求
channel.postMessage({ type: 'TAB_DETECTION_REQUEST', email: user.email });

// 2. 監聽回應
channel.addEventListener('message', (event) => {
  if (event.data.type === 'TAB_ALIVE' && event.data.email === user.email) {
    // 檢測到其他分頁
    setShowConfirmDialog(true);
  }
});

// 3. 回應其他分頁的請求
if (event.data.type === 'TAB_DETECTION_REQUEST') {
  channel.postMessage({ type: 'TAB_ALIVE', tabId, email: user.email });
}
```

### 3. Keep-Alive 機制

**功能**：定期發送「我還活著」消息，讓其他分頁知道這個分頁存在

**實現**：
- 每 3 秒發送一次 `TAB_ALIVE` 消息
- 新分頁打開時，可以立即檢測到現有分頁

### 4. 確認對話框

**文件**：`src/components/ConfirmDialog.tsx`

**選項**：
- **確認（關閉其他分頁）**：
  - 發送 `FORCE_LOGOUT` 消息給其他分頁
  - 其他分頁收到消息後自動登出
  - 當前分頁繼續使用

- **取消（登出此分頁）**：
  - 登出當前分頁
  - 重定向到登入頁
  - 其他分頁繼續使用

## 使用說明

### 測試場景：新視窗檢測

1. **步驟 1**：在瀏覽器分頁 A 登入帳號 `leo.chang@avient.com`
2. **步驟 2**：打開新視窗/分頁 B（`Ctrl+T` 或 `Ctrl+N`）
3. **步驟 3**：新視窗應該自動檢測到現有 session 並登入
4. **步驟 4**：在 1 秒內，應該顯示確認對話框
5. **步驟 5**：選擇「確認（關閉其他分頁）」
6. **預期結果**：
   - 分頁 A 自動登出並跳轉到登入頁
   - 分頁 B 繼續使用

### 測試場景：單一分頁（無其他分頁）

1. **步驟 1**：關閉所有分頁
2. **步驟 2**：打開新分頁並登入
3. **預期結果**：
   - 不應該顯示確認對話框
   - 正常使用系統

## 技術細節

### 修改的文件

- `src/components/ProtectedRoute.tsx`
  - 添加分頁檢測邏輯
  - 添加確認對話框
  - 處理用戶選擇

### 關鍵代碼片段

```typescript
// 檢測其他分頁
useEffect(() => {
  if (loading || !user || hasCheckedMultipleTabs) return;

  const channel = new BroadcastChannel('tab_detection');
  const tabId = `tab_${Date.now()}_${Math.random()}`;

  // 發送檢測請求
  channel.postMessage({ type: 'TAB_DETECTION_REQUEST', email: user.email });

  // 監聽回應
  channel.addEventListener('message', (event) => {
    if (event.data.type === 'TAB_ALIVE' && event.data.email === user.email) {
      setShowConfirmDialog(true);
    }
  });

  // 等待 1 秒
  setTimeout(() => {
    if (!hasOtherTab) {
      // 沒有其他分頁
      setHasCheckedMultipleTabs(true);
    }
    channel.close();
  }, 1000);
}, [user, loading]);
```

## 已知限制

1. **檢測延遲**：需要等待 1 秒才能檢測到其他分頁（為了給其他分頁時間回應）
2. **瀏覽器限制**：BroadcastChannel 只能在同源頁面之間通信（所有分頁必須在同一域名下）
3. **首次載入**：新分頁首次載入時，可能需要等待 1-2 秒才能檢測到其他分頁

## 後續優化建議

1. **減少檢測延遲**：從 1 秒減少到 500ms（可能需要調整）
2. **添加視覺指示**：在檢測期間顯示載入指示器
3. **記住用戶選擇**：允許用戶選擇「總是關閉其他分頁」，記住選擇
4. **顯示分頁數量**：在確認對話框中顯示「檢測到 X 個其他分頁」
