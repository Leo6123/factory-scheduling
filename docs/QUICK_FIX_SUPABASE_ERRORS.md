# 快速修復 Supabase 連接錯誤

## 🚨 問題確認

從 Console 錯誤來看，這是 **Supabase 連接問題**，與 Google API Key 改動**無關**。

---

## ✅ 快速檢查清單

### 1. 檢查 Supabase 使用量

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 進入 **Settings** → **Usage** 或 **Billing**
4. 檢查是否顯示 **"EXCEEDING USAGE LIMITS"**

**如果超過限制**：
- 這是主要原因
- 需要升級方案或優化使用量

### 2. 檢查網路連接

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
    } else {
      console.log('✅ 連接成功:', data);
    }
  } catch (err) {
    console.error('❌ 連接異常:', err);
  }
};

testConnection();
```

### 3. 清除瀏覽器資源

1. 關閉其他不必要的分頁
2. 清除瀏覽器快取（`Ctrl + Shift + Delete`）
3. 重新載入頁面（`F5`）

---

## 🔧 臨時解決方案

### 如果 Supabase 連接持續失敗

應用程式會自動使用本地狀態，功能仍可使用，但：
- ⚠️ 資料可能不是最新的
- ⚠️ 多個分頁可能顯示不同資料
- ⚠️ 需要手動重新載入以同步資料

---

## 📊 錯誤與 Google API Key 改動的關係

### ❌ 無關

**原因**：
1. 錯誤來自 Supabase（`supabase.co`），不是 Google Sheets
2. Google API Key 改動只影響 QC 資料讀取
3. 這些錯誤在改動前可能就存在

### ✅ 確認方法

檢查 Console 中是否有 Google Sheets 相關錯誤：
- 如果**沒有** Google Sheets 錯誤 → 改動成功，不影響
- 如果**有** Google Sheets 錯誤 → 可能是環境變數未設定

---

## 🎯 下一步行動

### 優先級 1：解決 Supabase 連接問題

1. [ ] 檢查 Supabase 使用量
2. [ ] 確認是否超過限制
3. [ ] 如果超過，考慮升級或優化

### 優先級 2：驗證 Google API Key 改動

1. [ ] 確認 `.env.local` 已更新（`GOOGLE_API_KEY`）
2. [ ] 測試 QC 狀態顯示是否正常
3. [ ] 檢查是否有 Google Sheets 相關錯誤

---

## 📝 總結

- ✅ **Google API Key 改動不影響數據連結**
- ⚠️ **當前錯誤是 Supabase 連接問題**（與改動無關）
- 🔧 **需要解決 Supabase 資源限制問題**
