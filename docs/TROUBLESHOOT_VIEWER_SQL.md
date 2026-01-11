# Viewer SQL 執行問題排查指南

## ❌ 問題：執行 SQL 後沒反應

如果您執行了 SQL 腳本但沒有看到結果，請按照以下步驟排查：

---

## 🔍 排查步驟

### 步驟 1：檢查是否有錯誤訊息

在 Supabase SQL Editor 中，執行 SQL 後：

1. **查看下方結果面板**：
   - 如果執行成功，應該會看到「Success. No rows returned」或類似訊息
   - 如果有錯誤，會顯示紅色錯誤訊息

2. **常見錯誤訊息**：
   - `ERROR: duplicate key value violates unique constraint` - UUID 或 email 重複
   - `ERROR: insert or update on table "user_profiles" violates foreign key constraint` - UUID 不存在於 auth.users 表
   - `ERROR: syntax error` - SQL 語法錯誤
   - `ERROR: invalid input syntax for type uuid` - UUID 格式錯誤

### 步驟 2：確認是否選擇了所有 SQL 語句

**問題**：如果只選擇了部分 SQL，可能只執行了部分語句。

**解決方法**：
1. 在 SQL Editor 中，按 `Ctrl+A`（Windows）或 `Cmd+A`（Mac）選擇所有內容
2. 點擊 **Run** 執行
3. 或者直接點擊 **Run**（如果不選擇任何內容，會執行所有 SQL）

### 步驟 3：檢查 SQL 語法

確認每個 INSERT 語句都正確：

```sql
-- ✅ 正確格式
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '434c8e6e-d5fa-4c1a-a967-505a146a4d82',  -- UUID（必須存在於 auth.users 表中）
  'ali.liu@avient.com',  -- Email
  'viewer'  -- 角色
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();
```

**檢查項目**：
- [ ] UUID 用單引號包圍
- [ ] Email 用單引號包圍
- [ ] 角色是 `'viewer'`
- [ ] 每個值後面有逗號（最後一個除外）
- [ ] 語句結尾有分號 `;`

### 步驟 4：確認 UUID 是否存在

**問題**：如果 UUID 不存在於 `auth.users` 表中，插入會失敗。

**檢查方法**：

在 SQL Editor 中執行以下查詢，確認 UUID 是否存在：

```sql
-- 檢查 UUID 是否存在於 auth.users 表中
SELECT id, email 
FROM auth.users 
WHERE id = '434c8e6e-d5fa-4c1a-a967-505a146a4d82';  -- 替換為您的 UUID
```

**如果查詢沒有結果**：
- UUID 不存在，需要先在 Supabase Dashboard > Authentication > Users 中建立用戶
- 或者 UUID 複製錯誤

### 步驟 5：測試單個 INSERT 語句

**建議**：先測試一個 INSERT 語句，確認格式正確：

```sql
-- 測試 Viewer 1（只執行這一個）
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '434c8e6e-d5fa-4c1a-a967-505a146a4d82',  -- 替換為實際 UUID
  'ali.liu@avient.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- 立即驗證
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles 
WHERE email = 'ali.liu@avient.com';
```

**如果這個測試成功**：
- 說明格式正確，可以繼續執行其他語句
- 可能是執行方式有問題，需要確認是否選擇了所有語句

**如果這個測試失敗**：
- 查看錯誤訊息，找出問題
- 可能是 UUID 不存在或格式錯誤

### 步驟 6：使用批量查詢檢查所有 UUID

如果您不確定哪些 UUID 是正確的，可以執行：

```sql
-- 查詢最近創建的用戶（應該包括您剛建立的 9 個 viewer）
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;
```

然後確認每個 UUID 都正確複製到 SQL 腳本中。

---

## ✅ 正確的執行方法

### 方法 1：執行完整腳本（推薦）

1. 在 SQL Editor 中打開 `supabase_add_nine_viewers.sql`
2. 確認所有 9 個 viewer 的 UUID 和 email 都已填寫
3. **不要選擇任何內容**（讓游標在文件中，但不選擇文字）
4. 點擊 **Run** 按鈕（或按 `Ctrl+Enter`）
5. 應該會看到類似「Success. No rows returned」的訊息

### 方法 2：分批執行

如果一次性執行所有語句有問題，可以分 2-3 批執行：

**第一批（Viewer 1-3）：**
```sql
-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES ('uuid1', 'email1', 'viewer')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, updated_at = NOW();

-- Viewer 2
INSERT INTO public.user_profiles (id, email, role)
VALUES ('uuid2', 'email2', 'viewer')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, updated_at = NOW();

-- Viewer 3
INSERT INTO public.user_profiles (id, email, role)
VALUES ('uuid3', 'email3', 'viewer')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, updated_at = NOW();
```

執行後驗證：
```sql
SELECT id, email, role FROM public.user_profiles WHERE role = 'viewer' ORDER BY created_at DESC;
```

然後繼續執行第二批、第三批。

---

## 🔧 常見問題解決

### 問題 1：UUID 不存在

**錯誤訊息**：
```
ERROR: insert or update on table "user_profiles" violates foreign key constraint
```

**解決方法**：
1. 確認 UUID 是否正確複製
2. 確認用戶是否已在 Supabase Dashboard > Authentication > Users 中建立
3. 使用以下查詢確認 UUID 是否存在：
   ```sql
   SELECT id, email FROM auth.users WHERE id = 'your-uuid-here';
   ```

### 問題 2：Email 或 UUID 重複

**錯誤訊息**：
```
ERROR: duplicate key value violates unique constraint
```

**解決方法**：
1. 確認 email 是否已被其他用戶使用
2. 確認 UUID 是否已存在於 user_profiles 表中
3. 使用 `ON CONFLICT DO UPDATE` 語句（已經包含在腳本中）可以自動更新現有記錄

### 問題 3：UUID 格式錯誤

**錯誤訊息**：
```
ERROR: invalid input syntax for type uuid
```

**解決方法**：
1. 確認 UUID 格式正確（例如：`434c8e6e-d5fa-4c1a-a967-505a146a4d82`）
2. 確認 UUID 用單引號包圍
3. 確認沒有多餘的空格或特殊字符

### 問題 4：SQL 語法錯誤

**錯誤訊息**：
```
ERROR: syntax error at or near "..."
```

**解決方法**：
1. 檢查每個 INSERT 語句的語法
2. 確認所有單引號都正確配對
3. 確認每個語句結尾都有分號
4. 確認逗號使用正確

---

## 📝 驗證查詢

執行 SQL 後，使用以下查詢驗證結果：

```sql
-- 查看所有 viewer（讀者）
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles 
WHERE role = 'viewer'
ORDER BY created_at DESC;
```

**預期結果**：
- 應該看到所有 9 個 viewer 帳號
- 每個帳號的 `role` 應該是 `viewer`
- `created_at` 或 `updated_at` 應該是最近的時間戳

---

## 🆘 如果還是有問題

如果按照以上步驟排查後仍然沒有反應：

1. **截圖錯誤訊息**：如果看到任何錯誤訊息，請截圖
2. **檢查執行日誌**：在 Supabase Dashboard 中查看執行日誌
3. **嘗試單個語句**：先執行一個 INSERT 語句，確認基本功能正常
4. **確認權限**：確認您有權限插入 user_profiles 表

---

## 💡 建議

1. **使用 Excel 記錄**：建議使用 Excel 記錄所有 UUID 和 email，方便管理
2. **分批執行**：如果一次性執行所有語句有問題，可以分批執行
3. **驗證每個步驟**：每執行一批，立即驗證結果，確保正確
