-- 添加 remark 欄位到 schedule_items 表
-- 在 Supabase SQL Editor 中執行此腳本

-- 檢查現有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'schedule_items'
AND column_name = 'remark';

-- 添加 remark 欄位（如果不存在）
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

-- 驗證欄位已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'schedule_items'
AND column_name = 'remark';
