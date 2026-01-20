# API 路由身份驗證驗證指南

**建立日期：** 2026-01-20  
**目的：** 驗證 API 路由身份驗證是否正常運作

---

## 🔍 驗證步驟

### 步驟 1：檢查瀏覽器 Network（最直接的方法）

1. **開啟瀏覽器開發者工具**（按 F12）
2. **切換到 Network 標籤**
3. **重新載入頁面**（F5 或 Ctrl+R）
4. **過濾請求**：在 Filter 輸入框輸入 `google-sheets`
5. **找到 `/api/google-sheets` 請求**，點擊查看詳情

**檢查 Request Headers：**
```
Authorization: Bearer <token>
```

**如果看到 `Authorization` header**：✅ Token 已正確傳遞

**如果沒有看到 `Authorization` header**：⚠️ Token 未傳遞，需要檢查

**檢查 Response：**

**成功情況（200 OK）：**
```json
{
  "values": [
    [...],
    [...]
  ]
}
```

**失敗情況（401 Unauthorized）：**
```json
{
  "error": "Missing authorization token",
  "code": "UNAUTHORIZED"
}
```

---

### 步驟 2：測試未授權請求（手動測試）

在瀏覽器 Console 中執行：

```javascript
// 測試 1：不包含 Authorization header
fetch('/api/google-sheets?spreadsheetId=1JFc41wWRhqTLGKvpoQgQHbzj0nOkYKALlcqQzR9Is_Q&sheetName=Report&range=D2:H')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**預期結果：**
```json
{
  "error": "Missing authorization token",
  "code": "UNAUTHORIZED"
}
```

**如果返回 401**：✅ 驗證正在工作

**如果返回 200**：⚠️ 驗證未生效，需要檢查

---

### 步驟 3：檢查伺服器日誌

**本地開發環境：**
查看終端中的 Next.js 開發伺服器輸出

**應該看到：**
- ✅ **驗證成功：** `✅ [API] 授權用戶存取 Google Sheets API: { userId: '...', userEmail: '...' }`
- ❌ **驗證失敗：** `❌ [API] 未授權存取 Google Sheets API: { status: 401, message: '...' }`

**Vercel 生產環境：**
1. 前往 Vercel Dashboard
2. 選擇您的專案
3. 點擊 "Functions" 或 "Logs"
4. 查看 `/api/google-sheets` 的執行日誌

---

## 🐛 常見問題排查

### 問題 1：客戶端沒有傳遞 Token

**症狀：**
- Network 中看不到 `Authorization` header
- API 返回 401 錯誤

**原因：**
- `getSupabaseAccessToken()` 函數沒有正確獲取 token
- Supabase session 未正確初始化

**解決方法：**
1. 檢查用戶是否已登入
2. 檢查 `src/utils/googleSheets.ts` 中的 `getSupabaseAccessToken()` 函數
3. 確認 Supabase 客戶端已正確初始化

**調試代碼（在 Console 中執行）：**
```javascript
// 檢查 Supabase session
const { supabase } = await import('/src/lib/supabase');
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Access Token:', session?.access_token);
```

---

### 問題 2：Token 驗證失敗

**症狀：**
- Network 中有 `Authorization` header
- API 返回 401 錯誤

**可能原因：**
1. Token 已過期
2. Token 格式不正確
3. Supabase 配置錯誤

**解決方法：**
1. 檢查 Token 是否在有效期內
2. 嘗試重新登入
3. 檢查環境變數（`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）

---

### 問題 3：驗證邏輯沒有執行

**症狀：**
- API 正常返回資料
- 但伺服器日誌中沒有驗證相關的訊息

**可能原因：**
- API 路由代碼未正確更新
- 代碼未重新編譯

**解決方法：**
1. 確認 `src/app/api/google-sheets/route.ts` 包含 `verifyApiAuth()` 調用
2. 重新啟動開發伺服器：`npm run dev`
3. 清除 Next.js 快取：刪除 `.next` 目錄後重新啟動

---

## ✅ 驗證清單

請逐項檢查以下項目：

- [ ] **編譯成功**：`npm run build` 無錯誤
- [ ] **API 路由包含驗證**：`src/app/api/google-sheets/route.ts` 中有 `verifyApiAuth()` 調用
- [ ] **客戶端傳遞 Token**：Network 中可以看到 `Authorization` header
- [ ] **未授權請求被拒絕**：手動測試返回 401
- [ ] **已授權請求成功**：正常用戶可以載入 QC 資料
- [ ] **伺服器日誌正常**：看到驗證成功或失敗的日誌

---

## 📊 驗證結果

### ✅ 如果所有檢查都通過：

**恭喜！** API 路由身份驗證已成功實施並正常運作。

### ⚠️ 如果有項目未通過：

請根據上述故障排除步驟進行修復，或聯繫開發團隊尋求協助。

---

**文檔建立者：** AI Assistant  
**最後更新：** 2026-01-20
