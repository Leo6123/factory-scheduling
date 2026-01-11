# 密碼重置功能設置指南

## ✅ 已完成的功能

系統已經實作了完整的密碼重置流程：

1. **登入頁面**：添加了「忘記密碼？」連結
2. **忘記密碼頁面**（`/forgot-password`）：輸入 email 發送重置連結
3. **重置密碼頁面**（`/reset-password`）：設置新密碼

## 📋 需要在 Supabase Dashboard 中配置的項目

### 步驟 1：設置 Site URL 和 Redirect URLs

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 前往 **Authentication** > **URL Configuration**
4. 設置以下項目：

   **Site URL**：
   ```
   https://factory-scheduling.vercel.app
   ```
   （如果是本地開發，使用：`http://localhost:3000`）

   **Redirect URLs**：
   ```
   https://factory-scheduling.vercel.app/reset-password
   http://localhost:3000/reset-password
   ```
   （添加所有需要支援的 URL，包括生產環境和開發環境）

### 步驟 2：配置 Email 模板（可選）

1. 前往 **Authentication** > **Email Templates**
2. 選擇 **Reset Password** 模板
3. 可以自訂 email 內容，但建議保持預設設定
4. 確保以下變數在模板中正確使用：
   - `{{ .ConfirmationURL }}` - 重置連結
   - `{{ .Email }}` - 使用者 email

### 步驟 3：配置 Email 服務（如果尚未配置）

如果尚未配置 email 服務：

1. 前往 **Authentication** > **Email Auth**
2. 確保 **Enable Email Auth** 已啟用
3. 如果使用 Supabase 的免費 email 服務，有每日發送限制
4. 如果需要更高限制，可以配置自訂 SMTP 服務

## 🔄 完整流程

### 1. 使用者忘記密碼

1. 在登入頁面點擊「忘記密碼？」
2. 輸入 email 地址
3. 點擊「發送重置連結」
4. 系統顯示成功訊息（無論 email 是否存在，都顯示相同訊息，防止 email 探測）

### 2. 接收重置 email

1. 使用者檢查 email 收件匣（包括垃圾郵件資料夾）
2. 點擊 email 中的重置連結
3. 瀏覽器會導向到 `/reset-password` 頁面

### 3. 設置新密碼

1. 在重置密碼頁面輸入新密碼（至少 6 個字元）
2. 確認新密碼
3. 點擊「重置密碼」
4. 系統顯示成功訊息
5. 自動跳轉到登入頁面（3 秒後）

## 🧪 測試步驟

### 測試 1：發送重置連結

1. 前往 `/forgot-password`
2. 輸入已註冊的 email
3. 點擊「發送重置連結」
4. 檢查 email 收件匣
5. 確認收到重置 email

### 測試 2：重置密碼

1. 點擊 email 中的重置連結
2. 確認導向到 `/reset-password` 頁面
3. 輸入新密碼（至少 6 個字元）
4. 確認新密碼
5. 點擊「重置密碼」
6. 確認顯示成功訊息
7. 確認自動跳轉到登入頁面

### 測試 3：使用新密碼登入

1. 使用新設置的密碼登入
2. 確認登入成功

### 測試 4：無效連結處理

1. 直接訪問 `/reset-password`（沒有 token）
2. 確認顯示「重置連結無效」訊息
3. 確認可以點擊「重新申請密碼重置」連結

## 📝 技術細節

### API 調用

**發送重置連結**：
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${siteUrl}/reset-password`,
});
```

**重置密碼**：
```typescript
await supabase.auth.updateUser({
  password: newPassword,
});
```

### Token 處理

- Supabase 會將重置 token 放在 URL hash 中（例如：`#access_token=...&type=recovery`）
- 當使用者點擊重置連結時，Supabase 會自動處理 hash 並建立 session
- 系統檢查 session 是否存在，如果存在則允許重置密碼

### 安全考量

1. **Email 探測保護**：
   - 無論 email 是否存在，都顯示相同的成功訊息
   - 防止攻擊者探測哪些 email 已註冊

2. **Token 驗證**：
   - 檢查 session 是否存在，確保使用者已點擊有效的重置連結
   - 如果沒有有效的 session，顯示錯誤訊息

3. **密碼強度**：
   - 最少 6 個字元（Supabase 的預設要求）
   - 可以根據需求調整

## ⚠️ 注意事項

1. **Redirect URL 必須正確配置**：
   - 如果 Redirect URL 未配置或錯誤，重置連結可能無法正常工作
   - 確保生產環境和開發環境的 URL 都已添加

2. **Email 服務限制**：
   - Supabase 免費方案有每日 email 發送限制
   - 如果需要更高限制，需要配置自訂 SMTP 服務

3. **重置連結過期時間**：
   - 重置連結有過期時間（預設為 1 小時）
   - 如果連結過期，使用者需要重新申請

4. **開發環境測試**：
   - 在本地開發時，確保 `http://localhost:3000/reset-password` 已添加到 Redirect URLs
   - 使用 Supabase 的本地開發工具或使用生產環境的 Supabase 實例

## 🐛 常見問題

### Q1: 收不到重置 email

**可能原因**：
- Email 服務未配置
- Email 被分類為垃圾郵件
- Redirect URL 未正確配置
- 使用了不存在的 email（但系統仍會顯示成功訊息）

**解決方法**：
1. 檢查 Supabase Dashboard > Authentication > Email Templates
2. 檢查 email 收件匣和垃圾郵件資料夾
3. 確認 Redirect URL 已正確配置
4. 檢查 Supabase Dashboard > Logs 中的錯誤訊息

### Q2: 重置連結無效或已過期

**可能原因**：
- 連結已過期（預設 1 小時）
- Token 已被使用
- URL 參數不正確

**解決方法**：
1. 重新申請密碼重置
2. 檢查連結是否完整（包含所有參數）
3. 確認沒有重複使用連結

### Q3: 重置密碼後無法登入

**可能原因**：
- 新密碼輸入錯誤
- 使用了舊密碼
- Session 問題

**解決方法**：
1. 確認使用新設置的密碼
2. 清除瀏覽器 cookies 和 sessionStorage
3. 重新登入

## 📚 相關文件

- `src/app/login/page.tsx` - 登入頁面（包含「忘記密碼？」連結）
- `src/app/forgot-password/page.tsx` - 忘記密碼頁面
- `src/app/reset-password/page.tsx` - 重置密碼頁面
- `docs/PASSWORD_SECURITY.md` - 密碼安全性說明
