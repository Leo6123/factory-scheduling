# 工廠排程系統 APS

生產排程視覺化管理系統，支援 11 條產線的排程管理。

## 功能特色

- 📅 **月曆排程視圖**：直觀的月曆和時間軸視圖
- 📊 **卡片拖曳排程**：拖曳卡片到時間軸進行排程
- 📈 **產能計算**：自動計算月產能、月排程、當日產能
- 🔍 **批號查詢**：快速查詢批號的排程日期
- 📥 **Excel 匯入/匯出**：支援匯入訂單和匯出排程
- 🎨 **產品顏色分類**：根據 Material Number 自動分類顏色
- 💎 **結晶流程標記**：標記需要結晶的產品
- 🔍 **CCD 色選標記**：標記需要 CCD 色選的產品
- 🔄 **Dryblending 標記**：標記需要 Dryblending 的產品
- 📦 **Package 標記**：標記需要 Package 的產品
- ⚠️ **異常未完成標記**：標記異常未完成的產品
- 🗑️ **垃圾桶功能**：拖曳卡片到垃圾桶刪除
- 🔄 **Undo 功能**：回到上一步操作
- ☁️ **Supabase 資料同步**：自動同步排程資料到 Supabase
- 📊 **Google Sheets QC 連動**：自動同步 QC 狀態（QC中、QC完成、NG）

## 技術棧

- **框架**：Next.js 14
- **語言**：TypeScript
- **樣式**：Tailwind CSS
- **拖曳功能**：@dnd-kit
- **資料庫**：Supabase
- **Excel 處理**：xlsx
- **Google Sheets API**：Google Sheets API v4

## 環境變數設定

在 `.env.local` 檔案中設定以下環境變數：

```env
# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Sheets 設定
NEXT_PUBLIC_GOOGLE_SHEET_ID=your_google_sheet_id
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key (可選，如果 Sheet 是公開的則不需要)
```

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置生產版本
npm run build

# 啟動生產伺服器
npm start
```

## 部署到 Vercel

### 方法一：透過 Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 部署
vercel

# 生產環境部署
vercel --prod
```

### 方法二：透過 GitHub 自動部署

1. 將專案推送到 GitHub
2. 在 [Vercel Dashboard](https://vercel.com/dashboard) 中點擊 "Add New Project"
3. 選擇你的 GitHub 倉庫
4. 設定環境變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_SHEET_ID`
   - `NEXT_PUBLIC_GOOGLE_API_KEY` (可選)
5. 點擊 "Deploy"

### 環境變數設定

在 Vercel Dashboard 中：
1. 進入專案設定
2. 點擊 "Environment Variables"
3. 新增以下變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_SHEET_ID`
   - `NEXT_PUBLIC_GOOGLE_API_KEY` (可選)

## 資料庫設定

請參考 `docs/SUPABASE_SETUP_STEPS.md` 進行 Supabase 資料庫設定。

## Google Sheets 設定

請參考 `docs/GOOGLE_SHEETS_SETUP.md` 進行 Google Sheets 設定。

## 專案結構

```
src/
├── app/              # Next.js App Router
├── components/       # React 元件
├── hooks/           # Custom Hooks
├── lib/             # 工具函數
├── types/           # TypeScript 類型定義
├── utils/           # 工具函數
└── constants/       # 常數定義
```

## 授權

私有專案

