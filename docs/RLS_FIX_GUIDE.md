# RLS 無限遞迴問題修復指南

## 問題說明

您遇到的問題是 **Supabase RLS (Row Level Security) 政策的無限遞迴**。

### 為什麼會發生？

1. **RLS 政策設計問題**：`user_profiles` 表的 SELECT 政策在檢查權限時，又查詢了 `user_profiles` 表
2. **遞迴查詢**：查詢 `user_profiles` → 觸發 RLS 政策 → 政策又查詢 `user_profiles` → 再次觸發 RLS → 無限循環
3. **錯誤代碼**：`42P17` - `infinite recursion detected in policy for relation "user_profiles"`

### 為什麼這麼困難？

這是一個 **架構設計問題**，不是簡單的 bug：
- RLS 政策在資料庫層面執行，錯誤難以追蹤
- 需要理解 Supabase 的 RLS 機制
- 需要修改 SQL 政策，而不是應用程式代碼
- 錯誤訊息不夠清楚，難以診斷

---

## 解決方案（選擇其中一個）

### 方案 1：簡化 RLS 政策（推薦，最簡單）

**適合**：MVP、開發環境、需要快速解決問題

**執行步驟**：
1. 進入 Supabase Dashboard > SQL Editor
2. 複製 `supabase_fix_rls_simple.sql` 的全部內容
3. 貼上並執行（Run）

**優點**：
- ✅ 簡單快速
- ✅ 立即解決問題
- ✅ 不影響應用程式功能

**缺點**：
- ⚠️ 權限控制現在由應用程式層面處理
- ⚠️ 所有已登入用戶都可以操作資料（但應用程式仍會檢查權限）

---

### 方案 2：使用 SECURITY DEFINER 函數（進階）

**適合**：需要嚴格權限控制的生產環境

**執行步驟**：
1. 進入 Supabase Dashboard > SQL Editor
2. 複製 `supabase_fix_rls_recursion.sql` 的全部內容
3. 貼上並執行（Run）

**優點**：
- ✅ 保持權限控制
- ✅ 避免遞迴問題

**缺點**：
- ⚠️ 稍微複雜
- ⚠️ 需要理解 SECURITY DEFINER 機制

---

### 方案 3：暫時禁用 RLS（最簡單但不安全）

**適合**：僅用於測試，不建議用於生產環境

**執行步驟**：
在 Supabase SQL Editor 執行：

```sql
-- 暫時禁用所有表的 RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_schedules DISABLE ROW LEVEL SECURITY;
```

**優點**：
- ✅ 最簡單，立即解決問題

**缺點**：
- ❌ 不安全，任何人都可以訪問資料
- ❌ 不建議用於生產環境

---

## 推薦方案：方案 1（簡化 RLS 政策）

**為什麼推薦方案 1？**

1. **簡單有效**：只需執行一個 SQL 腳本
2. **不影響功能**：應用程式的權限控制（AuthContext）仍會正常運作
3. **適合 MVP**：對於 MVP 階段，這樣已經足夠
4. **易於理解**：政策簡單明瞭，不會造成混淆

**執行後的效果**：
- ✅ 不再有 RLS 遞迴錯誤
- ✅ 匯入建議排程可以正常運作
- ✅ 存檔功能可以正常運作
- ✅ 應用程式的權限控制（按鈕顯示/隱藏）仍會正常運作

---

## 執行步驟（方案 1）

### 步驟 1：進入 Supabase Dashboard

1. 訪問 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 點擊左側的 **SQL Editor**

### 步驟 2：執行 SQL 腳本

1. 點擊 **New Query** 按鈕
2. 複製 `supabase_fix_rls_simple.sql` 的**全部內容**
3. 貼上到 SQL Editor
4. 點擊 **Run**（或按 `Ctrl+Enter`）

### 步驟 3：驗證執行結果

執行後應該看到：
- ✅ "Success. No rows returned" 或類似訊息
- ✅ 查詢結果顯示所有政策都已建立

### 步驟 4：測試應用程式

1. 重新整理應用程式頁面（`Ctrl+Shift+R`）
2. 嘗試匯入建議排程
3. 檢查控制台是否還有 `42P17` 錯誤
4. 確認匯入是否能在 30 秒內完成

---

## 如果還有問題

### 檢查項目：

1. **SQL 腳本是否執行成功？**
   - 在 Supabase Dashboard > SQL Editor > History 中檢查
   - 確認沒有錯誤訊息

2. **政策是否正確建立？**
   - 在 SQL Editor 執行：
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('user_profiles', 'suggested_schedules');
   ```
   - 應該看到政策列表

3. **應用程式是否重新載入？**
   - 按 `Ctrl+Shift+R` 強制重新載入
   - 清除瀏覽器快取

4. **控制台是否還有錯誤？**
   - 打開 F12 > Console
   - 查看是否還有 `42P17` 錯誤

---

## 為什麼這步驟這麼困難？

### 技術原因：

1. **RLS 是資料庫層面的機制**：
   - 錯誤發生在資料庫，不是應用程式
   - 難以追蹤和調試
   - 需要 SQL 知識

2. **政策設計的複雜性**：
   - RLS 政策可以查詢其他表
   - 但如果查詢的表也有 RLS，就會造成遞迴
   - 這是 Supabase/PostgreSQL 的架構限制

3. **錯誤訊息不夠清楚**：
   - `42P17` 錯誤碼不夠直觀
   - 需要知道是 RLS 政策問題
   - 需要找到是哪個政策造成遞迴

### 解決難度的原因：

1. **需要修改資料庫結構**（不只是應用程式代碼）
2. **需要理解 Supabase RLS 機制**
3. **需要執行 SQL 腳本**（對不熟悉 SQL 的開發者來說比較困難）
4. **錯誤可能不明顯**（直到實際使用時才發現）

---

## 未來改進建議

1. **在開發階段就設定好 RLS**：避免上線後才發現問題
2. **使用更簡單的 RLS 政策**：避免複雜的查詢邏輯
3. **在應用程式層面處理權限**：減少對 RLS 的依賴
4. **定期測試 RLS 政策**：確保不會造成遞迴

---

## 需要協助？

如果執行 SQL 腳本後仍有問題，請提供：
1. SQL 腳本的執行結果（截圖或錯誤訊息）
2. 控制台的錯誤訊息（F12 > Console）
3. Supabase Dashboard > Logs 中的錯誤日誌
