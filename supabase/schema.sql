-- 排程項目表格
CREATE TABLE IF NOT EXISTS schedule_items (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  material_description TEXT,
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  delivery_date DATE NOT NULL,
  line_id TEXT NOT NULL,
  schedule_date DATE,
  start_hour INTEGER,
  needs_crystallization BOOLEAN DEFAULT FALSE,
  needs_ccd BOOLEAN DEFAULT FALSE,
  needs_dryblending BOOLEAN DEFAULT FALSE,
  needs_package BOOLEAN DEFAULT FALSE,
  is_cleaning_process BOOLEAN DEFAULT FALSE,
  cleaning_type TEXT CHECK (cleaning_type IN ('A', 'B', 'C', 'D', 'E')),
  is_abnormal_incomplete BOOLEAN DEFAULT FALSE,
  is_maintenance BOOLEAN DEFAULT FALSE,
  maintenance_hours NUMERIC,
  process_order TEXT,
  customer TEXT,
  sales_document TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 產線設定表格
CREATE TABLE IF NOT EXISTS line_configs (
  line_id TEXT PRIMARY KEY,
  avg_output NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_schedule_items_line_id ON schedule_items(line_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule_date ON schedule_items(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_delivery_date ON schedule_items(delivery_date);
CREATE INDEX IF NOT EXISTS idx_schedule_items_batch_number ON schedule_items(batch_number);

-- 自動更新 updated_at 的觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 schedule_items 建立觸發器
CREATE TRIGGER update_schedule_items_updated_at
  BEFORE UPDATE ON schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 為 line_configs 建立觸發器
CREATE TRIGGER update_line_configs_updated_at
  BEFORE UPDATE ON line_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 啟用 Row Level Security (RLS) - 可根據需求調整
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_configs ENABLE ROW LEVEL SECURITY;

-- 建立政策：允許所有操作（生產環境應根據需求調整）
CREATE POLICY "Allow all operations on schedule_items"
  ON schedule_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on line_configs"
  ON line_configs
  FOR ALL
  USING (true)
  WITH CHECK (true);

