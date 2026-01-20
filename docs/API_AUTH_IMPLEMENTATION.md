# API 路由身份驗證實施指南

**實施日期：** 2026-01-20  
**目標：** 為 `/api/google-sheets` 路由添加身份驗證，確保只有已登入的用戶可以存取

---

## 📋 實施摘要

已成功為 Google Sheets API 路由添加身份驗證機制：

1. ✅ 創建可重用的身份驗證工具 (`src/lib/apiAuth.ts`)
2. ✅ 更新 API 路由使用身份驗證 (`src/app/api/google-sheets/route.ts`)
3. ✅ 更新客戶端請求包含 Authorization header (`src/utils/googleSheets.ts`)

---

## 🔧 實施細節

### 1. 身份驗證工具 (`src/lib/apiAuth.ts`)

**功能：**
- 從請求中提取 JWT Token（從 `Authorization: Bearer <token>` header）
- 使用 Supabase 驗證 JWT Token
- 返回用戶資訊或錯誤訊息

**核心函數：**

```typescript
export async function verifyApiAuth(request: NextRequest): Promise<{
  user: { id: string; email: string } | null;
  error: { message: string; status: number } | null;
}>
```

### 2. API 路由更新 (`src/app/api/google-sheets/route.ts`)

**變更：**
- 在處理請求前先驗證身份
- 驗證失敗返回 401 Unauthorized
- 驗證成功後繼續處理請求

**流程：**
```
請求 → 驗證 Token → 驗證失敗? → 返回 401
                      ↓
                   驗證成功 → 繼續處理請求
```

### 3. 客戶端請求更新 (`src/utils/googleSheets.ts`)

**變更：**
- 添加 `getSupabaseAccessToken()` 函數從 Supabase session 獲取 access token
- 在 API 請求中包含 `Authorization: Bearer <token>` header

---

## 🧪 測試方法

### 測試 1：已登入用戶（正常流程）

**步驟：**
1. 登入系統
2. 開啟 QC 狀態功能
3. 檢查瀏覽器 Network 標籤
4. 確認 `/api/google-sheets` 請求返回 200 狀態碼

**預期結果：** ✅ 成功載入 QC 資料

### 測試 2：未登入用戶（應被拒絕）

**步驟：**
1. 登出系統或清除 session
2. 開啟瀏覽器開發者工具
3. 手動發送請求到 `/api/google-sheets`：
   ```javascript
   fetch('/api/google-sheets?spreadsheetId=xxx&sheetName=Report&range=D2:H')
     .then(r => r.json())
     .then(console.log)
   ```

**預期結果：** ❌ 返回 401 Unauthorized

**錯誤回應範例：**
```json
{
  "error": "Missing authorization token",
  "code": "UNAUTHORIZED"
}
```

### 測試 3：無效 Token（應被拒絕）

**步驟：**
1. 發送請求時使用無效的 token：
   ```javascript
   fetch('/api/google-sheets?spreadsheetId=xxx&sheetName=Report&range=D2:H', {
     headers: {
       'Authorization': 'Bearer invalid_token_12345'
     }
   })
   ```

**預期結果：** ❌ 返回 401 Unauthorized

