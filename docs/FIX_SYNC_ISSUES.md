# 修復不同瀏覽器顯示不同、無法同步、身份不同的問題

## 已修復的問題

### 1. ✅ 不同瀏覽器顯示不同資料
**原因**：
- `loadScheduleItemsFromDB` 失敗時回退到 `localStorage`
- 每個瀏覽器有獨立的 `localStorage`，導致顯示不同資料
- 初始化時使用 `mockScheduleItems`（模擬資料）而不是資料庫

**修復**：
- ✅ 移除 `localStorage` 回退邏輯，優先從資料庫載入
- ✅ 初始化時傳入空陣列，強制從資料庫載入
- ✅ 添加「重新載入資料」按鈕，清除緩存並從資料庫重新載入

### 2. ✅ 無法同步（Realtime 不工作）
**原因**：
- Realtime 可能沒有啟用
- `useRealtimeSchedule` hook 的 `isSubscribed` 狀態問題
- 循環保存保護機制不夠完善

**修復**：
- ✅ 修復 `isSubscribed` 狀態管理（改用 `useState`）
- ✅ 改進循環保存保護機制
- ✅ 添加詳細的錯誤提示和調試訊息

### 3. ✅ 身份顯示不同（管理員 vs 操作員）
**原因**：
- `getUserRole` 超時（5 秒）後使用默認角色 `operator`
- 角色查詢失敗時使用默認角色，沒有重新嘗試
- 沒有清除緩存機制

**修復**：
- ✅ 改進 `getUserRole` 邏輯，使用 `maybeSingle()` 避免錯誤
- ✅ 縮短超時時間（3 秒），加快響應
- ✅ 添加詳細的調試訊息
- ✅ 強制重新獲取角色（不使用緩存）

---

## 需要執行的步驟

### 步驟 1：確認 Realtime 已啟用

在 Supabase SQL Editor 執行：

```sql
-- 檢查 Realtime 狀態
SELECT 
  tablename as 表名,
  '✅ Realtime 已啟用' as 狀態
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('schedule_items', 'line_configs');
```

**如果沒有返回結果**：執行 `supabase_enable_realtime_safe.sql` 啟用 Realtime

### 步驟 2：設置管理員角色

在 Supabase SQL Editor 執行：

```sql
-- 執行 supabase_set_admin_now.sql
-- 或直接執行：
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'leo.chang@avient.com';
```

### 步驟 3：清除瀏覽器緩存

**方法 A：使用「重新載入資料」按鈕（推薦）**
1. 在應用程式中找到「重新載入資料」按鈕（在左側側邊欄）
2. 點擊按鈕
3. 系統會自動清除 `localStorage` 並從資料庫重新載入

**方法 B：手動清除**
1. 打開瀏覽器開發者工具（F12）
2. 前往 **Application** > **Local Storage** > `factory-scheduling.vercel.app`
3. 刪除以下項目：
   - `factory_schedule_items`
   - `factory_schedule_snapshot`
4. 重新整理頁面（`Ctrl+Shift+R`）

### 步驟 4：測試同步功能

1. **開啟兩個瀏覽器分頁**（或兩個不同瀏覽器）
2. **兩個分頁都登入**同一帳號
3. **檢查身份**：兩個分頁都應該顯示「管理員」
4. **在分頁 A**：拖曳一個卡片到時間軸
5. **在分頁 B**：應該在 1-2 秒內看到卡片自動出現
6. **檢查控制台**（F12）：
   - 應該看到「✅ 已成功訂閱 schedule_items 即時變更」
   - 應該看到「🔄 [Realtime] 收到即時變更」

---

## 故障排除

### 問題 1：仍然顯示不同資料

**解決方法**：
1. 點擊「重新載入資料」按鈕
2. 或手動清除 `localStorage`（見步驟 3）
3. 確認兩個瀏覽器都從資料庫載入（檢查控制台是否顯示「✅ 從資料庫載入成功」）

### 問題 2：Realtime 仍然不工作

**檢查項目**：
1. 確認 Realtime 已啟用（執行步驟 1 的 SQL）
2. 檢查瀏覽器控制台是否有錯誤訊息
3. 確認網路連線正常
4. 檢查 Supabase 服務狀態

**如果仍然不工作**：
- 執行 `supabase_enable_realtime_direct.sql` 強制啟用
- 或使用 SQL Editor 手動執行：
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_items;
  ```

### 問題 3：身份仍然是「操作員」

**解決方法**：
1. 確認 SQL 已執行（執行步驟 2）
2. 檢查 `user_profiles` 表：
   ```sql
   SELECT * FROM public.user_profiles WHERE email = 'leo.chang@avient.com';
   ```
3. 清除瀏覽器緩存（步驟 3）
4. 登出並重新登入
5. 如果問題持續，檢查控制台是否有角色獲取錯誤

---

## 技術細節

### 資料載入流程（修復後）

1. **應用啟動** → 傳入空陣列 `initialItems`
2. **useScheduleData** → 從資料庫載入（不使用 localStorage）
3. **資料庫載入成功** → 更新 `dbItems` → 同步到 `localItems`
4. **Realtime 監聽** → 收到變更 → 更新 `localItems` → 同步到 localStorage（僅作為備用）

### 身份獲取流程（修復後）

1. **登入/重新整理** → 檢查 Supabase session
2. **獲取用戶角色** → 從 `user_profiles` 表查詢（3 秒超時）
3. **如果超時或失敗** → 使用默認角色 `operator`
4. **更新用戶狀態** → 顯示角色（管理員/操作員/訪客）

---

## 相關文件

- [Realtime 啟用指南](./HOW_TO_ENABLE_REALTIME.md)
- [快速修復指南](./QUICK_FIX_GUIDE.md)
- [Realtime + 單裝置登入設置](./REALTIME_SINGLE_DEVICE_SETUP.md)
