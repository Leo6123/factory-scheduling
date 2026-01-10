# 如何在 Supabase Dashboard 中找到並啟用 schedule_items 表的 Realtime

## 📍 方法 1：通過 Database > Tables（推薦）

### 步驟：

1. **前往 Database > Tables**
   - 在 Supabase Dashboard 左側選單
   - 點擊 **Database** > **Tables**

2. **找到 `schedule_items` 表**
   - 在表列表中尋找 `schedule_items`
   - 如果表不存在，需要先創建（見下方說明）

3. **點擊表名**
   - 點擊 `schedule_items` 表名進入表詳情頁

4. **啟用 Realtime**
   - 在表詳情頁的右側，找到 **Realtime** 開關
   - 或者在上方工具欄中，找到 **Realtime** 選項
   - 點擊 **Enable** 或切換開關為 **ON**

---

## 📍 方法 2：通過 Database > Replication（如果方法 1 找不到）

### 步驟：

1. **前往 Database > Replication**
   - 在 Supabase Dashboard 左側選單
   - 點擊 **Database** > **Replication**

2. **找到 Publication 部分**
   - 在這個頁面，可能有一個「Publications」區域
   - 或者有一個表列表，顯示所有可以啟用 Realtime 的表

3. **尋找 `schedule_items`**
   - 在表列表中尋找 `schedule_items`
   - 旁邊應該有一個 **Realtime** 開關或 **Enable** 按鈕

4. **啟用 Realtime**
   - 點擊 `schedule_items` 旁邊的 **Enable Realtime** 按鈕
   - 或切換開關為 **ON**

---

## ⚠️ 如果找不到 `schedule_items` 表

### 原因：表可能尚未創建

### 解決方法：執行 SQL 腳本創建表

1. **前往 SQL Editor**
   - 在 Supabase Dashboard 左側選單
   - 點擊 **SQL Editor**

2. **執行創建表的腳本**
   - 執行 `supabase_security_setup.sql` 或 `supabase_fix_rls_complete.sql`
   - 這些腳本會自動創建 `schedule_items` 表（如果不存在）

3. **驗證表是否創建**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name = 'schedule_items';
   ```
   - 如果查詢返回 `schedule_items`，表示表已創建

4. **然後回到方法 1 或方法 2 啟用 Realtime**

---

## 📍 方法 3：使用 SQL 直接啟用 Realtime

如果上述方法都找不到 UI 選項，可以使用 SQL：

```sql
-- 啟用 schedule_items 表的 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;

-- 啟用 line_configs 表的 Realtime（如果需要）
ALTER PUBLICATION supabase_realtime ADD TABLE public.line_configs;
```

### 驗證是否成功：

```sql
-- 檢查 Realtime 是否已啟用
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('schedule_items', 'line_configs');
```

如果查詢返回結果，表示 Realtime 已啟用。

---

## 🎯 推薦執行順序

1. **首先檢查表是否存在**
   - 前往 **Database > Tables**
   - 查看是否有 `schedule_items` 表

2. **如果表不存在，先創建表**
   - 執行 `supabase_security_setup.sql` 或 `supabase_fix_rls_complete.sql`

3. **然後啟用 Realtime**
   - 使用方法 1（推薦）
   - 如果方法 1 找不到，使用方法 3（SQL）

4. **驗證 Realtime 是否啟用**
   - 在應用程式中打開瀏覽器控制台（F12）
   - 應該看到「✅ 已成功訂閱 schedule_items 即時變更」

---

## 📸 Supabase Dashboard 界面說明

### Database > Tables 頁面應該看到：
- 左側：表列表（包括 `schedule_items`）
- 右側：表詳情，包含 Columns、Data、Relations 等標籤
- 在某個位置應該有 **Realtime** 開關或選項

### Database > Replication 頁面應該看到：
- 上方：可能有一個 **Publications** 或 **Tables** 區域
- 表列表，每個表旁邊有 Realtime 開關

---

## ❓ 如果仍然找不到

請提供以下信息：
1. Supabase Dashboard 的左側選單有哪些選項？
2. 在 **Database > Tables** 中看到了哪些表？
3. 是否有看到 `schedule_items` 表？
4. 如果沒有，請執行 `supabase_security_setup.sql` 創建表

---

## 🔍 快速檢查腳本

執行以下 SQL 來檢查當前狀態：

```sql
-- 1. 檢查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'schedule_items';

-- 2. 檢查 Realtime 是否已啟用
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'schedule_items'
    ) THEN '✅ 已啟用'
    ELSE '❌ 未啟用'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'schedule_items';
```
