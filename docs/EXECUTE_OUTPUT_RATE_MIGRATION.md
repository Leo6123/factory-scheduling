# 執行 output_rate 欄位 Migration

## 方法 1：透過 Supabase Dashboard（推薦）

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇您的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊 **New query**
5. 複製並貼上以下 SQL：

```sql
-- 添加 output_rate 欄位到 schedule_items 表
-- 此欄位用於儲存每張卡片的出量 (kg/h)，預設值為 50

ALTER TABLE schedule_items 
ADD COLUMN IF NOT EXISTS output_rate NUMERIC DEFAULT 50;

-- 為現有資料設定預設值（如果為 NULL）
UPDATE schedule_items 
SET output_rate = 50 
WHERE output_rate IS NULL;

-- 添加註解說明
COMMENT ON COLUMN schedule_items.output_rate IS '出量 (kg/h)，預設 50';
```

6. 點擊 **Run** 執行
7. 確認執行成功（應該顯示 "Success. No rows returned"）

## 方法 2：透過 Supabase CLI（如果已安裝）

```bash
# 確保已登入 Supabase CLI
supabase login

# 連結到您的專案
supabase link --project-ref <your-project-ref>

# 執行 migration
supabase db push
```

## 驗證 Migration 是否成功

執行以下 SQL 查詢確認欄位已添加：

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'schedule_items' 
  AND column_name = 'output_rate';
```

應該會看到：
- `column_name`: `output_rate`
- `data_type`: `numeric`
- `column_default`: `50`

## 完成後

Migration 執行完成後，重新整理應用程式頁面，修改卡片的「出量」應該可以正確保存了。
