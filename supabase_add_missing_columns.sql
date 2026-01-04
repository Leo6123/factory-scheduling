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

-- 4. 驗證欄位已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'schedule_items'
AND column_name IN ('material_ready_date', 'recipe_items')
ORDER BY column_name;

-- 5. 檢查 RLS 政策（確保有寫入權限）
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

