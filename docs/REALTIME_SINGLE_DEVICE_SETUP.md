# Realtime 同步 + 單裝置登入 - 設置指南

## 功能說明

### ✅ 已實現功能

1. **Realtime 即時同步**
   - 多個分頁/裝置的排程變更會自動同步（1-2 秒內）
   - 使用 Supabase Realtime 實現

2. **跨分頁自動登出**
   - 在一個分頁登出，所有分頁會自動登出
   - 使用 Supabase Auth 的 `scope: 'global'` 實現

3. **單裝置登入限制**
   - 同一帳號只能在一個裝置登入
   - 從新裝置登入時，舊裝置會自動登出
   - 使用 `device_sessions` 表追蹤活躍 session

---

## 設置步驟

### 步驟 1：啟用 Supabase Realtime

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 左側選單：**Database** > **Replication**
4. 找到以下表，點擊 **Enable Realtime**：
   - ✅ `schedule_items`
   - ✅ `line_configs`

### 步驟 2：執行 SQL 腳本

在 Supabase Dashboard > **SQL Editor** 中執行：

**2.1 啟用 Realtime 和活動追蹤**
```sql
-- 執行 supabase_enable_realtime.sql
-- 或手動執行以下 SQL：
```

```sql
-- 添加活動用戶追蹤欄位
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active_at 
ON public.user_profiles(last_active_at DESC);
```

**2.2 設置單裝置登入限制**
```sql
-- 執行 supabase_single_device_login.sql
-- 這會創建 device_sessions 表和相關函數
```

### 步驟 3：驗證設置

執行驗證 SQL：

```sql
-- 檢查 Realtime 是否啟用（需要在 Dashboard 中手動啟用）
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename IN ('schedule_items', 'line_configs')
    ) THEN '✅ 已啟用'
    ELSE '❌ 未啟用（請在 Dashboard 中啟用）'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('schedule_items', 'line_configs');

-- 檢查 device_sessions 表是否創建
SELECT 
  table_name,
  '✅ 表已創建' as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'device_sessions';

-- 檢查函數是否創建
SELECT 
  routine_name,
  routine_type,
  '✅ 函數已創建' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('register_device_session', 'is_session_valid', 'cleanup_expired_sessions');
```

---

## 功能測試

### 測試 1：即時同步

1. **開啟兩個瀏覽器分頁**（或兩個不同設備）
2. **兩個分頁都登入**（可以使用同一個帳號或不同帳號）
3. **在分頁 A**：拖曳一個卡片到時間軸
4. **在分頁 B**：應該在 1-2 秒內看到卡片自動出現
5. **在分頁 B**：修改卡片的數量
6. **在分頁 A**：應該看到數量自動更新

**預期結果**：
- ✅ 變更會自動同步到所有分頁
- ✅ 控制台顯示「🔄 收到即時變更，更新本地狀態」

### 測試 2：跨分頁自動登出

1. **開啟兩個瀏覽器分頁**
2. **兩個分頁都登入**同一帳號
3. **在分頁 A**：點擊「登出」
4. **在分頁 B**：應該自動被重定向到登入頁

**預期結果**：
- ✅ 分頁 A 登出後，分頁 B 自動登出
- ✅ 分頁 B 被重定向到 `/login` 頁面
- ✅ 控制台顯示「🔄 認證狀態變化：已登出」

### 測試 3：單裝置登入限制

1. **在裝置 A**：登入帳號 `leo.chang@avient.com`
2. **在裝置 B**：登入同一個帳號 `leo.chang@avient.com`
3. **裝置 A**：應該自動登出，被重定向到登入頁

**預期結果**：
- ✅ 裝置 B 登入成功
- ✅ 裝置 A 的 session 被標記為無效
- ✅ 裝置 A 自動登出並重定向到登入頁
- ✅ 控制台顯示「⚠️ Session 無效（可能在其他裝置登入），強制登出」

---

## 故障排除

### 問題 1：即時同步不工作

**症狀**：分頁 A 的變更，分頁 B 看不到

