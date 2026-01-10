-- ============================================
-- 單裝置登入限制 - 資料庫設定
-- ============================================
-- 此腳本實現：當用戶從新裝置登入時，自動登出舊裝置
-- ============================================

-- 1. 創建 device_sessions 表來追蹤活躍的 session
-- ============================================
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  session_token TEXT NOT NULL, -- Supabase session 的 access_token
  device_info TEXT, -- 設備資訊（瀏覽器、作業系統等）
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(user_id) -- 每個用戶只能有一個活躍 session
);

-- 創建索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON public.device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_session_token ON public.device_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_expires_at ON public.device_sessions(expires_at);

-- 啟用 RLS
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

-- 2. RLS 政策：用戶只能查看/更新自己的 session
-- ============================================
DROP POLICY IF EXISTS "Users can view their own device session" ON public.device_sessions;
CREATE POLICY "Users can view their own device session"
  ON public.device_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own device session" ON public.device_sessions;
CREATE POLICY "Users can insert their own device session"
  ON public.device_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own device session" ON public.device_sessions;
CREATE POLICY "Users can update their own device session"
  ON public.device_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own device session" ON public.device_sessions;
CREATE POLICY "Users can delete their own device session"
  ON public.device_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 管理員可以查看所有 session（用於調試）
DROP POLICY IF EXISTS "Admins can view all device sessions" ON public.device_sessions;
CREATE POLICY "Admins can view all device sessions"
  ON public.device_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. 創建函數：註冊新 session（如果已存在舊 session，刪除它）
-- ============================================
CREATE OR REPLACE FUNCTION public.register_device_session(
  p_session_token TEXT,
  p_device_info TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_session_id UUID;
BEGIN
  -- 從 JWT token 中獲取用戶 ID（這裡使用 auth.uid()，因為函數在用戶上下文中執行）
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '用戶未登入';
  END IF;
  
  -- 獲取用戶 email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION '找不到用戶資料';
  END IF;
  
  -- 刪除該用戶的舊 session（如果存在）
  DELETE FROM public.device_sessions
  WHERE user_id = v_user_id;
  
  -- 創建新 session
  INSERT INTO public.device_sessions (
    user_id,
    user_email,
    session_token,
    device_info,
    ip_address,
    expires_at
  )
  VALUES (
    v_user_id,
    v_user_email,
    p_session_token,
    p_device_info,
    p_ip_address,
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_session_id;
  
  RAISE NOTICE '已註冊新 session，用戶: %, Session ID: %', v_user_email, v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- 4. 創建函數：檢查 session 是否有效
-- ============================================
CREATE OR REPLACE FUNCTION public.is_session_valid(p_session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.device_sessions
  WHERE session_token = p_session_token
    AND expires_at > NOW()
    AND user_id = auth.uid();
  
  RETURN v_count > 0;
END;
$$;

-- 5. 創建函數：清理過期 session
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.device_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- 6. 創建觸發器：自動更新 last_active_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_device_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_device_session_activity ON public.device_sessions;
CREATE TRIGGER trigger_update_device_session_activity
  BEFORE UPDATE ON public.device_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_device_session_activity();

-- 7. 驗證結果
-- ============================================
SELECT 
  schemaname,
  tablename,
  '✅ 表已創建' as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'device_sessions';

SELECT 
  routine_name,
  routine_type,
  '✅ 函數已創建' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('register_device_session', 'is_session_valid', 'cleanup_expired_sessions');

-- ============================================
-- 使用說明：
-- ============================================
-- 1. 在應用程式登入時，調用 register_device_session() 函數
-- 2. 在每次 API 請求時，檢查 is_session_valid()
-- 3. 定期執行 cleanup_expired_sessions() 清理過期 session
-- 4. 當新 session 註冊時，舊 session 會自動被刪除
-- ============================================
