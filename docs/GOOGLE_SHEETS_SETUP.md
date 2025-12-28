# Google Sheets QC 狀態連動設定

## 功能說明

系統會自動從 Google Sheets 讀取 QC 資料，並在卡片和時間軸上顯示 QC 狀態：

- **QC中**：當 Google Sheets 的「開始產品批號」欄位中有與卡片批號相同的批號時顯示
- **QC完成**：當 Google Sheets 的「結束產品批號」欄位中有與卡片批號相同的批號時顯示

## 設定步驟

### 1. 取得 Google Sheet ID

從 Google Sheets URL 中取得 Spreadsheet ID：

```
https://docs.google.com/spreadsheets/d/1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALIcqQzR9Is_Q/edit
                                                      ↑ 這就是 Spreadsheet ID
```

### 2. 設定環境變數

在 `.env.local` 檔案中新增以下設定：

```env
# Google Sheets 設定
# 從 Google Sheets URL 中取得 Spreadsheet ID
# 例如：https://docs.google.com/spreadsheets/d/1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q/edit
# Spreadsheet ID 就是：1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q
NEXT_PUBLIC_GOOGLE_SHEET_ID=1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q

# Google API Key（可選，如果 Sheet 是公開的則不需要）
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
```

### 3. 設定 Google Sheet 權限

#### 選項 A：設為公開（推薦，簡單）

1. 在 Google Sheets 中點擊右上角的「共用」按鈕
2. 將權限設為「知道連結的使用者」可以「檢視者」
3. 複製連結並取得 Spreadsheet ID
4. 不需要設定 API Key

#### 選項 B：使用 API Key（如果 Sheet 不是公開的）

**詳細步驟請參考：`docs/GOOGLE_API_KEY_SETUP.md`**

快速步驟：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用「Google Sheets API」
4. 建立 API Key（憑證 > 建立憑證 > API 金鑰）
5. 將 API Key 設定到 `.env.local` 中

**注意**：如果 Sheet 是公開的，不需要 API Key！

### 4. 確認 Sheet 名稱和欄位

系統會自動嘗試讀取以下工作表名稱（依序嘗試）：
- 「QC完整表單」
- 「Sheet1」
- 「工作表1」

系統會讀取以下欄位：
- **C 欄**：開始產品批號
- **E 欄**：結束產品批號（可能包含 (NG) 標記，系統會自動處理）

請確認：
- C 欄和 E 欄包含批號資料
- 第一行是標題行（會被自動跳過）
- 批號格式為 10 碼，例如：TWCC123456

**注意**：系統會自動處理大小寫差異和 (NG) 標記，比對時不區分大小寫。

### 5. 重新啟動開發伺服器

設定完成後，重新啟動開發伺服器：

```bash
npm run dev
```

## 顯示效果

### 卡片視圖

- **QC中**：顯示黃色「QC中」標籤
- **QC完成**：顯示綠色「QC完成」標籤

### 24h 時間軸視圖

- **QC中**：顯示 🟡 圖示（右上角）
- **QC完成**：顯示 ✅ 圖示（右上角）

## 資料更新頻率

- 系統會每 5 分鐘自動重新載入 QC 資料
- 也可以手動重新整理頁面來更新資料

## 疑難排解

### 無法讀取 Google Sheets

1. 確認 Spreadsheet ID 是否正確
2. 確認 Sheet 權限是否設為公開（如果沒有使用 API Key）
3. 確認工作表名稱是否為「QC完整表單」
4. 檢查瀏覽器 Console 是否有錯誤訊息

### QC 狀態沒有顯示

1. 確認批號格式是否完全一致（包含大小寫、空格等）
2. 確認 Google Sheets 中是否有對應的批號
3. 等待 5 分鐘讓系統自動更新，或重新整理頁面

