# Google API Key 遷移影響分析

## ✅ 不會影響數據連結

改動**不會**影響數據連結，原因如下：

---

## 📊 數據流程對照

### 修改前（客戶端直接調用）

```
客戶端組件 (Swimlane.tsx)
  ↓
useQCStatus Hook
  ↓
fetchQCDataFromGoogleSheets()
  ↓
直接調用 Google Sheets API
  ↓
返回 QCData[] 格式的數據
```

### 修改後（通過 API Route）

```
客戶端組件 (Swimlane.tsx)
  ↓
useQCStatus Hook
  ↓
fetchQCDataFromGoogleSheets()
  ↓
調用 Next.js API Route (/api/google-sheets)
  ↓
API Route 調用 Google Sheets API（伺服器端）
  ↓
返回相同的數據格式（QCData[]）
```

**關鍵**：數據格式和處理邏輯**完全一致**，只是 API 調用的路徑改變了。

---

## 🔍 詳細分析

### 1. 數據格式保持一致

#### API Route 返回的格式
```json
{
  "values": [
    ["D欄值", "E欄值", "", "", "H欄值"],
    ...
  ]
}
```

#### 原來直接調用返回的格式
```json
{
  "values": [
    ["D欄值", "E欄值", "", "", "H欄值"],
    ...
  ]
}
```

**結論**：✅ 格式完全一致

### 2. 數據處理邏輯未改變

`fetchQCDataFromGoogleSheets()` 函數的處理邏輯：
- ✅ 解析 `data.values` 陣列
- ✅ 轉換為 `QCData[]` 格式
- ✅ 過濾無效資料
- ✅ 處理 CSV fallback

**結論**：✅ 邏輯完全一致

### 3. CSV Fallback 仍然可用

如果 API Route 失敗，會自動嘗試 CSV 格式：

```typescript
// 如果所有工作表名稱都失敗，嘗試使用 CSV 格式（公開 Sheet）
// 注意：CSV 格式不需要 API Key，所以可以繼續使用
const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(csvSheetName)}&range=D2:H`;
```

**結論**：✅ CSV fallback 仍然可用，提供額外的備援

---

## 📋 改動對比表

| 項目 | 修改前 | 修改後 | 是否影響 |
|------|--------|--------|---------|
| **數據格式** | `QCData[]` | `QCData[]` | ✅ 不影響 |
| **API 調用方式** | 直接調用 Google API | 通過 API Route | ✅ 不影響（封裝層） |
| **返回數據結構** | `{ values: [...] }` | `{ values: [...] }` | ✅ 不影響 |
| **數據處理邏輯** | 解析 + 轉換 | 解析 + 轉換（相同） | ✅ 不影響 |
| **CSV Fallback** | 可用 | 可用 | ✅ 不影響 |
| **QC 狀態顯示** | 正常 | 正常 | ✅ 不影響 |
| **批次查詢功能** | 正常 | 正常 | ✅ 不影響 |

---

## ✅ 保證不影響的原因

### 1. 向後兼容設計

```typescript
// 保留參數以向後兼容
export async function fetchQCDataFromGoogleSheets(
  spreadsheetId: string,
  apiKey?: string  // 保留參數，但不再使用
): Promise<QCData[]>
```

- 函數簽名未改變
- 返回類型未改變
- 處理邏輯未改變

### 2. API Route 返回相同格式

```typescript
// API Route 返回 Google Sheets API 的原始格式
const data = await response.json();  // { values: [...] }
return NextResponse.json(data);      // 返回相同格式
```

### 3. 數據轉換邏輯未改變

```typescript
// 相同的轉換邏輯
const rows = data.values || [];
const qcDataList: QCData[] = rows
  .filter(...)  // 相同的過濾邏輯
  .map(...)     // 相同的轉換邏輯
```

---

## ⚠️ 需要注意的事項

### 1. 環境變數配置（必須完成）

**如果不更新環境變數，會導致無法讀取數據**：

- ❌ 缺少 `GOOGLE_API_KEY` → API Route 會返回錯誤
- ✅ 有 `GOOGLE_API_KEY` → 正常運作

### 2. 網路請求路徑改變

**修改前**：
```
客戶端 → https://sheets.googleapis.com/v4/spreadsheets/...
```

**修改後**：
```
客戶端 → /api/google-sheets → https://sheets.googleapis.com/v4/spreadsheets/...
```

**影響**：
- ✅ 對用戶透明（不影響功能）
- ✅ 可以監控和記錄 API 請求
- ⚠️ 需要確保 API Route 可正常訪問

### 3. 錯誤處理

如果 API Route 失敗，會有明確的錯誤訊息：

```typescript
// API Route 中的錯誤處理
if (!googleApiKey) {
  return NextResponse.json(
    { error: 'Google API Key not configured' },
    { status: 500 }
  );
}
```

**建議**：檢查瀏覽器 Console，確認沒有錯誤

---

## 🧪 測試清單

### 功能測試

- [ ] QC 狀態顯示正常（卡片上的 🟡QC中、✅QC完成、❌NG 標籤）
- [ ] 批次查詢功能正常（BatchSearch 組件）
- [ ] 數據更新正常（QC 狀態會自動更新）
- [ ] 錯誤處理正常（如果 Sheet ID 錯誤，顯示錯誤訊息）

### 網路測試

- [ ] 檢查瀏覽器 Network 標籤，確認請求經過 `/api/google-sheets`
- [ ] 確認請求成功（狀態碼 200）
- [ ] 確認響應數據格式正確（包含 `values` 欄位）

### 錯誤處理測試

- [ ] 如果 `GOOGLE_API_KEY` 未設定，應顯示錯誤訊息
- [ ] 如果 Sheet ID 錯誤，應顯示錯誤訊息
- [ ] CSV fallback 仍然可用（如果 API Route 失敗）

---

## 📊 預期行為

### 成功情況

1. **數據正常顯示**：
   - QC 狀態標籤正常顯示
   - 批次查詢功能正常
   - 數據更新正常

2. **網路請求正常**：
   - 請求經過 `/api/google-sheets`
   - 返回狀態碼 200
   - 響應包含正確的數據

### 失敗情況（如果環境變數未設定）

1. **數據無法載入**：
   - QC 狀態不顯示
   - 批次查詢返回錯誤
   - Console 顯示錯誤訊息

2. **錯誤訊息**：
   ```
   ❌ QC 資料載入失敗: Google API Key not configured
   ```

**解決方案**：設定 `GOOGLE_API_KEY` 環境變數

---

## ✅ 結論

### 不會影響數據連結

**原因**：
1. ✅ 數據格式完全一致
2. ✅ 處理邏輯未改變
3. ✅ CSV fallback 仍然可用
4. ✅ 向後兼容設計

### 需要完成的步驟

1. ✅ 更新環境變數（必須）
2. ✅ 重新啟動開發伺服器
3. ✅ 測試功能是否正常

### 改進

1. ✅ API Key 不再暴露在客戶端
2. ✅ 可以監控和記錄 API 請求
3. ✅ 可以在伺服器端添加額外的安全檢查

---

## 📚 相關文件

- `docs/GOOGLE_API_KEY_MIGRATION_GUIDE.md` - 完整遷移指南
- `docs/FIX_GOOGLE_API_KEY.md` - 修復說明
