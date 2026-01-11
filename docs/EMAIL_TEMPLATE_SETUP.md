# Email 模板設置指南

## 📧 Reset Password Email 模板配置

### 當前模板內容

Supabase 預設的 "Reset password" email 模板內容如下：

**Subject（主旨）**：
```
Reset Your Password
```

**Body（內容）**：
```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### 🔧 如何配置

1. **進入 Email Templates 頁面**：
   - 登入 [Supabase Dashboard](https://app.supabase.com/)
   - 選擇您的專案
   - 前往 **Authentication** > **Email Templates**
   - 選擇 **Reset password** 模板

2. **編輯 Subject（主旨）**：
   - 在 **Subject** 欄位中輸入主旨
   - 建議使用中文（因為系統是中文的）

3. **編輯 Body（內容）**：
   - 點擊 **Source** 標籤查看 HTML 源碼
   - 點擊 **Preview** 標籤預覽效果
   - 可以直接編輯 HTML 內容

### 📝 建議的中文化模板

由於系統是中文的，建議將 email 模板改成中文，以提供更好的用戶體驗：

#### 選項 1：簡潔版本（推薦）

**Subject**：
```
重置您的密碼
```

**Body**：
```html
<h2>重置密碼</h2>

<p>請點擊以下連結重置您的密碼：</p>
<p><a href="{{ .ConfirmationURL }}">重置密碼</a></p>

<p>如果連結無法點擊，請複製以下網址到瀏覽器：</p>
<p>{{ .ConfirmationURL }}</p>

<p>此連結將在 1 小時後過期。</p>
```

#### 選項 2：詳細版本

**Subject**：
```
重置您的密碼 - E-scheduling 生產排程系統
```

**Body**：
```html
<h2>重置密碼</h2>

<p>您好，</p>

<p>您已申請重置 E-scheduling 生產排程系統的密碼。請點擊以下連結重置您的密碼：</p>
<p><a href="{{ .ConfirmationURL }}">重置密碼</a></p>

<p>如果連結無法點擊，請複製以下網址到瀏覽器：</p>
<p style="word-break: break-all;">{{ .ConfirmationURL }}</p>

<p><strong>注意事項：</strong></p>
<ul>
  <li>此連結將在 1 小時後過期</li>
  <li>如果您沒有申請重置密碼，請忽略此 email</li>
  <li>請勿將此連結分享給他人</li>
</ul>

<p>謝謝！</p>
<p>E-scheduling 系統團隊</p>
```

### 🔑 重要變數說明

在 Supabase Email 模板中，可以使用以下變數：

- `{{ .ConfirmationURL }}` - **必須使用**：密碼重置連結（這是唯一必須的變數）
- `{{ .Email }}` - 使用者的 email 地址
- `{{ .SiteURL }}` - 網站 URL
- `{{ .Token }}` - 重置 token（通常不需要，因為已包含在 URL 中）
- `{{ .TokenHash }}` - Token 的 hash 值（通常不需要）
- `{{ .RedirectTo }}` - 重定向 URL（通常不需要）

**⚠️ 重要**：`{{ .ConfirmationURL }}` 必須在模板中使用，否則使用者無法重置密碼！

### 📋 配置步驟

1. **登入 Supabase Dashboard**
2. **前往 Authentication > Email Templates**
3. **選擇 "Reset password" 模板**
4. **編輯 Subject**：
   - 輸入：`重置您的密碼`
5. **編輯 Body**：
   - 點擊 **Source** 標籤
   - 複製上面建議的中文化模板內容
   - 貼上並替換現有內容
   - 確保 `{{ .ConfirmationURL }}` 變數存在
6. **預覽**：
   - 點擊 **Preview** 標籤查看效果
   - 確認連結和格式正確
7. **保存**：
   - 點擊 **Save** 按鈕保存更改

### ✅ 測試步驟

1. **發送測試 email**：
   - 前往 `/forgot-password` 頁面
   - 輸入已註冊的 email
   - 點擊「發送重置連結」
   
2. **檢查 email**：
   - 檢查 email 收件匣（包括垃圾郵件資料夾）
   - 確認收到重置 email
   - 確認主旨是中文
   - 確認內容是中文
   - 確認連結可以點擊

3. **測試重置連結**：
   - 點擊 email 中的重置連結
   - 確認導向到 `/reset-password` 頁面
   - 確認可以設置新密碼

### ⚠️ 注意事項

1. **必須使用 `{{ .ConfirmationURL }}`**：
   - 這個變數包含重置連結
   - 如果沒有這個變數，使用者無法重置密碼
   - 可以放在 `<a>` 標籤的 `href` 屬性中

2. **連結過期時間**：
   - 預設為 1 小時
   - 無法在 email 模板中修改
   - 需要在 Supabase Dashboard > Authentication > Settings 中修改

3. **HTML 格式**：
   - 支援 HTML 格式
   - 可以使用基本的 HTML 標籤（`<h2>`, `<p>`, `<a>`, `<ul>`, `<li>` 等）
   - 不支援複雜的 CSS 樣式
   - 建議使用內聯樣式（inline styles）

4. **Email 服務限制**：
   - Supabase 免費方案有每日 email 發送限制
   - 如果需要更高限制，需要配置自訂 SMTP 服務

5. **測試環境**：
   - 在本地開發時，email 可能無法正常發送
   - 建議使用生產環境的 Supabase 實例進行測試

### 🎨 自訂樣式（進階）

如果需要更美觀的 email 設計，可以使用以下 HTML 結構：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; }
    .button:hover { background-color: #0052a3; }
  </style>
</head>
<body>
  <div class="container">
    <h2>重置密碼</h2>
    <p>請點擊以下按鈕重置您的密碼：</p>
    <p><a href="{{ .ConfirmationURL }}" class="button">重置密碼</a></p>
    <p>如果按鈕無法點擊，請複製以下網址到瀏覽器：</p>
    <p style="word-break: break-all; color: #666;">{{ .ConfirmationURL }}</p>
    <p style="color: #999; font-size: 12px;">此連結將在 1 小時後過期。</p>
  </div>
</body>
</html>
```

**注意**：許多 email 客戶端（如 Gmail、Outlook）可能不支援 `<style>` 標籤，建議使用內聯樣式。

### 📚 相關文件

- `docs/PASSWORD_RESET_SETUP.md` - 密碼重置功能設置指南
- `src/app/forgot-password/page.tsx` - 忘記密碼頁面
- `src/app/reset-password/page.tsx` - 重置密碼頁面
