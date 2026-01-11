# Google API Key 遷移指南

## ✅ 已完成的工作

### 1. 創建 Next.js API Route
- ✅ 創建 `src/app/api/google-sheets/route.ts`
- ✅ API Key 現在在伺服器端，不再暴露在客戶端

### 2. 更新客戶端代碼
- ✅ 更新 `src/utils/googleSheets.ts` - 使用 API Route
- ✅ 更新 `src/components/Swimlane.tsx` - 移除 API Key 參數
- ✅ 更新 `src/components/BatchSearch.tsx` - 移除 API Key 參數
- ✅ 更新 `src/hooks/useQCStatus.ts` - 移除 API Key 依賴

### 3. 構建測試
- ✅ 構建成功，沒有錯誤

---

## 📋 需要您完成的步驟

### 步驟 1：更新環境變數

#### 在 `.env.local` 中：

**移除**：
```env
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
```

**添加**（注意：不使用 `NEXT_PUBLIC_` 前綴）：
```env
GOOGLE_API_KEY=your_api_key_here
```

**保留**（如果需要）：
```env
NEXT_PUBLIC_GOOGLE_SHEET_ID=your_sheet_id_here
```

#### 在 Vercel 環境變數中：

1. 登入 Vercel Dashboard
2. 進入您的專案 → Settings → Environment Variables
3. **移除** `NEXT_PUBLIC_GOOGLE_API_KEY`（如果存在）
4. **添加** `GOOGLE_API_KEY`（使用相同的 API Key 值）
   - 注意：**不要**使用 `NEXT_PUBLIC_` 前綴

### 步驟 2：重新啟動開發伺服器

更新 `.env.local` 後，需要重新啟動開發伺服器：

```bash
# 停止當前運行的伺服器（Ctrl + C）
# 然後重新啟動
npm run dev
```

### 步驟 3：測試功能

1. 打開應用程式
2. 測試 QC 狀態顯示是否正常
3. 檢查瀏覽器 Console，確認沒有錯誤
4. 檢查瀏覽器 Network 標籤：
   - 確認請求都經過 `/api/google-sheets`
   - 確認不再有直接的 Google Sheets API 請求
   - 確認請求中不包含 API Key

### 步驟 4：部署到 Vercel

1. 提交代碼到 Git
2. 推送到 GitHub（會自動觸發 Vercel 部署）
3. 確認 Vercel 環境變數已更新（步驟 1）
4. 等待部署完成
5. 測試生產環境功能是否正常

---

## 🔒 安全改進對照

### 修改前（不安全）

```
客戶端代碼
  ↓
直接調用 Google Sheets API
  ↓
API Key 暴露在客戶端（NEXT_PUBLIC_GOOGLE_API_KEY）
  ↓
任何人都可以獲取並濫用
```

### 修改後（安全）

```
客戶端代碼
  ↓
調用 Next.js API Route (/api/google-sheets)
  ↓
API Route（伺服器端）
  ↓
從環境變數獲取 API Key (GOOGLE_API_KEY)
  ↓
調用 Google Sheets API
  ↓
返回資料給客戶端（不包含 API Key）
```

---

## ✅ 檢查清單

### 本地開發
- [ ] 更新 `.env.local`（移除 `NEXT_PUBLIC_GOOGLE_API_KEY`，添加 `GOOGLE_API_KEY`）
- [ ] 重新啟動開發伺服器
- [ ] 測試 QC 狀態顯示是否正常
- [ ] 檢查瀏覽器 Console，確認沒有錯誤
- [ ] 檢查瀏覽器 Network 標籤，確認請求經過 API Route

### Vercel 部署
- [ ] 在 Vercel Dashboard 中移除 `NEXT_PUBLIC_GOOGLE_API_KEY`
- [ ] 在 Vercel Dashboard 中添加 `GOOGLE_API_KEY`
- [ ] 提交代碼到 Git
- [ ] 推送到 GitHub
- [ ] 等待 Vercel 部署完成
- [ ] 測試生產環境功能是否正常

---

## 🔍 驗證方法

### 1. 檢查客戶端代碼中沒有 API Key

在瀏覽器開發工具中：

1. 打開 Console 標籤
2. 輸入：
   ```javascript
   console.log(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);
   ```
3. **預期結果**：`undefined`（不應該有任何值）

### 2. 檢查 Network 請求

在瀏覽器開發工具中：

1. 打開 Network 標籤
2. 過濾器：輸入 `google-sheets`
3. 點擊請求，查看 Request URL
4. **預期結果**：URL 應該是 `/api/google-sheets?spreadsheetId=...`（不包含 API Key）

### 3. 檢查伺服器端日誌

在開發伺服器中查看控制台輸出：

- 應該看到 `🔄 [API] 從 Google Sheets 讀取資料` 的日誌
- 不應該看到任何 API Key 相關的錯誤

---

## ⚠️ 常見問題

### Q1: 更新環境變數後，功能不工作

**A**: 
1. 確認已重新啟動開發伺服器
2. 確認環境變數名稱正確（`GOOGLE_API_KEY`，不是 `NEXT_PUBLIC_GOOGLE_API_KEY`）
3. 確認 API Key 值正確（沒有多餘的空格或引號）
4. 檢查瀏覽器 Console 是否有錯誤訊息

### Q2: 在 Vercel 部署後功能不工作

**A**:
1. 確認已在 Vercel Dashboard 中添加 `GOOGLE_API_KEY` 環境變數
2. 確認已移除 `NEXT_PUBLIC_GOOGLE_API_KEY`（如果存在）
3. 確認環境變數已應用到正確的環境（Production、Preview、Development）
4. 重新部署專案（即使沒有代碼更改）

### Q3: 仍然看到 API Key 在客戶端

**A**:
1. 確認 `.env.local` 中已移除 `NEXT_PUBLIC_GOOGLE_API_KEY`
2. 確認已重新啟動開發伺服器
3. 清除瀏覽器快取並重新載入頁面
4. 檢查是否有其他地方仍在使用 `NEXT_PUBLIC_GOOGLE_API_KEY`

---

## 📚 相關文件

- `src/app/api/google-sheets/route.ts` - Next.js API Route
- `src/utils/googleSheets.ts` - 更新後的工具函數
- `docs/FIX_GOOGLE_API_KEY.md` - 詳細修復說明

---

## ✅ 完成後的狀態

完成所有步驟後，您應該：

1. ✅ API Key 不再暴露在客戶端
2. ✅ 所有 Google Sheets API 請求都經過伺服器端 API Route
3. ✅ 客戶端無法直接獲取 API Key
4. ✅ 功能保持正常（對用戶透明）

---

## 🎉 完成！

恭喜！您已經成功將 Google API Key 移到伺服器端，大幅提升了系統的安全性！
