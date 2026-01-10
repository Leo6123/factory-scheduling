-- ============================================
-- 直接使用 SQL 啟用 Supabase Realtime
-- ============================================
-- 如果 Dashboard UI 中找不到 Realtime 選項，可以使用此腳本
-- ============================================

-- 1. 確保 schedule_items 表存在
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  material_description TEXT,
  batch_number TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  delivery_date DATE NOT NULL,
  material_ready_date DATE,
  line_id TEXT NOT NULL,
  schedule_date DATE,
  start_hour INTEGER,
  needs_crystallization BOOLEAN DEFAULT FALSE,
  needs_ccd BOOLEAN DEFAULT FALSE,
  needs_dryblending BOOLEAN DEFAULT FALSE,
  needs_package BOOLEAN DEFAULT FALSE,
  is_cleaning_process BOOLEAN DEFAULT FALSE,
  cleaning_type TEXT,
  is_abnormal_incomplete BOOLEAN DEFAULT FALSE,
  is_maintenance BOOLEAN DEFAULT FALSE,
  maintenance_hours NUMERIC,
  process_order TEXT,
  customer TEXT,
  sales_document TEXT,
  remark TEXT,
  recipe_items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 確保 line_configs 表存在
-- ============================================
CREATE TABLE IF NOT EXISTS public.line_configs (
  line_id TEXT PRIMARY KEY,
  capacity_per_hour NUMERIC NOT NULL DEFAULT 0,
  config_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 啟用 Realtime Publication（直接添加到 supabase_realtime publication）
-- ============================================
-- 注意：如果報錯 "publication supabase_realtime does not exist"，
-- 表示您的 Supabase 版本可能不支持此方式，請使用 Dashboard UI

-- 嘗試添加 schedule_items 到 Realtime publication
DO $$
BEGIN
  -- 檢查 publication 是否存在
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- 添加表到 publication
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;
      RAISE NOTICE '✅ 已將 schedule_items 添加到 Realtime publication';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '✅ schedule_items 已存在于 Realtime publication';
      WHEN OTHERS THEN
        RAISE WARNING '⚠️ 無法添加 schedule_items 到 Realtime publication: %', SQLERRM;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.line_configs;
      RAISE NOTICE '✅ 已將 line_configs 添加到 Realtime publication';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '✅ line_configs 已存在于 Realtime publication';
      WHEN OTHERS THEN
        RAISE WARNING '⚠️ 無法添加 line_configs 到 Realtime publication: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING '⚠️ supabase_realtime publication 不存在，請使用 Dashboard UI 啟用 Realtime';
  END IF;
END $$;

-- 4. 驗證 Realtime 是否已啟用
-- ============================================
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = current_row.tablename
    ) THEN '✅ 已啟用 Realtime'
    ELSE '❌ 未啟用 Realtime（請使用 Dashboard UI 啟用）'
  END as realtime_status
FROM (
  VALUES ('schedule_items'), ('line_configs')
) AS current_row(tablename)
LEFT JOIN pg_tables pt ON pt.tablename = current_row.tablename AND pt.schemaname = 'public';

-- ============================================
-- 如果 SQL 方式不工作，請使用 Dashboard UI：
-- ============================================
-- 1. 前往 Supabase Dashboard > Database > Tables
-- 2. 點擊 schedule_items 表
-- 3. 在右側面板找到 Realtime 選項並啟用
-- ============================================
