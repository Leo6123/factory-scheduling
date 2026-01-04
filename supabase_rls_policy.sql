-- Supabase RLS 政策設定腳本
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查 RLS 是否啟用
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'schedule_items';

-- 2. 檢查現有的 RLS 政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'schedule_items';

-- 3. 如果 RLS 已啟用但沒有政策，建立允許所有操作的政策（開發階段）
-- 注意：這允許任何人讀寫，僅適用於開發階段
-- 生產環境應該使用更嚴格的政策

-- 先檢查 RLS 是否啟用
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'schedule_items'
    AND rowsecurity = true
  ) THEN
    -- 如果 RLS 已啟用，檢查是否有政策
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'schedule_items'
    ) THEN
      -- 建立允許所有操作的政策
      CREATE POLICY "Allow all operations on schedule_items"
      ON public.schedule_items
      FOR ALL
      USING (true)
      WITH CHECK (true);
      
      RAISE NOTICE '✅ 已建立 RLS 政策：允許所有操作';
    ELSE
      RAISE NOTICE 'ℹ️ RLS 政策已存在';
    END IF;
  ELSE
    -- 如果 RLS 未啟用，啟用它
    ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
    
    -- 建立允許所有操作的政策
    CREATE POLICY "Allow all operations on schedule_items"
    ON public.schedule_items
    FOR ALL
    USING (true)
    WITH CHECK (true);
    
    RAISE NOTICE '✅ 已啟用 RLS 並建立政策：允許所有操作';
  END IF;
END $$;

-- 4. 驗證政策已建立
SELECT 
  policyname,
  cmd as "Command",
  roles
FROM pg_policies
WHERE tablename = 'schedule_items';

