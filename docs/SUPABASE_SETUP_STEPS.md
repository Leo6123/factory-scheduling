# Supabase 連接設定步驟

## 📋 步驟 1：取得 Supabase API 憑證

### 1.1 進入專案設定

1. 在 Supabase Dashboard 中，點擊左側選單的 **Settings**（設定）
2. 點擊 **API**

### 1.2 複製 API 憑證

您會看到以下資訊：

- **Project URL**（專案 URL）
  - 格式類似：`https://xxxxxxxxxxxxx.supabase.co`
  - 複製這個 URL

- **anon public** key（匿名公開金鑰）
  - 這是一個很長的字串
  - 複製這個 key

## 📋 步驟 2：建立資料庫表格

### 2.1 開啟 SQL Editor

1. 在 Supabase Dashboard 中，點擊左側選單的 **SQL Editor**
2. 點擊 **New Query**（新查詢）

### 2.2 執行 Schema SQL

1. 開啟專案中的 `supabase/schema.sql` 檔案
2. **複製整個檔案內容**
3. 貼上到 Supabase SQL Editor
4. 點擊 **Run**（執行）按鈕（或按 `Ctrl + Enter`）

### 2.3 確認表格已建立

執行完成後，您應該會看到成功訊息。可以：

1. 點擊左側選單的 **Table Editor**
2. 確認看到兩個表格：
   - `schedule_items`
   - `line_configs`

## 📋 步驟 3：設定環境變數

### 3.1 建立 .env.local 檔案

在專案根目錄（`D:\Cursor_scheduling`）建立 `.env.local` 檔案

### 3.2 填入 Supabase 憑證

在 `.env.local` 檔案中填入以下內容：

```env
NEXT_PUBLIC_SUPABASE_URL=您的_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=您的_anon_public_key
```

**範例：**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.3 重要注意事項

- ✅ `.env.local` 檔案已經在 `.gitignore` 中，不會被上傳到 Git
- ✅ 不要將 `.env.local` 檔案分享給他人
- ✅ 生產環境部署時，需要在部署平台（如 Vercel）設定環境變數

## 📋 步驟 4：重新啟動開發伺服器

### 4.1 停止目前的伺服器

如果開發伺服器正在運行，按 `Ctrl + C` 停止

### 4.2 重新啟動

```bash
npm run dev
```

## 📋 步驟 5：測試連接

### 5.1 匯入 Excel 測試

1. 在應用程式中點擊「匯入訂單 (Excel)」
2. 選擇一個 Excel 檔案
3. 匯入完成後，應該會看到「資料已自動儲存到資料庫」的訊息

### 5.2 在 Supabase 中查看資料

1. 回到 Supabase Dashboard
2. 點擊 **Table Editor**
3. 選擇 `schedule_items` 表格
4. 您應該能看到剛才匯入的資料！

## 🔍 疑難排解

### 問題 1：匯入後在 Supabase 看不到資料

**檢查項目：**
1. 確認 `.env.local` 檔案中的 URL 和 Key 是否正確
2. 確認沒有多餘的空格或引號
3. 檢查瀏覽器 Console（F12）是否有錯誤訊息
4. 確認已重新啟動開發伺服器

### 問題 2：出現 "Supabase 環境變數未設定" 警告

**解決方法：**
1. 確認 `.env.local` 檔案在專案根目錄
2. 確認檔案名稱正確（`.env.local`，不是 `.env.local.txt`）
3. 確認環境變數名稱正確（`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
4. 重新啟動開發伺服器

### 問題 3：SQL 執行失敗

**可能原因：**
1. 表格已存在：如果表格已經建立，會顯示錯誤，這是正常的
2. 權限問題：確認您有專案的管理權限
3. SQL 語法錯誤：確認複製了完整的 `schema.sql` 內容

**解決方法：**
- 如果表格已存在，可以跳過建立表格的步驟
- 或使用 `DROP TABLE IF EXISTS` 先刪除再建立

### 問題 4：資料儲存失敗

**檢查項目：**
1. 開啟瀏覽器開發者工具（F12）
2. 查看 Console 標籤的錯誤訊息
3. 查看 Network 標籤，確認是否有 API 請求失敗
4. 確認 Supabase 專案狀態正常（未暫停）

## 📝 快速檢查清單

- [ ] 已取得 Supabase Project URL
- [ ] 已取得 Supabase anon public key
- [ ] 已在 SQL Editor 執行 `schema.sql`
- [ ] 已確認表格 `schedule_items` 和 `line_configs` 存在
- [ ] 已建立 `.env.local` 檔案
- [ ] 已填入正確的環境變數
- [ ] 已重新啟動開發伺服器
- [ ] 已測試匯入 Excel 並在 Supabase 中看到資料

## 🎉 完成！

設定完成後，所有 Excel 匯入的資料都會自動儲存到您的 Supabase 資料庫中！

