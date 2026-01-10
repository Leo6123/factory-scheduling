# 修復登入超時競態條件問題

## 問題描述

從控制台看到以下問題：

1. **登入成功但被超時覆蓋**：
   - 控制台顯示「認證狀態變化: SIGNED_IN leo.chang@avient.com」（登入成功）
   - 但立即顯示「身份驗證初始化超時(30秒),設定為未登入狀態」
   - 結果：用戶被重定向回登入頁，無法進入系統

## 根本原因

**競態條件（Race Condition）**：

1. 初始化時設置了 30 秒超時計時器
2. 用戶登入成功，`onAuthStateChange` 收到 `SIGNED_IN` 事件
3. 但超時計時器仍在運行
4. 如果 `updateUser` 完成前超時觸發，會清除用戶狀態
5. 結果：登入狀態被超時覆蓋，用戶被登出

## 修復方案

### 1. 使用 useRef 保存 timeoutId

**修改前**：
```typescript
let timeoutId: NodeJS.Timeout | null = null;
timeoutId = setTimeout(() => {
  // 超時處理
}, 30000);
```

**問題**：`timeoutId` 在 `onAuthStateChange` 的回調中無法訪問（closure 限制）

**修改後**：
```typescript
const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
initTimeoutRef.current = setTimeout(() => {
  // 超時處理
}, 30000);
```

**好處**：`useRef` 可以在所有 closure 中訪問，包括 `onAuthStateChange` 回調

### 2. 登入成功時清除超時

**修改**：在 `onAuthStateChange` 的 `SIGNED_IN` 事件中，立即清除初始化超時

```typescript
if (event === 'SIGNED_IN' && session?.user) {
  console.log('✅ 登入成功，清除初始化超時');
  if (initTimeoutRef.current) {
    clearTimeout(initTimeoutRef.current);
    initTimeoutRef.current = null;
  }
}
```

**好處**：登入成功後立即清除超時，避免超時覆蓋登入狀態

### 3. 超時檢查中驗證 Session

**修改**：在超時處理中，再次檢查是否有 session，如果有就不清除用戶狀態

```typescript
initTimeoutRef.current = setTimeout(() => {
  if (mounted && loading && supabase) {
    // 再次檢查是否有 session，避免在登入成功後被超時覆蓋
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session?.user) {
          console.log('✅ 超時檢查：發現 session，保持登入狀態');
          // 有 session，保持登入狀態，只停止 loading
          setLoading(false);
        } else {
          console.warn('⚠️ 超時且沒有 session，設定為未登入狀態');
          setLoading(false);
          setUser(null);
          setSession(null);
        }
      }
    });
  }
}, 30000);
```

**好處**：即使超時觸發，如果有 session 就不會清除用戶狀態（雙重保護）

## 修復效果

### 修復前
1. 用戶登入成功
2. 30 秒超時觸發
3. 用戶狀態被清除
4. 重定向回登入頁 ❌

### 修復後
1. 用戶登入成功
2. 立即清除超時計時器 ✅
3. 即使超時觸發，也會檢查 session，不會清除已登入狀態 ✅
4. 用戶成功進入系統 ✅

## 測試步驟

### 1. 正常登入流程

1. 清除瀏覽器緩存（`Ctrl+Shift+Del`）
2. 重新整理頁面（`Ctrl+Shift+R`）
3. 輸入帳號密碼並登入
4. **預期結果**：
   - 登入成功後立即清除超時計時器
   - 不應該再看到「身份驗證初始化超時」
   - 用戶成功進入系統

### 2. 觀察控制台

登入後，控制台應該顯示：
- ✅ 「認證狀態變化: SIGNED_IN leo.chang@avient.com」
- ✅ 「登入成功，清除初始化超時」
- ❌ 不應該看到「身份驗證初始化超時(30秒)」

## 技術細節

### 修改的文件

- `src/contexts/AuthContext.tsx`
  - 添加 `initTimeoutRef` 使用 `useRef`
  - 在 `SIGNED_IN` 事件中清除超時
  - 在超時處理中驗證 session（雙重保護）

### 關鍵代碼片段

```typescript
// 1. 使用 useRef 保存 timeoutId
const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// 2. 登入成功時清除超時
if (event === 'SIGNED_IN' && session?.user) {
  if (initTimeoutRef.current) {
    clearTimeout(initTimeoutRef.current);
    initTimeoutRef.current = null;
  }
}

// 3. 超時處理中驗證 session（雙重保護）
initTimeoutRef.current = setTimeout(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      // 有 session，保持登入狀態
      setLoading(false);
    } else {
      // 沒有 session，才清除用戶狀態
      setUser(null);
      setSession(null);
    }
  });
}, 30000);
```

## 已知限制

- **超時時間**：30 秒的總超時時間仍然有效（用於處理真正的初始化失敗情況）
- **雙重檢查**：超時處理中的 session 檢查會額外請求一次 Supabase（影響可忽略）

## 後續優化建議

1. **動態超時時間**：根據網路狀況動態調整超時時間
2. **添加重試機制**：如果初始化失敗，自動重試（最多 3 次）
3. **添加用戶提示**：如果初始化超時，顯示友好的錯誤訊息
