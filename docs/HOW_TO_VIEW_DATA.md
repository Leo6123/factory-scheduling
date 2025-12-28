# 如何在 Supabase 查看資料

本指南說明如何在 Supabase Dashboard 中查看和管理排程資料。

## 📋 目錄

1. [登入 Supabase](#登入-supabase)
2. [查看資料表格](#查看資料表格)
3. [查看排程項目](#查看排程項目)
4. [查看產線設定](#查看產線設定)
5. [編輯資料](#編輯資料)
6. [匯出資料](#匯出資料)

## 🔐 登入 Supabase

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 使用您的帳號登入
3. 選擇您的專案（factory-scheduling 或您建立的專案名稱）

## 📊 查看資料表格

### 方法 1：使用 Table Editor（圖形介面）

1. 在左側選單中，點擊 **Table Editor**
2. 您會看到所有已建立的表格：
   - `schedule_items` - 排程項目資料
   - `line_configs` - 產線設定資料

### 方法 2：使用 SQL Editor（查詢）

1. 在左側選單中，點擊 **SQL Editor**
2. 點擊 **New Query**
3. 輸入以下 SQL 查詢：

```sql
-- 查看所有排程項目
SELECT * FROM schedule_items
ORDER BY created_at DESC;

-- 查看特定產線的排程
SELECT * FROM schedule_items
WHERE line_id = 'TS26'
ORDER BY schedule_date, start_hour;

-- 查看未排程的項目
SELECT * FROM schedule_items
WHERE schedule_date IS NULL;

-- 查看產線設定
SELECT * FROM line_configs;
```

4. 點擊 **Run** 執行查詢
5. 結果會顯示在下方的表格中

## 📝 查看排程項目

### 查看所有排程項目

1. 點擊 **Table Editor** → **schedule_items**
2. 您會看到所有排程項目的列表
3. 表格欄位說明：
   - `id` - 項目唯一識別碼
   - `product_name` - 產品名稱（Material Number）
   - `material_description` - 產品描述
   - `batch_number` - 批號
   - `quantity` - 數量（KG）
   - `delivery_date` - 需求日期
   - `line_id` - 產線 ID
   - `schedule_date` - 排程日期
   - `start_hour` - 開始時間（小時，0-24）
   - `needs_crystallization` - 是否需要結晶
   - `needs_ccd` - 是否需要 CCD
   - `needs_dryblending` - 是否需要 Dryblending
   - `needs_package` - 是否需要 Package
   - `is_cleaning_process` - 是否為清機流程
   - `cleaning_type` - 清機類型（A/B/C/D/E）
   - `is_abnormal_incomplete` - 是否異常未完成
   - `is_maintenance` - 是否為故障維修
   - `maintenance_hours` - 維修時長（小時）
   - `created_at` - 建立時間
   - `updated_at` - 最後更新時間

### 篩選和搜尋

1. 在表格上方使用 **Filter** 按鈕
2. 可以根據以下條件篩選：
   - 產線 (`line_id`)
   - 排程日期 (`schedule_date`)
   - 需求日期 (`delivery_date`)
   - 批號 (`batch_number`)
   - 產品名稱 (`product_name`)

3. 使用搜尋框快速找到特定項目

### 排序

1. 點擊欄位標題可以排序
2. 預設按 `created_at` 降序排列（最新的在最上面）

## ⚙️ 查看產線設定

1. 點擊 **Table Editor** → **line_configs**
2. 查看各產線的產能設定：
   - `line_id` - 產線 ID
   - `avg_output` - 平均產能（KG/小時）
   - `updated_at` - 最後更新時間

## ✏️ 編輯資料

### 在 Table Editor 中編輯

1. 在表格中找到要編輯的列
2. 點擊該列進入編輯模式
3. 修改欄位值
4. 點擊 **Save** 儲存變更

### 使用 SQL 更新

在 **SQL Editor** 中執行：

```sql
-- 更新特定項目的數量
UPDATE schedule_items
SET quantity = 1000
WHERE id = 'your-item-id';

-- 更新產線產能
UPDATE line_configs
SET avg_output = 500
WHERE line_id = 'TS26';
```

## 📤 匯出資料

### 方法 1：從 Table Editor 匯出

1. 在 **Table Editor** 中選擇表格
2. 點擊右上角的 **Export** 按鈕
3. 選擇匯出格式：
   - CSV
   - JSON
   - Excel

### 方法 2：使用 SQL 查詢匯出

1. 在 **SQL Editor** 中執行查詢
2. 點擊結果表格右上角的 **Export** 按鈕
3. 選擇匯出格式

### 方法 3：使用 API

Supabase 提供 REST API，可以在程式中匯出資料：

```javascript
const { data, error } = await supabase
  .from('schedule_items')
  .select('*')
  .csv(); // 或 .json()
```

## 🔍 進階查詢範例

### 查看今日排程

```sql
SELECT * FROM schedule_items
WHERE schedule_date = CURRENT_DATE
ORDER BY line_id, start_hour;
```

### 查看本週排程

```sql
SELECT * FROM schedule_items
WHERE schedule_date >= DATE_TRUNC('week', CURRENT_DATE)
  AND schedule_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
ORDER BY schedule_date, line_id, start_hour;
```

### 統計各產線的排程數量

```sql
SELECT 
  line_id,
  COUNT(*) as total_items,
  SUM(quantity) as total_quantity
FROM schedule_items
WHERE schedule_date IS NOT NULL
GROUP BY line_id
ORDER BY line_id;
```

### 查看需要結晶的項目

```sql
SELECT * FROM schedule_items
WHERE needs_crystallization = true
ORDER BY schedule_date, start_hour;
```

## 📊 查看資料統計

### 使用 SQL 查詢統計資訊

```sql
-- 總排程項目數
SELECT COUNT(*) as total_items FROM schedule_items;

-- 已排程 vs 未排程
SELECT 
  CASE 
    WHEN schedule_date IS NULL THEN '未排程'
    ELSE '已排程'
  END as status,
  COUNT(*) as count
FROM schedule_items
GROUP BY status;

-- 各產線的排程統計
SELECT 
  line_id,
  COUNT(*) as item_count,
  SUM(quantity) as total_quantity,
  AVG(quantity) as avg_quantity
FROM schedule_items
WHERE schedule_date IS NOT NULL
GROUP BY line_id;
```

## 🗑️ 刪除資料

### 在 Table Editor 中刪除

1. 選擇要刪除的列
2. 點擊 **Delete** 按鈕
3. 確認刪除

### 使用 SQL 刪除

```sql
-- 刪除特定項目
DELETE FROM schedule_items WHERE id = 'your-item-id';

-- 刪除所有未排程項目
DELETE FROM schedule_items WHERE schedule_date IS NULL;

-- 清空整個表格（請謹慎使用！）
DELETE FROM schedule_items;
```

## 🔔 監控資料變更

### 查看 Logs

1. 點擊左側選單的 **Logs**
2. 選擇 **Postgres Logs** 查看資料庫操作記錄
3. 選擇 **API Logs** 查看 API 請求記錄

### 查看 Database Activity

1. 點擊左側選單的 **Database**
2. 選擇 **Activity** 查看資料庫活動
3. 可以看到即時的查詢和操作

## 💡 小技巧

1. **使用篩選器快速找到資料**：在 Table Editor 中使用 Filter 功能
2. **儲存常用查詢**：在 SQL Editor 中將常用查詢儲存為範本
3. **設定自動重新整理**：在 Table Editor 中可以設定自動重新整理間隔
4. **使用視圖（Views）**：可以建立自訂視圖來簡化常用查詢

## 🆘 常見問題

### Q: 看不到資料？

A: 確認：
1. 應用程式已成功連接到 Supabase
2. 資料已成功儲存（檢查 Logs）
3. 表格已正確建立（檢查 Database → Tables）

### Q: 如何備份資料？

A: 
1. 使用 Table Editor 的 Export 功能匯出 CSV/JSON
2. 或使用 SQL Editor 執行查詢後匯出結果
3. 定期備份是良好習慣

### Q: 可以還原資料嗎？

A: Supabase 提供時間點還原功能（需付費方案），或使用匯出的備份檔案手動還原。

## 📚 相關資源

- [Supabase Dashboard 文件](https://supabase.com/docs/guides/dashboard)
- [Supabase SQL Editor 指南](https://supabase.com/docs/guides/database/tables)
- [Supabase Table Editor 指南](https://supabase.com/docs/guides/database/tables)

