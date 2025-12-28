-- 只新增缺少的欄位（不包含觸發器，因為觸發器已存在）
-- 如果欄位已存在，會自動跳過（不會報錯）

ALTER TABLE schedule_items 
ADD COLUMN IF NOT EXISTS process_order TEXT,
ADD COLUMN IF NOT EXISTS customer TEXT,
ADD COLUMN IF NOT EXISTS sales_document TEXT;

-- 確認欄位已新增（可選，用來檢查）
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedule_items' 
  AND column_name IN ('process_order', 'customer', 'sales_document');

