# Google Sheets API Key 取得步驟

## 重要提醒

**如果您的 Google Sheet 是公開的（任何人都可以檢視），則不需要 API Key！**

建議先嘗試將 Sheet 設為公開，這樣最簡單。

## 如果需要 API Key（Sheet 不是公開的）

### 步驟 1：前往 Google Cloud Console

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 使用您的 Google 帳號登入

### 步驟 2：建立或選擇專案

1. 點擊頂部的專案選擇器
2. 點擊「新增專案」
3. 輸入專案名稱（例如：「QC-Scheduling-System」）
4. 點擊「建立」

### 步驟 3：啟用 Google Sheets API

1. 在左側選單中，點擊「API 和服務」>「程式庫」
2. 在搜尋框中輸入「Google Sheets API」
3. 點擊「Google Sheets API」
4. 點擊「啟用」按鈕

### 步驟 4：建立 API Key

1. 在左側選單中，點擊「API 和服務」>「憑證」
2. 點擊頂部的「建立憑證」
3. 選擇「API 金鑰」
4. 系統會顯示您的新 API Key（類似：`AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
5. **重要**：複製這個 API Key，稍後會用到

### 步驟 5：限制 API Key（建議，安全性更高）

為了安全起見，建議限制 API Key 的使用範圍：

1. 在「憑證」頁面中，點擊您剛建立的 API Key
2. 在「API 限制」區段中：
   - 選擇「限制金鑰」
   - 勾選「Google Sheets API」
3. 在「應用程式限制」區段中（可選）：
   - 可以設定 HTTP 參照網址限制
   - 例如：只允許從您的網域使用
4. 點擊「儲存」

### 步驟 6：設定到環境變數

在專案的 `.env.local` 檔案中新增：

```env
# Google Sheets 設定
NEXT_PUBLIC_GOOGLE_SHEET_ID=1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q

# Google API Key
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

將 `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 替換為您實際的 API Key。

### 步驟 7：重新啟動開發伺服器

```bash
npm run dev
```

## 快速檢查清單

- [ ] 已在 Google Cloud Console 建立專案
- [ ] 已啟用 Google Sheets API
- [ ] 已建立 API Key
- [ ] 已將 API Key 設定到 `.env.local`
- [ ] 已重新啟動開發伺服器

## 疑難排解

### API Key 無效

1. 確認 API Key 是否正確複製（沒有多餘的空格）
2. 確認 Google Sheets API 是否已啟用
3. 檢查 API Key 的限制設定

### 權限錯誤

1. 確認 API Key 有權限存取 Google Sheets API
2. 確認 Sheet 的權限設定（即使有 API Key，Sheet 也需要允許讀取）

### 仍然無法讀取

如果使用 API Key 仍有問題，建議：
1. 將 Google Sheet 設為公開（最簡單的方式）
2. 不需要 API Key 即可使用

## 參考資料

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets API 文件](https://developers.google.com/sheets/api)
- [API Key 最佳實踐](https://cloud.google.com/docs/authentication/api-keys)

