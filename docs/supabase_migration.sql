-- Supabase 資料庫遷移 SQL
-- 執行此 SQL 以支援新功能

-- 1. 新增建議排程表（如果不存在）
CREATE TABLE IF NOT EXISTS suggested_schedules (
  material_number TEXT PRIMARY KEY,
  suggested_lines JSONB NOT NULL,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- 2. 新增配方資料欄位到 schedule_items 表（如果不存在）
-- 注意：此欄位是可選的，如果不存在，系統會自動跳過
ALTER TABLE schedule_items 
ADD COLUMN IF NOT EXISTS recipe_items JSONB;

-- 3. 建立索引（可選，提升查詢效能）
CREATE INDEX IF NOT EXISTS idx_suggested_schedules_material_number 
ON suggested_schedules(material_number);

-- 4. 檢查現有欄位（可選，用於驗證）
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'schedule_items' 
-- AND column_name IN ('material_ready_date', 'recipe_items');


