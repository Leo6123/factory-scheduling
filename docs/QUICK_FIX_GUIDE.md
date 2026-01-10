# 快速修復指南

## 問題 1：兩個分頁不同步

### 已修復的內容
- ✅ 修復了 `useRealtimeSchedule` hook 中的 `isSubscribed` 狀態問題
- ✅ 添加了循環保存保護機制
- ✅ 改進了錯誤提示和調試訊息

### 需要執行的步驟

**步驟 1：啟用 Supabase Realtime（必須）**

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 左側選單：**Database** > **Replication**
4. 找到 `schedule_items` 表
5. 點擊 **Enable Realtime** 按鈕（如果尚未啟用）

**步驟 2：驗證 Realtime 是否啟用**

打開瀏覽器控制台（F12），應該看到：
- ✅ `✅ 已成功訂閱 schedule_items 即時變更`
- ✅ `✅ 即時同步已啟用，多分頁變更會自動同步（約 1-2 秒延遲）`

如果看到：
- ⚠️ `⚠️ 即時同步未啟用`
- ⚠️ `❌ 訂閱頻道錯誤`

請檢查：
1. Supabase Dashboard 中是否已啟用 Realtime
2. 網路連線是否正常
3. 重新整理頁面後再試

**步驟 3：測試同步功能**

1. 開啟兩個瀏覽器分頁
2. 兩個分頁都登入
3. 在分頁 A：拖曳一個卡片到時間軸
4. 在分頁 B：應該在 1-2 秒內看到卡片自動出現

---

## 問題 2：帳號應該是管理員不是操作員

### 已創建的 SQL 腳本
- ✅ `supabase_set_admin_now.sql` - 快速設置管理員角色

### 執行步驟

**步驟 1：執行 SQL 腳本**

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 左側選單：**SQL Editor**
4. 點擊 **New query**
5. 複製 `supabase_set_admin_now.sql` 的內容
6. 貼上到 SQL Editor
7. 點擊 **Run**（或按 `Ctrl+Enter`）

**步驟 2：驗證結果**

執行後，應該看到驗證查詢結果：
```
user_id  | email                  | role  | status
---------|------------------------|-------|------------------
[UUID]   | leo.chang@avient.com   | admin | ✅ 已設為管理員
```

**步驟 3：重新登入應用程式**

1. 在應用程式中點擊「登出」
2. 重新登入 `leo.chang@avient.com`
3. 右上角應該顯示「管理員」而不是「操作員」

**注意**：如果角色仍然顯示為「操作員」：
- 確認 SQL 腳本已成功執行（檢查 status 是否為「✅ 已設為管理員」）
- 清除瀏覽器緩存（Ctrl+Shift+Del）並重新登入
- 等待 5-10 秒，讓 AuthContext 重新獲取角色

---

## 常見問題

### Q1：Realtime 同步仍然不工作

**可能原因**：
1. Supabase Realtime 未啟用
2. 網路問題
3. RLS 政策阻止了 Realtime 事件

**解決方法**：
1. 檢查 Supabase Dashboard > Database > Replication 中 `schedule_items` 是否顯示為「Enabled」
2. 檢查瀏覽器控制台的錯誤訊息
3. 確認 RLS 政策允許讀取 `schedule_items` 表

### Q2：角色仍然是「操作員」

**可能原因**：
1. SQL 腳本未執行或執行失敗
2. 用戶 ID 不匹配
3. 緩存問題

**解決方法**：
1. 重新執行 SQL 腳本，確認沒有錯誤
2. 檢查 `auth.users` 表中的 email 是否正確
3. 清除瀏覽器緩存並重新登入
4. 如果問題持續，檢查 `user_profiles` 表：
   ```sql
   SELECT * FROM public.user_profiles WHERE email = 'leo.chang@avient.com';
   ```

---

## 技術細節

### Realtime 同步機制

1. **用戶操作** → 更新本地狀態 → 保存到資料庫
2. **資料庫變更** → Supabase Realtime 事件 → 其他分頁收到通知
3. **其他分頁** → 重新載入資料 → 更新本地狀態 → UI 自動更新

### 循環保存保護

- 使用 `isApplyingRealtimeChangeRef` 追蹤是否正在應用 Realtime 變更
- 當 Realtime 變更時，直接更新 `localItems`，不觸發保存
- 當用戶操作時，使用 `setScheduleItems` 觸發保存

---

## 相關文件

- [Realtime + 單裝置登入完整設置](./REALTIME_SINGLE_DEVICE_SETUP.md)
- [多用戶管理方案](./MULTI_USER_MANAGEMENT.md)
