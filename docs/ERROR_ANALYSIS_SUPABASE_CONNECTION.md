# Supabase 連接錯誤分析

## 🔍 錯誤分析

### 錯誤訊息

從 Console 中看到的錯誤：

1. **`ERR_INSUFFICIENT_RESOURCES`**
   ```
   GET https://mczatvrggkqmjirrcyzh.supabase.co/rest/v1/schedule_items?select=*...
   net::ERR_INSUFFICIENT_RESOURCES
   ```

2. **`載入排程項目失敗`**
   ```
   載入排程項目失敗: [錯誤詳情]
   ```

3. **`TypeError: Failed to fetch`**
   ```
   TypeError: Failed to fetch
   ```

4. **警告：資料狀態不一致**
   ```
   檢測到 dbItems 為空陣列，但本地狀態有資料，
   可能是資料庫載入錯誤或狀態不一致，使用本地狀態
   ```

---

## ✅ 與 Google API Key 改動無關

**重要**：這些錯誤**與 Google API Key 改動完全無關**。

### 原因分析

1. **錯誤來源**：
   - 錯誤來自 Supabase 連接（`supabase.co/rest/v1/schedule_items`）
   - 不是來自 Google Sheets API

2. **錯誤類型**：
   - `ERR_INSUFFICIENT_RESOURCES` 是瀏覽器資源不足錯誤
   - 通常是網路連接或瀏覽器資源問題

3. **Google API Key 改動影響範圍**：
   - 只影響 Google Sheets QC 資料讀取
   - 不影響 Supabase 資料庫連接

---

## 🚨 實際問題：Supabase 連接問題

### 可能原因

#### 1. Supabase 專案資源不足

從截圖中看到：**"EXCEEDING USAGE LIMITS"**

這表示 Supabase 專案已超過使用限制，可能導致：
- API 請求失敗
- 連接超時
- 資源不足錯誤

#### 2. 網路連接問題

- 瀏覽器資源不足（太多請求）
- 網路不穩定
- 防火牆或代理設定問題

#### 3. 請求過於頻繁

- Realtime 訂閱可能產生大量請求
- 多個組件同時載入資料
- 沒有適當的請求節流

---

## 🔧 解決方案

### 方案 1：檢查 Supabase 使用量（優先）

1. 登入 Supabase Dashboard
2. 檢查 **Usage** 或 **Billing** 頁面
3. 確認是否超過免費層限制：
   - Database Size
   - API Requests
   - Realtime Connections
   - Bandwidth

**如果超過限制**：
- 升級到付費方案
- 或優化使用量（減少請求頻率）

### 方案 2：優化請求頻率

#### 添加請求節流

在 `src/hooks/useScheduleData.ts` 中添加請求節流：

```typescript
// 添加請求節流，避免過於頻繁的請求
let lastRequestTime = 0;
const REQUEST_THROTTLE_MS = 1000; // 1 秒內只允許一次請求

async function loadScheduleItemsFromDB(): Promise<ScheduleItem[]> {
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_THROTTLE_MS) {
    console.log('⏱️ 請求過於頻繁，節流中...');
    return [];
  }
  lastRequestTime = now;
  
  // ... 原有邏輯
}
```

### 方案 3：添加重試機制

在 `src/hooks/useScheduleData.ts` 中添加重試邏輯：

```typescript
async function loadScheduleItemsFromDB(retries = 3): Promise<ScheduleItem[]> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from(TABLES.SCHEDULE_ITEMS)
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map(dbToScheduleItem);
      }

      // 如果是資源不足錯誤，等待後重試
      if (error?.message?.includes('INSUFFICIENT_RESOURCES') && i < retries - 1) {
        console.warn(`⚠️ 資源不足，等待 ${(i + 1) * 2} 秒後重試...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }

      throw error;
    } catch (error) {
      if (i === retries - 1) {
        console.error('❌ 載入排程項目失敗（已重試）:', error);
        return [];
      }
    }
  }
  return [];
}
```

### 方案 4：減少 Realtime 訂閱頻率

檢查 `src/hooks/useRealtimeSchedule.ts`，確認 Realtime 訂閱不會產生過多請求。

### 方案 5：清除瀏覽器快取

1. 清除瀏覽器快取和 Cookie
2. 關閉其他分頁（減少資源使用）
3. 重新載入頁面

---

## 📊 錯誤影響範圍

### 受影響的功能

- ❌ 排程項目載入失敗
- ❌ Realtime 同步可能中斷
- ⚠️ 資料狀態可能不一致（本地狀態 vs 資料庫）

### 不受影響的功能

- ✅ Google Sheets QC 資料讀取（如果 API Key 已設定）
- ✅ 用戶認證和授權
- ✅ UI 顯示（使用本地狀態）

---

## 🔍 診斷步驟

### 1. 檢查 Supabase Dashboard

1. 登入 Supabase Dashboard
2. 檢查 **Project Settings** → **Usage**
3. 確認是否超過限制

### 2. 檢查網路連接

在瀏覽器 Console 中執行：

```javascript
// 測試 Supabase 連接
const { data, error } = await supabase
  .from('schedule_items')
  .select('id')
  .limit(1);

console.log('連接測試:', { data, error });
```

### 3. 檢查瀏覽器資源

1. 打開 Chrome Task Manager（`Shift + Esc`）
2. 檢查記憶體和 CPU 使用量
3. 關閉不必要的分頁

---

## ⚠️ 臨時解決方案

如果問題持續，可以：

1. **使用本地狀態**（應用程式已自動處理）：
   - 如果資料庫載入失敗，會使用本地狀態
   - 功能仍可使用，但可能不是最新資料

2. **手動重新載入**：
   - 按 `F5` 重新載入頁面
   - 或清除快取後重新載入

3. **等待後重試**：
   - 如果是 Supabase 資源限制，等待一段時間後重試

---

## 📝 建議的改進

### 1. 添加錯誤處理和重試機制

- 自動重試失敗的請求
- 顯示用戶友好的錯誤訊息
- 提供手動重試按鈕

### 2. 優化請求頻率

- 添加請求節流
- 合併多個請求
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
3. **網路或瀏覽器資源問題**

### 解決方案優先級

1. **立即**：檢查 Supabase 使用量
2. **短期**：添加重試機制和錯誤處理
3. **長期**：優化請求頻率，考慮升級方案

### 當前狀態

- ✅ 應用程式仍可使用（使用本地狀態）
- ⚠️ 資料可能不是最新的（如果資料庫連接失敗）
- ⚠️ 需要解決 Supabase 連接問題
