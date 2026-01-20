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