**錯誤回應：**
```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

---

## 📊 影響評估

### ✅ 正面影響

1. **安全性提升**
   - ✅ 防止未授權用戶存取 API
   - ✅ 防止 API Key 被濫用
   - ✅ 符合安全最佳實踐

2. **符合規範**
   - ✅ 符合 OWASP Top 10 安全標準
   - ✅ 符合 API 設計最佳實踐

### ⚠️ 潛在影響

1. **用戶體驗**
   - ⚠️ 如果 session 過期，用戶需要重新登入
   - ⚠️ 需要確保 token 正確傳遞

2. **相容性**
   - ⚠️ 所有現有的 API 請求都需要包含 token
   - ⚠️ 如果其他工具直接呼叫 API，需要更新

---

## 🔍 如何驗證是否正常工作

### 方法 1：檢查瀏覽器 Network

1. 開啟瀏覽器開發者工具（F12）
2. 切換到 Network 標籤
3. 載入頁面或觸發 QC 資料載入
4. 找到 `/api/google-sheets` 請求
5. 檢查 Request Headers：
   ```
   Authorization: Bearer <token>
   ```
6. 檢查 Response：
   - 已登入：200 OK，返回資料
   - 未登入：401 Unauthorized，返回錯誤訊息

### 方法 2：檢查伺服器日誌

在 Vercel 或本地終端中查看日誌：

**成功情況：**
```
✅ [API] 授權用戶存取 Google Sheets API: { userId: '...', userEmail: '...' }
✅ [API] Google Sheets 資料讀取成功，行數: 100
```

**失敗情況：**
```
❌ [API] 未授權存取 Google Sheets API: { status: 401, message: 'Missing authorization token' }
```

---

## 🛠️ 故障排除

### 問題 1：API 返回 401 Unauthorized（但用戶已登入）

**可能原因：**
- Token 未正確傳遞到 API
- Session 已過期
- Token 格式不正確

**解決方法：**
1. 檢查瀏覽器 Network 標籤中的 Request Headers
2. 確認 `Authorization: Bearer <token>` header 存在
3. 檢查 Supabase session 是否有效
4. 嘗試重新登入

### 問題 2：客戶端無法獲取 Token

**可能原因：**
- Supabase 客戶端未正確初始化
- Session 未正確儲存
- 瀏覽器環境問題

**解決方法：**
1. 檢查 `src/lib/supabase.ts` 中的 Supabase 初始化
2. 確認 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 環境變數已設定
3. 檢查瀏覽器 Console 是否有錯誤訊息

### 問題 3：API 驗證失敗但 Token 看起來正確

**可能原因：**
- Token 已過期
- Supabase 配置不正確
- 服務端環境變數未設定

**解決方法：**
1. 檢查 Vercel 環境變數（`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
2. 確認 Token 是否在有效期內
3. 檢查 Supabase 專案配置

---

## 📝 後續改進建議

### 短期改進（1-2 週）

1. **改進錯誤訊息**
   - 提供更詳細的錯誤訊息
   - 區分不同類型的驗證失敗（token 缺失、token 過期、token 無效）

2. **添加 Token 刷新機制**
   - 如果 token 過期，自動嘗試刷新
   - 避免用戶頻繁需要重新登入

3. **添加測試**
   - 單元測試：測試 `apiAuth.ts` 函數
   - 整合測試：測試完整的 API 流程

### 長期改進（1-3 個月）

4. **實施速率限制**
   - 基於用戶身份的速率限制
   - 防止單一用戶濫用 API

5. **添加 API 日誌**
   - 記錄所有 API 存取（包括用戶資訊）
   - 用於審計和安全分析

6. **考慮使用 API Key**
   - 為長期運行的服務創建 API Key
   - 區分用戶存取和服務存取

---

## ✅ 驗收標準

### 必須滿足的條件

- [x] API 路由必須驗證身份
- [x] 未授權請求返回 401 錯誤
- [x] 已登入用戶可以正常存取
- [x] 客戶端自動包含 Authorization header
- [x] 錯誤訊息清晰易懂

### 建議滿足的條件

- [ ] 有完整的測試覆蓋
- [ ] 有詳細的錯誤處理
- [ ] 有日誌記錄功能
- [ ] 有速率限制機制

---

## 📚 參考資源

### 文檔

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT Token Verification](https://supabase.com/docs/guides/auth/server-side/nextjs)

### 相關文檔

- `docs/SECURITY_ASSESSMENT.md` - 資安評估表
- `docs/SECURITY_IMPROVEMENT_EVALUATION.md` - 改進項目評估

---

**實施人員：** AI Assistant  
**最後更新：** 2026-01-20
