# 如何填寫 Viewer SQL 腳本

## 📋 步驟說明

### 步驟 1：取得 9 個 Viewer 的 UUID

在 Supabase Dashboard 中：

1. 前往 **Authentication** > **Users**
2. 找到您建立的 9 個 viewer 帳號
3. 對每個帳號：
   - 點擊用戶進入詳情頁面
   - 複製 **UUID**（格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
   - 記錄對應的 **email**

**建議**：使用 Excel 或文字檔記錄，格式如下：

| 序號 | Email | UUID |
|------|-------|------|
| 1 | viewer1@example.com | 11111111-1111-1111-1111-111111111111 |
| 2 | viewer2@example.com | 22222222-2222-2222-2222-222222222222 |
| ... | ... | ... |
| 9 | viewer9@example.com | 99999999-9999-9999-9999-999999999999 |

### 步驟 2：填寫 SQL 腳本

打開 `supabase_add_nine_viewers.sql` 文件，找到每個 INSERT 語句，替換以下內容：

#### Viewer 1 的範例：

**原始 SQL：**
```sql
-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  'YOUR_USER_ID_1',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 1）
  'viewer1@example.com',  -- Viewer 1 的 email
  'viewer'  -- 設為讀者角色
)
```

**替換後（範例）：**
```sql
-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',  -- 從 Supabase Dashboard > Authentication > Users 複製的 UUID（Viewer 1）
  'viewer1@factory.com',  -- Viewer 1 的 email
  'viewer'  -- 設為讀者角色
)
```

#### 重要提醒：

1. **UUID 必須用單引號包圍**：`'uuid-here'`
2. **Email 必須用單引號包圍**：`'email@example.com'`
3. **角色必須是 `'viewer'`**（不能寫錯）
4. **每個 Viewer（1-9）都要替換**，不要遺漏

### 步驟 3：完整範例

假設您已經建立了 9 個 viewer 帳號，以下是完整的 SQL 範例：

```sql
-- Viewer 1
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',  -- 替換為實際 UUID
  'viewer1@factory.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 2
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',  -- 替換為實際 UUID
  'viewer2@factory.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- Viewer 3
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  '33333333-3333-3333-3333-333333333333',  -- 替換為實際 UUID
  'viewer3@factory.com',  -- 替換為實際 email
  'viewer'
)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email, 
  role = EXCLUDED.role, 
  updated_at = NOW();

-- ...（依此類推到 Viewer 9）

-- 驗證
SELECT id, email, role, created_at, updated_at
FROM public.user_profiles 
WHERE role = 'viewer'
ORDER BY created_at DESC;
```

### 步驟 4：快速查詢 UUID（如果忘記）

如果您忘記某個用戶的 UUID，可以在 SQL Editor 中執行：

```sql
-- 查詢所有用戶的 UUID 和 email
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 20;  -- 顯示最近 20 個用戶
```

然後從結果中找到對應的 viewer email，複製對應的 `id`（UUID）。

---

## ⚠️ 常見錯誤

### 錯誤 1：UUID 沒有用單引號包圍

❌ **錯誤：**
```sql
VALUES (
  11111111-1111-1111-1111-111111111111,  -- 缺少單引號
  'viewer1@factory.com',
  'viewer'
)
```

✅ **正確：**
```sql
VALUES (
  '11111111-1111-1111-1111-111111111111',  -- 有單引號
  'viewer1@factory.com',
  'viewer'
)
```

### 錯誤 2：Email 沒有用單引號包圍

❌ **錯誤：**
```sql
VALUES (
  '11111111-1111-1111-1111-111111111111',
  viewer1@factory.com,  -- 缺少單引號
  'viewer'
)
```

✅ **正確：**
```sql
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'viewer1@factory.com',  -- 有單引號
  'viewer'
)
```

### 錯誤 3：角色寫錯

❌ **錯誤：**
```sql
  'viewer1',  -- 錯誤：應該是 'viewer'
```

✅ **正確：**
```sql
  'viewer'  -- 正確：角色必須是 'viewer'
```

### 錯誤 4：UUID 格式錯誤

❌ **錯誤：**
```sql
  '11111111111111111111111111111111',  -- 缺少連字號
```

✅ **正確：**
```sql
  '11111111-1111-1111-1111-111111111111',  -- 有連字號
```

---

## ✅ 檢查清單

填寫 SQL 腳本時，確保：

- [ ] 9 個 Viewer 的 UUID 都已替換
- [ ] 9 個 Viewer 的 email 都已替換
- [ ] 所有 UUID 都用單引號包圍
- [ ] 所有 email 都用單引號包圍
- [ ] 所有角色都是 `'viewer'`
- [ ] 沒有遺漏任何 Viewer（1-9 都有）
- [ ] 每個 INSERT 語句的語法都正確
- [ ] 最後的驗證查詢已包含

---

## 🚀 執行步驟

1. 在 Supabase Dashboard > SQL Editor 中打開新查詢
2. 複製已填寫完整的 SQL 腳本
3. 貼上到 SQL Editor
4. 點擊 **Run** 執行
5. 檢查結果，應該看到 9 筆 INSERT 成功的訊息
6. 執行驗證查詢，確認所有 viewer 都已建立
