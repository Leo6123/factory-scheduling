# 如何正確執行 RLS 政策腳本

## ⚠️ 重要提示

**不要複製 Markdown 文檔到 SQL Editor！**

- ❌ 不要複製 `docs/HOW_TO_CHECK_RLS_FUNCTIONS.md`（這是說明文檔）
- ✅ 要複製 `supabase_secure_rls_policies.sql`（這是 SQL 腳本）

---

## 📋 正確步驟

### 步驟 1：找到正確的 SQL 文件

1. 在文件系統中找到 **`supabase_secure_rls_policies.sql`** 文件
   - 這個文件應該在專案的根目錄
   - 文件名：`supabase_secure_rls_policies.sql`
   - **不是** `docs/HOW_TO_CHECK_RLS_FUNCTIONS.md`（這是文檔）

### 步驟 2：打開 SQL 文件

1. 用文字編輯器（例如：VS Code、記事本）打開 `supabase_secure_rls_policies.sql`
2. 確認文件內容以 SQL 語句開頭，例如：
   ```sql
   -- ============================================
   -- 安全強化的 RLS 政策（基於角色的權限控制）
   -- ============================================
   CREATE TABLE IF NOT EXISTS public.user_profiles (
   ...
   ```
3. **不是**以 `#` 開頭的 Markdown 標題（例如：`# 如何檢查 RLS 函數是否存在`）

### 步驟 3：複製 SQL 腳本

1. 全選文件內容（`Ctrl + A`）
2. 複製所有內容（`Ctrl + C`）
3. 確認複製的內容是 SQL 代碼（包含 `CREATE TABLE`、`CREATE FUNCTION`、`CREATE POLICY` 等）

### 步驟 4：在 Supabase SQL Editor 中貼上

1. 在 Supabase SQL Editor 中，點擊 **"New Query"** 或 **"+"** 按鈕
2. 在編輯區域中貼上 SQL 代碼（`Ctrl + V`）
3. **確認**貼上的內容是 SQL 代碼，不是 Markdown 文檔

### 步驟 5：執行 SQL 腳本

1. 點擊 **"Run"** 按鈕（或按 `Ctrl + Enter`）
2. 等待執行完成

---

## 🔍 如何區分 SQL 文件和 Markdown 文檔？

### SQL 文件（正確）
- 文件名：`supabase_secure_rls_policies.sql`
- 文件開頭通常是：
  ```sql
  -- ============================================
  -- 安全強化的 RLS 政策...
  CREATE TABLE IF NOT EXISTS...
  ```
- 包含 SQL 語句：`CREATE TABLE`、`CREATE FUNCTION`、`CREATE POLICY`、`SELECT` 等

### Markdown 文檔（錯誤 - 不要複製）
- 文件名：`HOW_TO_CHECK_RLS_FUNCTIONS.md`、`FIX_MISSING_RLS_FUNCTIONS.md` 等
- 文件開頭通常是：
  ```markdown
  # 如何檢查 RLS 函數是否存在
  ## 📋 詳細步驟說明
  ```
- 包含 Markdown 語法：`#`、`##`、`**`、列表等

---

## ❌ 常見錯誤

### 錯誤 1：複製了 Markdown 文檔

**錯誤訊息**：
```
ERROR: 42601: syntax error at or near "#"
LINE 1: # 如何檢查 RLS 函數是否存在
```

**原因**：將 Markdown 文檔內容貼到了 SQL Editor

**解決方案**：
1. 確認複製的是 `supabase_secure_rls_policies.sql` 文件
2. 不是 `docs/` 資料夾下的 `.md` 文件

### 錯誤 2：文件路徑錯誤

**錯誤訊息**：找不到文件

**解決方案**：
- 確認 `supabase_secure_rls_policies.sql` 文件在專案根目錄
- 如果沒有，檢查是否有其他類似名稱的文件（例如：`supabase_fix_rls_complete.sql`）

---

## ✅ 執行後檢查

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

## 📝 快速檢查清單

- [ ] 打開的是 `supabase_secure_rls_policies.sql` 文件（不是 `.md` 文件）
- [ ] 文件內容以 SQL 語句開頭（`--` 註釋或 `CREATE` 語句）
- [ ] 不是以 Markdown 標題開頭（`#`）
- [ ] 複製的是 SQL 代碼（不是說明文檔）
- [ ] 在 SQL Editor 中貼上後，內容看起來像 SQL 代碼
