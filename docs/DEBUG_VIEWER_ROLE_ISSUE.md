# 調試訪客角色問題

## 問題描述

訪客登入後變成「操作員」，這可能是因為：
1. 資料庫中訪客用戶的角色值確實是 `operator`（資料問題）
2. 查詢返回的角色值不正確
3. 初始化時角色被錯誤設置

## 調試步驟

### 1. 檢查瀏覽器控制台日誌

登入後，檢查控制台中的日誌：
- `✅ [Auth] 獲取用戶角色成功:` - 顯示從資料庫獲取的角色
- `📋 [Auth] 完整查詢結果:` - 顯示完整的查詢結果
- `⚠️ [Auth] 注意：用戶角色是 operator` - 如果角色是 operator，會顯示警告

### 2. 檢查資料庫中的角色值

在 Supabase Dashboard 中執行以下 SQL：

```sql
SELECT id, email, role 
FROM user_profiles 
WHERE email = '訪客的email@example.com';
```

確認 `role` 欄位的值：
- 應該是 `viewer`（訪客）
- 如果是 `operator`，這就是問題所在

### 3. 修正資料庫中的角色值

如果資料庫中的角色值不正確，執行以下 SQL 修正：

```sql
-- 將特定用戶的角色改為 viewer
UPDATE user_profiles 
SET role = 'viewer' 
WHERE email = '訪客的email@example.com';

-- 或者，將所有沒有明確設置角色的用戶設為 viewer
UPDATE user_profiles 
SET role = 'viewer' 
WHERE role IS NULL OR role = '';
```

### 4. 檢查 RLS 政策

確認 `user_profiles` 表的 RLS 政策允許用戶查詢自己的角色：

```sql
-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

## 已實施的修復

### 1. 角色驗證
- 在所有獲取角色的地方添加了角色值驗證
- 如果角色值無效，會使用 `viewer` 作為默認值

### 2. 詳細日誌
- 添加了詳細的日誌記錄，包括：
  - 查詢結果
  - 角色值驗證
  - 警告訊息

### 3. 初始化邏輯改善
- 初始化時不再立即設置角色為 `operator`
- 等待角色查詢完成後再設置用戶狀態
- 確保角色是正確的

### 4. 錯誤處理
- 所有錯誤情況都使用 `viewer` 作為默認角色
- 符合最小權限原則

## 如果問題仍然存在

如果問題仍然存在，請：
1. 檢查瀏覽器控制台的日誌
2. 檢查資料庫中的角色值
3. 確認 RLS 政策是否正確
4. 提供詳細的錯誤日誌以便進一步調試
