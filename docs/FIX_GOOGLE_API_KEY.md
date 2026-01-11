# 修復 Google API Key 暴露在客戶端的問題

## 🚨 問題說明

**問題**：
- `NEXT_PUBLIC_GOOGLE_API_KEY` 暴露在客戶端代碼中
- 任何人都可以從瀏覽器開發工具或源代碼中獲取 API Key
- 在 `src/components/Swimlane.tsx` 和 `src/components/BatchSearch.tsx` 中直接使用

**影響**：
- API Key 可能被濫用
- 可能產生額外的 API 費用
- 如果 API Key 有寫入權限，可能被惡意修改 Google Sheets

---

## ✅ 解決方案

將 Google Sheets API 調用移到 **Next.js API Route**（伺服器端），API Key 不再暴露在客戶端。

---

## 📋 實施步驟

### 步驟 1：創建 Next.js API Route

已創建 `src/app/api/google-sheets/route.ts`，這個文件會：
- 在伺服器端接收請求
- 從伺服器端環境變數獲取 API Key（`process.env.GOOGLE_API_KEY`）
- 調用 Google Sheets API
- 返回資料給客戶端

### 步驟 2：更新環境變數

1. 在 `.env.local` 中：
   - **移除** `NEXT_PUBLIC_GOOGLE_API_KEY`（不再需要）
   - **添加** `GOOGLE_API_KEY=your_api_key_here`（不使用 `NEXT_PUBLIC_` 前綴）

2. 在 Vercel 環境變數中：
   - 移除 `NEXT_PUBLIC_GOOGLE_API_KEY`
   - 添加 `GOOGLE_API_KEY`（注意：不使用 `NEXT_PUBLIC_` 前綴）

### 步驟 3：更新客戶端代碼

已更新：
- `src/utils/googleSheets.ts` - 現在使用 `/api/google-sheets` API Route
- `src/components/Swimlane.tsx` - 不再需要傳遞 `googleApiKey`（但仍保留參數以向後兼容）
- `src/components/BatchSearch.tsx` - 不再需要傳遞 `googleApiKey`（但仍保留參數以向後兼容）

### 步驟 4：測試

1. 更新 `.env.local` 後，重新啟動開發伺服器：
   ```bash
   npm run dev
   ```

2. 測試 QC 狀態功能是否正常工作

3. 檢查瀏覽器 Network 標籤，確認：
   - 不再有直接的 Google Sheets API 請求
   - 請求都經過 `/api/google-sheets` API Route

---

## 📝 環境變數對照

### 修改前

```env
# .env.local（錯誤 - API Key 暴露在客戶端）
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
```

### 修改後

```env
# .env.local（正確 - API Key 只在伺服器端）
GOOGLE_API_KEY=your_api_key_here

# 如果需要，保留 Sheet ID（這個可以公開）
NEXT_PUBLIC_GOOGLE_SHEET_ID=your_sheet_id_here
```

---

## 🔒 安全改進

### 修改前（不安全）

```
客戶端 → 直接調用 Google Sheets API
         ↓
    API Key 暴露在客戶端代碼中
         ↓
    任何人都可以獲取並濫用
```

### 修改後（安全）

```
客戶端 → Next.js API Route (/api/google-sheets)
         ↓
    伺服器端從環境變數獲取 API Key
         ↓
    伺服器端調用 Google Sheets API
         ↓
    返回資料給客戶端（不包含 API Key）
```

---

## ⚠️ 重要注意事項

### 1. 環境變數命名

- ❌ **錯誤**：`NEXT_PUBLIC_GOOGLE_API_KEY`（會暴露在客戶端）
- ✅ **正確**：`GOOGLE_API_KEY`（只在伺服器端可用）

### 2. Vercel 部署

在 Vercel 部署時，確保：
- 在 Vercel Dashboard → Settings → Environment Variables 中添加 `GOOGLE_API_KEY`
- 移除 `NEXT_PUBLIC_GOOGLE_API_KEY`（如果存在）

### 3. 向後兼容

- 客戶端代碼仍然可以傳遞 `googleApiKey` 參數（不會報錯）
- 但實際上不再使用該參數（API Route 從伺服器端環境變數獲取）

---

## 🧪 測試清單

- [ ] 更新 `.env.local`（移除 `NEXT_PUBLIC_GOOGLE_API_KEY`，添加 `GOOGLE_API_KEY`）
- [ ] 重新啟動開發伺服器
- [ ] 測試 QC 狀態顯示是否正常
- [ ] 檢查瀏覽器 Console，確認沒有 API Key 相關錯誤
- [ ] 檢查瀏覽器 Network 標籤，確認請求都經過 `/api/google-sheets`
- [ ] 確認客戶端代碼中不再直接調用 Google Sheets API
- [ ] 部署到 Vercel 並更新環境變數

---

## 📚 相關文件

- `src/app/api/google-sheets/route.ts` - Next.js API Route
- `src/utils/googleSheets.ts` - 更新後的 Google Sheets 工具函數
- `src/components/Swimlane.tsx` - 更新後的組件
- `src/components/BatchSearch.tsx` - 更新後的組件

---

## ✅ 完成後的效果

1. ✅ API Key 不再暴露在客戶端
2. ✅ 所有 Google Sheets API 請求都經過伺服器端
3. ✅ 客戶端無法直接獲取 API Key
4. ✅ 功能保持正常（對用戶透明）
