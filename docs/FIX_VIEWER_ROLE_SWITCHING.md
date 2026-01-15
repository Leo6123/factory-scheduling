# 修復訪客角色切換問題

## 問題描述

訪客用戶有時候會切換成操作員模式，這是因為：
1. 當資料庫查詢失敗或超時時，系統會使用 `operator` 作為默認角色
2. 初始化時會先設置角色為 `operator`，然後在後台異步獲取正確的角色
3. 如果後台獲取失敗，就會保持 `operator` 角色

## 解決方案

### 1. 將默認角色改為 `viewer`（更安全）

**修改檔案**：`src/contexts/AuthContext.tsx`

**修改內容**：
- 將所有默認角色從 `operator` 改為 `viewer`
- `viewer` 權限更少，更安全
- 包括：
  - `getUserRole` 函數的錯誤處理
  - 初始化時的臨時角色
  - 登入時的臨時角色
  - `updateUser` 函數的錯誤處理

**程式碼變更範例**：
```typescript
// 之前：使用 operator 作為默認角色
role: 'operator', // 臨時使用默認角色

// 之後：使用 viewer 作為默認角色
role: 'viewer', // 臨時使用更安全的默認角色（權限更少）
```

### 2. 改善角色更新邏輯

**修改檔案**：`src/contexts/AuthContext.tsx`

**修改內容**：
- 當認證狀態變化時，如果角色是 `viewer` 或 `operator`（可能是默認值），會重新獲取正確的角色
- 避免角色被錯誤設置後不再更新

**程式碼變更**：
```typescript
// 如果角色是 viewer 或 operator 且不是初始化期間，可能是錯誤的默認值，重新獲取
if ((user.role === 'viewer' || user.role === 'operator') && !isInitializingRef.current) {
  console.log('⚠️ [onAuthStateChange] 檢測到角色可能是默認值', user.role, '，重新獲取正確角色');
  // 延遲調用 updateUser 來獲取正確的角色
  setTimeout(async () => {
    await updateUser(session.user, session);
  }, 500);
  return;
}
```

## 修改的檔案

1. `src/contexts/AuthContext.tsx` - 將所有默認角色改為 `viewer`，並改善角色更新邏輯

## 測試步驟

1. 重新啟動開發伺服器（如果正在運行）
2. 使用訪客帳號登入系統
3. 檢查角色顯示：
   - 應該顯示「訪客」而不是「操作員」
   - 即使資料庫查詢失敗，也應該保持「訪客」角色
4. 載入快照後檢查角色：
   - 應該保持「訪客」角色
   - 不應該切換成「操作員」

## 安全性提升

- **最小權限原則**：使用 `viewer` 作為默認角色，即使查詢失敗也不會給予過多權限
- **自動修正**：當檢測到角色可能是默認值時，會自動重新獲取正確的角色
- **錯誤處理**：所有錯誤情況都使用 `viewer` 作為默認角色，而不是 `operator`

## 注意事項

- 如果用戶的 `user_profiles` 記錄不存在，系統會使用 `viewer` 作為默認角色
- 如果資料庫查詢超時或失敗，系統會使用 `viewer` 作為默認角色
- 系統會在後台持續嘗試獲取正確的角色，並在獲取成功後自動更新
