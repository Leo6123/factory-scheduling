# 多用戶/多分頁管理方案

## 目前狀況

### ✅ 已實現
- **獨立 Session**：每個瀏覽器分頁/設備都有獨立的 Supabase Auth session
- **本地儲存**：每個客戶端使用 localStorage 作為備用
- **資料庫儲存**：使用 Supabase 作為主要儲存

### ⚠️ 目前問題
1. **沒有即時同步**：多個用戶/分頁的變更不會即時同步
2. **沒有衝突檢測**：最後保存的會覆蓋之前的變更
3. **沒有活動用戶顯示**：無法知道誰在線或正在編輯
4. **沒有編輯鎖定**：多個用戶可能同時編輯同一項目

---

## 解決方案

### 方案 1：基本即時同步（推薦 MVP）

#### 功能
- ✅ 使用 Supabase Realtime 即時同步變更
- ✅ 顯示當前在線用戶
- ✅ 基本衝突檢測（最後寫入獲勝）

#### 實作步驟

**1. 啟用 Supabase Realtime**
```sql
-- 在 Supabase Dashboard > Database > Replication 中啟用
-- schedule_items 表的 Realtime
-- line_configs 表的 Realtime
```

**2. 添加活動用戶追蹤**
- 在 `user_profiles` 表添加 `last_active_at` 欄位
- 定期更新用戶活動時間
- 顯示最近 5 分鐘內活躍的用戶

**3. 實現即時同步 Hook**
- 創建 `useRealtimeSchedule` hook
- 監聽 `schedule_items` 表的 INSERT/UPDATE/DELETE 事件
- 自動更新本地狀態

**4. 衝突處理**
- 使用 `updated_at` 時間戳
- 保存時檢查 `updated_at`，如果資料庫版本更新，提示用戶

---

### 方案 2：完整協作功能（進階）

#### 功能
- ✅ 即時同步
- ✅ 編輯鎖定（防止同時編輯）
- ✅ 衝突解決對話框
- ✅ 變更歷史記錄
- ✅ 協作提示（顯示誰在編輯什麼）

#### 實作步驟

**1. 編輯鎖定表**
```sql
CREATE TABLE editing_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id UUID REFERENCES schedule_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
  UNIQUE(schedule_item_id)
);
```

**2. 變更歷史表**
```sql
CREATE TABLE schedule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id UUID REFERENCES schedule_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**3. 衝突解決**
- 使用 Optimistic Locking（樂觀鎖定）
- 保存時檢查 `version` 欄位
- 如果版本不匹配，顯示衝突解決對話框

---

## 推薦實作順序

### 階段 1：基本即時同步（1-2 天）
1. 啟用 Supabase Realtime
2. 實現 `useRealtimeSchedule` hook
3. 添加活動用戶顯示
4. 基本衝突提示

### 階段 2：編輯鎖定（2-3 天）
1. 創建 `editing_locks` 表
2. 實現編輯鎖定邏輯
3. 顯示「正在編輯」提示
4. 自動釋放過期鎖定

### 階段 3：完整協作（3-5 天）
1. 變更歷史記錄
2. 衝突解決對話框
3. 協作提示優化
4. 性能優化

---

## Session 管理說明

### 多分頁行為
- **每個分頁獨立**：每個瀏覽器分頁都有獨立的 Supabase session
- **登出影響**：在一個分頁登出，其他分頁的 session 會失效（需要重新登入）
- **權限同步**：角色變更後，需要重新登入才會生效

### 多設備行為
- **獨立 Session**：每個設備/瀏覽器都有獨立的 session
- **同時在線**：同一用戶可以在多個設備同時登入
- **資料同步**：通過 Supabase Realtime 同步（實作後）

---

## 快速開始（方案 1）

### 1. 啟用 Realtime
在 Supabase Dashboard：
- Database > Replication
- 啟用 `schedule_items` 的 Realtime
- 啟用 `line_configs` 的 Realtime

### 2. 添加活動追蹤
執行 SQL：
```sql
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 創建更新函數
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. 實作即時同步
創建 `src/hooks/useRealtimeSchedule.ts`（見實作文件）

---

## 注意事項

1. **性能考量**：Realtime 會增加資料庫負載，建議限制監聽範圍
2. **網路問題**：需要處理網路中斷和重連
3. **權限控制**：確保 RLS 政策正確，防止未授權訪問
4. **測試**：在多個分頁/設備測試同步功能

---

## 相關文件
- [Supabase Realtime 文檔](https://supabase.com/docs/guides/realtime)
- [衝突解決策略](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
