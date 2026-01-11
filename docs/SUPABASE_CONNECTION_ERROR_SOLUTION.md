# Supabase 連接錯誤解決方案

## 🔍 錯誤分析

從截圖中看到的錯誤對話框：

```
⚠️ Supabase 連接測試失敗

資料已保存到本地 (localStorage)

請開啟瀏覽器控制台(F12)查看詳細錯誤訊息和解決步驟

是否繼續嘗試保存到資料庫?
```

---

## ✅ 與 Google API Key 改動無關

**重要**：這個錯誤**與 Google API Key 改動完全無關**。

### 原因

1. **錯誤來源**：
   - 錯誤來自 Supabase 連接測試（`SaveSnapshotButton` 組件）
   - 不是來自 Google Sheets API

2. **錯誤類型**：
   - Supabase 連接失敗（可能是資源限制或網路問題）
   - 系統自動降級到 localStorage

3. **Google API Key 改動影響**：
   - 只影響 Google Sheets QC 資料讀取
   - 不影響 Supabase 資料庫連接

---

## 🚨 實際問題：Supabase 連接失敗

### 可能原因

#### 1. Supabase 專案資源不足（最可能）

從之前的截圖看到：**"EXCEEDING USAGE LIMITS"**

這表示 Supabase 專案已超過使用限制，導致：
- 連接測試失敗
- API 請求失敗
- `ERR_INSUFFICIENT_RESOURCES` 錯誤

#### 2. 網路連接問題

- 瀏覽器資源不足
- 網路不穩定
- 防火牆或代理設定問題

#### 3. Supabase 服務暫時不可用

- Supabase 服務維護
- 區域性服務中斷

---

## 🔧 解決方案

### 方案 1：檢查 Supabase 使用量（優先）

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 進入 **Settings** → **Usage** 或 **Billing**
4. 檢查是否超過免費層限制：
   - **Database Size**（資料庫大小）
   - **API Requests**（API 請求數）
   - **Realtime Connections**（即時連接數）
   - **Bandwidth**（頻寬）

**如果超過限制**：
- 升級到付費方案（Pro 或更高）
- 或優化使用量（減少請求頻率、清理舊資料）

### 方案 2：臨時處理（系統已自動處理）

系統已經自動降級處理：

1. **資料已保存到 localStorage**：
   - 功能仍可使用
   - 資料不會丟失
   - 但只在當前瀏覽器中可用

2. **選擇「確定」繼續嘗試保存**：
   - 如果 Supabase 連接恢復，會自動保存到資料庫
   - 如果仍然失敗，會繼續使用 localStorage

3. **選擇「取消」**：
   - 只使用 localStorage
   - 不會再嘗試保存到資料庫

### 方案 3：手動重試

1. 等待幾分鐘後，點擊「存檔」按鈕再次嘗試
2. 如果 Supabase 連接恢復，會自動保存到資料庫

### 方案 4：檢查網路連接

1. 檢查網路連接是否正常
2. 嘗試重新載入頁面（`F5`）
3. 清除瀏覽器快取後重新載入

---

## 📊 錯誤影響範圍

### 受影響的功能

- ⚠️ **存檔功能**：無法保存到資料庫（但會保存到 localStorage）
- ⚠️ **資料同步**：多個分頁/裝置可能顯示不同資料
- ⚠️ **Realtime 同步**：可能中斷

### 不受影響的功能

- ✅ **基本功能**：仍可使用（使用 localStorage）
- ✅ **資料顯示**：仍可正常顯示
- ✅ **Google Sheets QC 資料**：如果 API Key 已設定，仍可正常讀取

---

## 🔍 診斷步驟

### 1. 檢查 Supabase Dashboard

1. 登入 Supabase Dashboard
2. 檢查 **Project Settings** → **Usage**
3. 確認是否顯示 **"EXCEEDING USAGE LIMITS"**

### 2. 測試 Supabase 連接

在瀏覽器 Console 中執行：

```javascript
// 測試 Supabase 連接
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('schedule_items')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ 連接失敗:', error);
      console.error('錯誤代碼:', error.code);
      console.error('錯誤訊息:', error.message);
    } else {
      console.log('✅ 連接成功:', data);
    }
  } catch (err) {
    console.error('❌ 連接異常:', err);
  }
};

testConnection();
```

### 3. 檢查錯誤詳情

打開瀏覽器 Console（F12），查看詳細錯誤訊息：
- 錯誤代碼
- 錯誤訊息
- 堆疊追蹤

---

## ⚠️ 重要提醒

### 關於資料保存

1. **localStorage 的限制**：
   - 只在當前瀏覽器中可用
   - 不同瀏覽器/裝置無法共享
   - 清除瀏覽器資料會丟失

2. **建議**：
   - 如果 Supabase 連接持續失敗，建議盡快解決
   - 避免長時間只使用 localStorage
   - 定期檢查 Supabase 狀態

### 關於 Google API Key 改動

- ✅ **不影響**：Google API Key 改動不影響 Supabase 連接
- ✅ **已完成**：改動已完成，只需更新環境變數
- ✅ **功能正常**：如果環境變數已設定，QC 資料讀取應該正常

---

## 📝 建議的改進

### 1. 添加更好的錯誤處理

- 顯示更詳細的錯誤訊息
- 提供重試按鈕
- 顯示 Supabase 狀態

### 2. 優化請求頻率

- 添加請求節流
- 減少不必要的請求
- 使用快取減少請求

### 3. 監控 Supabase 使用量

- 定期檢查使用量
- 設定使用量警告
- 考慮升級方案

---

## ✅ 總結

### 錯誤原因

1. **與 Google API Key 改動無關** ✅
2. **Supabase 連接問題**（可能是資源限制）
3. **系統已自動降級處理**（使用 localStorage）

### 解決方案優先級

1. **立即**：檢查 Supabase 使用量
2. **短期**：如果超過限制，升級方案或優化使用量
3. **長期**：添加更好的錯誤處理和監控

### 當前狀態

- ✅ 應用程式仍可使用（使用 localStorage）
- ⚠️ 資料可能不是最新的（如果資料庫連接失敗）
- ⚠️ 需要解決 Supabase 連接問題

---

## 🎯 下一步行動

1. [ ] 檢查 Supabase Dashboard 的使用量
2. [ ] 確認是否超過限制
3. [ ] 如果超過，考慮升級或優化
4. [ ] 測試 Supabase 連接是否恢復
5. [ ] 確認 Google API Key 環境變數已更新（如果還沒完成）
