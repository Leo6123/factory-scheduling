# Google Sheets QC 連動快速設定

## 使用您的 Google Sheet 連結

根據您提供的連結：
```
https://docs.google.com/spreadsheets/d/1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q/edit?usp=sharing
```

## 快速設定步驟

### 1. 取得 Spreadsheet ID

從您的連結中，Spreadsheet ID 是：
```
1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q
```

### 2. 設定環境變數

在專案根目錄的 `.env.local` 檔案中新增：

```env
# Google Sheets 設定
NEXT_PUBLIC_GOOGLE_SHEET_ID=1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q
```

**注意**：如果您的 Sheet 是公開的（知道連結的人可以檢視），則不需要 API Key！

### 3. 確認 Sheet 權限

1. 在 Google Sheets 中點擊右上角的「共用」按鈕
2. 確認權限設為「知道連結的使用者」可以「檢視者」
3. 如果已經是公開的，就可以直接使用

### 4. 重新啟動開發伺服器

```bash
npm run dev
```

## 系統會自動讀取

- **C 欄**：開始產品批號（例如：TWCC345678）
- **E 欄**：結束產品批號（例如：TWCC456456 或 TWCC123456(NG)）

系統會自動：
- 處理大小寫差異（TWCC 和 twcc 視為相同）
- 移除 (NG) 標記
- 比對批號並顯示 QC 狀態

## 顯示效果

- **QC中**：當批號出現在 C 欄時顯示
- **QC完成**：當批號出現在 E 欄時顯示（優先於 QC中）

## 測試

設定完成後，重新整理瀏覽器，系統會自動連動 Google Sheets 並顯示 QC 狀態。