**解決方法**：
1. 檢查 Supabase Dashboard > Database > Replication
   - 確認 `schedule_items` 和 `line_configs` 都已啟用 Realtime
2. 檢查瀏覽器控制台
   - 應該看到「✅ 已成功訂閱 schedule_items 即時變更」
   - 如果看到「❌ 訂閱頻道錯誤」，檢查網路連線
3. 檢查 Supabase 服務狀態
   - 確認 Supabase 服務正常運行

### 問題 2：跨分頁登出不工作

**症狀**：在分頁 A 登出，分頁 B 沒有自動登出

**解決方法**：
1. 檢查 `AuthContext.tsx` 中的 `onAuthStateChange` 是否正常運作
2. 檢查 Supabase Auth 設置
   - 確認 `scope: 'global'` 參數已設置
3. 檢查瀏覽器是否阻止了 localStorage 同步
   - 某些瀏覽器擴充功能可能會阻止 localStorage 同步

### 問題 3：單裝置登入限制不工作

**症狀**：在裝置 B 登入，裝置 A 沒有自動登出

**解決方法**：
1. 檢查 `device_sessions` 表是否已創建
   ```sql
   SELECT * FROM public.device_sessions;
   ```
2. 檢查 `register_device_session` 函數是否正常
   - 在 SQL Editor 中測試：
   ```sql
   SELECT register_device_session('test_token', 'test_device', NULL);
   ```
3. 檢查 `is_session_valid` 函數是否正常
   - 在 SQL Editor 中測試：
   ```sql
   SELECT is_session_valid('test_token');
   ```
4. 檢查 RLS 政策
   - 確認 `device_sessions` 表的 RLS 政策正確
5. 檢查瀏覽器控制台
   - 應該看到「✅ 已註冊新 session，舊 session 已自動登出」
   - 如果看到錯誤訊息，檢查函數權限

---

## 技術細節

### Realtime 同步流程

1. 用戶在分頁 A 拖曳卡片
2. `Swimlane.tsx` 調用 `setScheduleItems` 更新本地狀態
3. 狀態更新觸發 `saveScheduleItems` 保存到資料庫
4. 資料庫變更觸發 Supabase Realtime 事件
5. 分頁 B 的 `useRealtimeSchedule` hook 收到事件
6. Hook 重新載入資料並更新本地狀態
7. 分頁 B 的 UI 自動更新

### 跨分頁登出流程

1. 用戶在分頁 A 點擊「登出」
2. `signOut` 函數調用 `supabase.auth.signOut({ scope: 'global' })`
3. Supabase Auth 清除所有分頁的 session
4. 所有分頁的 `onAuthStateChange` 監聽器收到 `SIGNED_OUT` 事件
5. 所有分頁清除本地狀態並重定向到登入頁

### 單裝置登入流程

1. 用戶在裝置 B 登入
2. `signIn` 函數調用 `register_device_session` RPC 函數
3. RPC 函數刪除該用戶的舊 session（如果存在）
4. RPC 函數創建新 session 記錄
5. 裝置 A 的 `onAuthStateChange` 定期檢查 session 有效性
6. 如果 session 無效，裝置 A 自動登出

---

## 注意事項

1. **性能考量**：
   - Realtime 會增加資料庫負載
   - 建議限制監聽範圍（目前僅監聽 `schedule_items` 表）

2. **網路問題**：
   - 如果網路中斷，即時同步會停止
   - 重新連線後，需要重新訂閱（會自動處理）

3. **權限控制**：
   - 確保 RLS 政策正確，防止未授權訪問
   - `device_sessions` 表的 RLS 已設置為僅允許用戶查看自己的 session

4. **Session 過期**：
   - `device_sessions` 的 session 會過期（預設 30 天）
   - 定期執行 `cleanup_expired_sessions()` 清理過期 session（可設置 cron job）

---

## 相關文件

- [多用戶管理完整方案](./MULTI_USER_MANAGEMENT.md)
- [快速開始指南](./MULTI_USER_QUICK_START.md)
- [Supabase Realtime 文檔](https://supabase.com/docs/guides/realtime)
