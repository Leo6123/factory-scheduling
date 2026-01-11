# 修復缺失的 RLS 函數

## ❌ 問題確認

檢查結果顯示：**函數不存在**

- `get_user_role()` - ❌ 不存在
- `get_user_role_safe()` - ❌ 不存在

**影響**：
- RLS 政策無法正常工作
- 政策數量雖然正確，但政策的 USING 和 WITH CHECK 條件中使用的函數不存在
- 這意味著 RLS 政策實際上可能無效

---

## ✅ 解決方案

需要執行 `supabase_secure_rls_policies.sql` 腳本來創建這些函數。

---

## 📋 修復步驟

### 步驟 1：打開 supabase_secure_rls_policies.sql 文件

1. 在本地文件系統中打開 `supabase_secure_rls_policies.sql` 文件
2. 全選所有內容（`Ctrl + A`）
3. 複製所有內容（`Ctrl + C`）

### 步驟 2：在 Supabase SQL Editor 中創建新查詢

1. 在 Supabase SQL Editor 中，點擊 **"New Query"**（新查詢）按鈕
   - 或點擊現有查詢標籤旁邊的 **"+"** 按鈕
2. 會創建一個新的查詢標籤

### 步驟 3：貼上 SQL 腳本

1. 在 SQL Editor 的編輯區域中貼上複製的內容（`Ctrl + V`）
2. 確認所有 SQL 代碼都已貼上（應該包含：
   - 創建 `user_profiles` 表的語句
   - 創建 `get_user_role()` 函數
   - 創建 `get_user_role_safe()` 函數
   - 創建所有 RLS 政策

### 步驟 4：執行 SQL 腳本

1. 確認 SQL 代碼完整無誤
2. 點擊 **"Run"** 按鈕（或按 `Ctrl + Enter`）
3. 等待執行完成（可能需要幾秒到十幾秒）

**注意**：
- 腳本中使用了 `CREATE OR REPLACE FUNCTION` 和 `DROP POLICY IF EXISTS`，所以即使政策已存在，也會安全地更新
- 執行過程中可能會看到一些 "relation already exists" 的警告，這是正常的

### 步驟 5：檢查執行結果

執行完成後，檢查：

1. **成功標誌**：
   - 在結果區域應該看到 "Success"
   - 可能有 "0 rows returned" 或顯示一些查詢結果
   - 沒有錯誤訊息（紅色錯誤）

2. **如果出現錯誤**：
   - 查看錯誤訊息
   - 常見錯誤：
     - 權限不足：確認使用的是 postgres 角色
     - 語法錯誤：檢查 SQL 是否完整複製

### 步驟 6：再次檢查函數是否存在

執行完成後，再次運行函數檢查查詢：

```sql
SELECT 
  proname as "函數名稱",
  prorettype::regtype as "返回類型",
  pg_get_function_arguments(oid) as "參數"
FROM pg_proc
WHERE proname IN ('get_user_role', 'get_user_role_safe')
AND pronamespace = 'public'::regnamespace
ORDER BY proname;
```

**預期結果**：應該返回 2 行（兩個函數都存在）

---

## 📝 驗證清單

執行修復後，請確認：

- [ ] SQL 腳本執行成功（無錯誤）
- [ ] `get_user_role()` 函數存在（查詢返回 1 行）
- [ ] `get_user_role_safe()` 函數存在（查詢返回 1 行，總共 2 行）
- [ ] RLS 政策數量仍然正確（可以再次執行 `check_rls_policies.sql` 確認）

---

## ⚠️ 重要說明

### 為什麼需要這些函數？

RLS 政策使用這些函數來檢查用戶角色：

```sql
-- 例如，schedule_items 的 INSERT 政策：
CREATE POLICY "Admin and operator can insert schedule_items"
  ON public.schedule_items
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    public.get_user_role_safe() IN ('admin', 'operator')  -- 使用函數檢查角色
  );
```

如果函數不存在，RLS 政策雖然存在，但無法正確檢查用戶角色，可能會導致：
- 所有用戶都無法操作（如果函數調用失敗）
- 或者所有用戶都可以操作（如果政策條件被忽略）

### 為什麼之前沒有發現？

- 政策數量檢查只檢查政策的數量，不檢查政策的內容是否有效
- 需要檢查函數是否存在才能確認 RLS 政策真正生效

---

## 🔧 如果執行失敗

### 錯誤 1：權限不足

**錯誤訊息**：`permission denied` 或 `must be owner`

**解決方案**：
- 確認使用的是 **postgres** 角色（在 SQL Editor 底部應該顯示 "Role postgres"）
- 如果使用的是其他角色，切換到 postgres 角色

### 錯誤 2：函數已存在但語法不同

**錯誤訊息**：`cannot change return type of existing function`

**解決方案**：
- 先刪除現有函數：
  ```sql
  DROP FUNCTION IF EXISTS public.get_user_role();
  DROP FUNCTION IF EXISTS public.get_user_role_safe();
  ```
- 然後再次執行 `supabase_secure_rls_policies.sql`

### 錯誤 3：表不存在

**錯誤訊息**：`relation "user_profiles" does not exist`

**解決方案**：
- 腳本中已經包含 `CREATE TABLE IF NOT EXISTS`，應該會自動創建
- 如果仍然失敗，可能需要手動創建表（參考 `supabase_secure_rls_policies.sql` 的步驟 1）

---

## 📚 相關文件

- `supabase_secure_rls_policies.sql` - 需要執行的 SQL 腳本
- `check_rls_policies.sql` - 檢查 RLS 政策的腳本
- `check_rls_functions_only.sql` - 檢查函數的單獨查詢
