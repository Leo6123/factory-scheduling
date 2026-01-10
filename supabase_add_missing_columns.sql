-- 添加缺失的資料庫欄位
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查現有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'schedule_items'
ORDER BY ordinal_position;

-- 2. 添加 material_ready_date 欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'material_ready_date'
  ) THEN
    ALTER TABLE public.schedule_items
    ADD COLUMN material_ready_date DATE;
    
    RAISE NOTICE '✅ 已添加 material_ready_date 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ material_ready_date 欄位已存在';
  END IF;
END $$;

-- 3. 添加 recipe_items 欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'recipe_items'
  ) THEN
    ALTER TABLE public.schedule_items
    ADD COLUMN recipe_items JSONB;
    
    RAISE NOTICE '✅ 已添加 recipe_items 欄位 (JSONB 類型)';
  ELSE
    RAISE NOTICE 'ℹ️ recipe_items 欄位已存在';
  END IF;
END $$;

-- 4. 添加 remark 欄位（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'remark'
  ) THEN
    ALTER TABLE public.schedule_items
    ADD COLUMN remark TEXT;
    
    RAISE NOTICE '✅ 已添加 remark 欄位';
  ELSE
    RAISE NOTICE 'ℹ️ remark 欄位已存在';
  END IF;
END $$;

-- 5. 驗證欄位已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'schedule_items'
AND column_name IN ('material_ready_date', 'recipe_items', 'remark')
ORDER BY column_name;

-- 6. 修改 start_hour 欄位類型（如果存在且是整數，改為支援小數）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'start_hour'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.schedule_items
    ALTER COLUMN start_hour TYPE NUMERIC(5,2);
    
    RAISE NOTICE '✅ 已將 start_hour 欄位改為 NUMERIC(5,2) 以支援小數';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'start_hour'
  ) THEN
    RAISE NOTICE 'ℹ️ start_hour 欄位已存在且不是整數類型';
  ELSE
    RAISE NOTICE 'ℹ️ start_hour 欄位不存在（將在應用程式首次使用時建立）';
  END IF;
END $$;

-- 7. 修改 maintenance_hours 欄位類型（如果存在且是整數，改為支援小數）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'maintenance_hours'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.schedule_items
    ALTER COLUMN maintenance_hours TYPE NUMERIC(5,2);
    
    RAISE NOTICE '✅ 已將 maintenance_hours 欄位改為 NUMERIC(5,2) 以支援小數';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schedule_items'
    AND column_name = 'maintenance_hours'
  ) THEN
    RAISE NOTICE 'ℹ️ maintenance_hours 欄位已存在且不是整數類型';
  ELSE
    RAISE NOTICE 'ℹ️ maintenance_hours 欄位不存在（將在應用程式首次使用時建立）';
  END IF;
END $$;

-- 8. 檢查 RLS 政策（確保有寫入權限）
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'schedule_items';

-- 如果沒有 RLS 政策，建立一個（允許所有操作）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'schedule_items'
  ) THEN
    CREATE POLICY "Allow all operations on schedule_items"
    ON public.schedule_items
    FOR ALL
    USING (true)
    WITH CHECK (true);
    
    RAISE NOTICE '✅ 已建立 RLS 政策：允許所有操作';
  ELSE
    RAISE NOTICE 'ℹ️ RLS 政策已存在';
  END IF;
END $$;

