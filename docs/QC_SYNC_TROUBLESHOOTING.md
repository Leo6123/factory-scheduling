# QC 同步問題排除指南

## 檢查步驟

### 1. 確認環境變數設定

在 `.env.local` 檔案中確認是否有設定：

```env
NEXT_PUBLIC_GOOGLE_SHEET_ID=1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q
```

**重要**：環境變數名稱必須以 `NEXT_PUBLIC_` 開頭，才能在瀏覽器中讀取。

### 2. 確認 Google Sheet 權限

1. 在 Google Sheets 中點擊右上角的「共用」按鈕
2. 確認權限設為「知道連結的使用者」可以「檢視者」
3. 如果 Sheet 不是公開的，需要設定 API Key

### 3. 檢查瀏覽器 Console

開啟瀏覽器開發者工具（F12），查看 Console 是否有以下訊息：

#### 成功訊息
- `🔄 開始載入 QC 資料，Sheet ID: ...`
- `✅ 成功從工作表 "..." 讀取 X 筆 QC 資料`
- `✅ QC 資料載入成功，共 X 筆`
- `📊 QC 狀態資訊: ...`

#### 錯誤訊息
- `⚠️ Google Sheet ID 未設定` → 檢查 `.env.local` 檔案
- `❌ QC 資料載入失敗` → 檢查 Sheet 權限或網路連線
- `無法讀取 Google Sheets` → 確認 Sheet 是否公開

### 4. 檢查批號比對

在 Console 中應該會看到：
- `🟡 QC中: 批號 XXX 在開始產品批號中找到`
- `✅ QC完成: 批號 XXX 在結束產品批號中找到`

如果沒有看到這些訊息，可能是：
- 批號格式不匹配（大小寫、空格等）
- Google Sheets 中沒有對應的批號

### 5. 確認 Google Sheets 欄位

系統會讀取：
- **C 欄**：開始產品批號（例如：TWCC140525）
- **E 欄**：結束產品批號（例如：TWCC140525 或 TWCC140525(NG)）

請確認：
- C 欄和 E 欄包含批號資料
- 第一行是標題行（會被自動跳過）
- 批號格式為 10 碼，例如：TWCC123456

### 6. 測試批號比對

在 Console 中執行以下測試：

```javascript
// 檢查 QC 資料是否載入
console.log('QC 資料數量:', window.qcData?.length);

// 測試特定批號
const testBatch = 'TWCC140525';
const qcStatus = getBatchQCStatus(testBatch);
console.log(`批號 ${testBatch} 的 QC 狀態:`, qcStatus);
```

### 7. 手動重新載入 QC 資料

如果資料沒有更新，可以：
1. 重新整理頁面（F5）
2. 等待 5 分鐘讓系統自動更新
3. 檢查 Console 是否有重新載入的訊息

## 常見問題

### Q: 為什麼看不到 QC 狀態？

A: 可能的原因：
1. 環境變數未設定或設定錯誤
2. Google Sheet 不是公開的
3. 批號格式不匹配
4. Google Sheets 中沒有對應的批號

### Q: 如何確認環境變數是否正確讀取？

A: 在 Console 中查看：
- 應該看到 `📊 QC 狀態資訊: { sheetId: '已設定', ... }`
- 如果看到 `sheetId: '未設定'`，表示環境變數未正確讀取

### Q: 批號格式需要完全一致嗎？

A: 不需要，系統會：
- 自動處理大小寫差異（TWCC 和 twcc 視為相同）
- 自動移除空格
- 自動處理 (NG) 標記

### Q: 如何確認 Google Sheet 是否公開？

A: 在無痕模式或登出 Google 帳號後，嘗試開啟 Sheet 連結。如果可以看到內容，表示是公開的。

## 需要協助？

如果以上步驟都無法解決問題，請提供：
1. 瀏覽器 Console 的完整錯誤訊息
2. `.env.local` 檔案內容（隱藏 API Key）
3. Google Sheet 的權限設定截圖

