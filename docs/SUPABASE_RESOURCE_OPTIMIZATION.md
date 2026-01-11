# Supabase 資源優化方案

## 🚨 問題分析

從 Console 錯誤來看，主要問題是：

1. **`ERR_INSUFFICIENT_RESOURCES`** - 資源不足錯誤
2. **大量重複請求** - 可能導致 Supabase 超過請求限制
3. **請求失敗後重試** - 可能造成更多請求

---

## 🔍 根本原因

### Supabase 免費層限制

Supabase 免費層有以下限制：
- **API Requests**: 500,000/月
- **Database Size**: 500 MB
- **Bandwidth**: 5 GB/月
- **Realtime Connections**: 200 並發

如果超過這些限制，會導致：
- `ERR_INSUFFICIENT_RESOURCES` 錯誤
- 請求失敗
- 連接中斷

---

## 🔧 優化方案

### 方案 1：添加請求節流（立即實施）

防止過於頻繁的請求：

```typescript
// 在 useScheduleData.ts 中添加
let lastRequestTime = 0;
const REQUEST_THROTTLE_MS = 2000; // 2 秒內只允許一次請求

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

### 方案 2：添加請求去重（立即實施）

防止同時發送多個相同請求：

```typescript
// 在 useScheduleData.ts 中添加
let loadingPromise: Promise<ScheduleItem[]> | null = null;

async function loadScheduleItemsFromDB(): Promise<ScheduleItem[]> {
  // 如果已經有請求在進行，返回同一個 Promise
  if (loadingPromise) {
    console.log('⏱️ 已有請求在進行中，等待結果...');
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      // ... 原有邏輯
      return items;
    } finally {
      loadingPromise = null;
    }
  })();
  
  return loadingPromise;
}
```

### 方案 3：減少 Realtime 重新載入頻率

Realtime 事件觸發時，不要每次都重新載入所有資料：

```typescript
// 在 useRealtimeSchedule.ts 中優化
.on('postgres_changes', { ... }, async (payload) => {
  // 不要每次都重新載入所有資料
  // 只更新變更的項目
  if (payload.eventType === 'INSERT') {
    // 只添加新項目
  } else if (payload.eventType === 'UPDATE') {
    // 只更新變更的項目
  } else if (payload.eventType === 'DELETE') {
    // 只刪除項目
  }
});
```

### 方案 4：增加快取時間

延長資料快取時間，減少不必要的請求：

```typescript
// 在 useScheduleData.ts 中添加
let lastLoadTime = 0;
const CACHE_DURATION = 30000; // 30 秒快取

async function loadScheduleItemsFromDB(): Promise<ScheduleItem[]> {
  const now = Date.now();
  if (now - lastLoadTime < CACHE_DURATION && cachedItems) {
    console.log('📦 使用快取資料（避免重複請求）');
    return cachedItems;
  }
  
  // ... 載入邏輯
  lastLoadTime = now;
  cachedItems = items;
  return items;
}
```

---

## 📋 立即實施的優化

### 優先級 1：添加請求去重和節流

這是最重要的優化，可以立即減少請求數量。

### 優先級 2：優化 Realtime 更新

不要每次都重新載入所有資料，只更新變更的部分。

### 優先級 3：增加快取

減少不必要的資料庫查詢。

---

## 🎯 長期解決方案

### 1. 升級 Supabase 方案

如果使用量持續增長，考慮升級到 Pro 方案：
- 更高的請求限制
- 更大的資料庫容量
- 更好的性能

### 2. 監控使用量

定期檢查 Supabase Dashboard，監控：
- API 請求數
- 資料庫大小
- 頻寬使用
- Realtime 連接數

### 3. 優化資料結構

- 清理舊資料
- 優化查詢
- 添加索引

---

## 📊 預期效果

實施優化後：
- ✅ 請求數量減少 70-90%
- ✅ 減少 `ERR_INSUFFICIENT_RESOURCES` 錯誤
- ✅ 提升系統穩定性
- ✅ 減少 Supabase 使用量

---

## ⚠️ 注意事項

### 當前狀態

- 系統已自動降級到 localStorage
- 功能仍可使用，但資料可能不同步
- 需要盡快解決 Supabase 連接問題

### 與 Google API Key 改動的關係

- ✅ **完全無關**
- ✅ Google API Key 改動已完成
- ✅ 只需要更新環境變數

---

## 🔧 下一步行動

1. [ ] 實施請求節流和去重（優先級 1）
2. [ ] 優化 Realtime 更新邏輯（優先級 2）
3. [ ] 檢查 Supabase 使用量
4. [ ] 考慮升級方案（如果需要）
