# Vercel 部署指南

## 前置準備

1. **確保專案可以正常建置**
   ```bash
   npm run build
   ```

2. **準備環境變數**
   - Supabase URL 和 Anon Key
   - Google Sheet ID
   - Google API Key (可選)

## 部署步驟

### 方法一：使用 Vercel CLI（推薦）

1. **安裝 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登入 Vercel**
   ```bash
   vercel login
   ```

3. **部署專案**
   ```bash
   # 在專案根目錄執行
   vercel
   ```
   
   第一次部署會詢問：
   - Set up and deploy? → Yes
   - Which scope? → 選擇你的帳號
   - Link to existing project? → No (第一次)
   - Project name? → factory-scheduling (或自訂名稱)
   - Directory? → ./
   - Override settings? → No

4. **設定環境變數**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXT_PUBLIC_GOOGLE_SHEET_ID
   vercel env add NEXT_PUBLIC_GOOGLE_API_KEY
   ```

5. **重新部署以套用環境變數**
   ```bash
   vercel --prod
   ```

### 方法二：使用 Vercel Dashboard（圖形介面）

1. **推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **在 Vercel 中建立專案**
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 點擊 "Add New Project"
   - 選擇你的 GitHub 倉庫
   - 點擊 "Import"

3. **設定專案**
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **設定環境變數**
   - 在專案設定中點擊 "Environment Variables"
   - 新增以下變數：
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     NEXT_PUBLIC_GOOGLE_SHEET_ID=your_google_sheet_id
     NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key (可選)
     ```
   - 選擇環境：Production, Preview, Development

5. **部署**
   - 點擊 "Deploy"
   - 等待建置完成

## 部署後檢查

1. **檢查建置日誌**
   - 在 Vercel Dashboard 中查看建置日誌
   - 確認沒有錯誤

2. **測試功能**
   - 開啟部署的網站
   - 測試匯入 Excel
   - 測試排程功能
   - 測試 QC 狀態同步

3. **檢查環境變數**
   - 確認環境變數已正確設定
   - 可以在瀏覽器 Console 中檢查

## 常見問題

### 建置失敗

1. **檢查 Node.js 版本**
   - Vercel 預設使用 Node.js 18.x
   - 可以在 `package.json` 中指定：
     ```json
     "engines": {
       "node": ">=18.0.0"
     }
     ```

2. **檢查依賴**
   - 確認所有依賴都已安裝
   - 檢查 `package.json` 中的依賴版本

### 環境變數未生效

1. **確認變數名稱**
   - 必須以 `NEXT_PUBLIC_` 開頭才能在客戶端使用

2. **重新部署**
   - 修改環境變數後需要重新部署

### Google Sheets API 403 錯誤

1. **檢查 Google Sheet 權限**
   - 確認 Sheet 是公開的，或
   - 確認已設定正確的 API Key

2. **檢查 API Key 權限**
   - 確認 API Key 有 Google Sheets API 權限

## 更新部署

### 使用 Vercel CLI
```bash
vercel --prod
```

### 使用 GitHub
- 推送新的 commit 到 main 分支
- Vercel 會自動觸發部署

## 監控和日誌

- 在 Vercel Dashboard 中查看：
  - 部署歷史
  - 建置日誌
  - 函數日誌
  - 分析數據

## 自訂網域

1. 在 Vercel Dashboard 中點擊專案
2. 進入 "Settings" → "Domains"
3. 新增你的網域
4. 按照指示設定 DNS 記錄

