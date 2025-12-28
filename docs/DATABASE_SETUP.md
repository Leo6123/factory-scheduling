# 資料庫設定指南

本系統支援使用 Supabase 作為後端資料庫，實現資料持久化儲存。

## 📋 目錄

1. [Supabase 設定步驟](#supabase-設定步驟)
2. [環境變數設定](#環境變數設定)
3. [資料庫 Schema 建立](#資料庫-schema-建立)
4. [備用方案 (localStorage)](#備用方案-localstorage)
5. [資料同步機制](#資料同步機制)

## 🚀 Supabase 設定步驟

### 1. 建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com/)
2. 註冊/登入帳號
3. 點擊 "New Project" 建立新專案
4. 填寫專案資訊：
   - **Name**: 專案名稱（例如：factory-scheduling）
   - **Database Password**: 設定資料庫密碼（請妥善保存）
   - **Region**: 選擇最接近的區域
5. 等待專案建立完成（約 2-3 分鐘）

### 2. 取得 API 憑證

1. 進入專案後，點擊左側選單的 **Settings** → **API**
2. 複製以下資訊：
   - **Project URL** → 對應 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → 對應 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. 建立資料庫表格

1. 點擊左側選單的 **SQL Editor**
2. 點擊 **New Query**
3. 複製 `supabase/schema.sql` 檔案內容
4. 貼上到 SQL Editor
5. 點擊 **Run** 執行 SQL

### 4. 設定 Row Level Security (RLS)

系統已自動建立允許所有操作的 RLS 政策。**生產環境請根據需求調整安全性設定**。

## 🔧 環境變數設定

### 開發環境

1. 複製 `.env.example` 為 `.env.local`：
```bash
cp .env.example .env.local
```

2. 編輯 `.env.local`，填入 Supabase 憑證：
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. 重新啟動開發伺服器：
```bash
npm run dev
```

### 生產環境

在部署平台（Vercel、Netlify 等）設定環境變數：

1. 進入專案設定
2. 找到 "Environment Variables" 或 "環境變數"
3. 新增以下變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📊 資料庫 Schema 建立

系統會自動建立以下表格：

### `schedule_items` - 排程項目

儲存所有排程資料，包括：
- 基本資訊（產品名稱、批號、數量等）
- 排程資訊（日期、時間、產線）
- 特殊標記（結晶、CCD、異常等）

### `line_configs` - 產線設定

儲存各產線的產能設定。

## 💾 備用方案 (localStorage)

如果未設定 Supabase 環境變數，系統會自動使用瀏覽器的 `localStorage` 作為備用方案：

- ✅ **優點**：無需設定，立即可用
- ❌ **缺點**：
  - 資料僅存在單一瀏覽器
  - 清除瀏覽器資料會遺失
  - 無法跨裝置同步

## 🔄 資料同步機制

### 自動儲存

- 所有資料變更會**自動儲存**到資料庫
- 儲存過程為**非同步**，不會阻塞 UI
- 同時會備份到 `localStorage`

### 自動載入

- 應用程式啟動時自動從資料庫載入資料
- 如果資料庫為空，會使用 `initialItems`（模擬資料）

### 資料流程

```
使用者操作
    ↓
更新本地狀態 (localItems) → UI 即時更新
    ↓
非同步儲存到 Supabase
    ↓
同時備份到 localStorage
```

## 🔒 安全性建議

### 開發階段

目前 RLS 政策允許所有操作，適合開發測試。

### 生產環境

建議調整 RLS 政策：

1. **身份驗證**：整合 Supabase Auth
2. **權限控制**：根據使用者角色限制操作
3. **資料驗證**：在資料庫層面加入更多約束

範例 RLS 政策（需要身份驗證）：

```sql
-- 只允許已登入使用者操作
CREATE POLICY "Authenticated users only"
  ON schedule_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## 🐛 疑難排解

### 資料未儲存

1. 檢查瀏覽器 Console 是否有錯誤訊息
2. 確認環境變數設定正確
3. 檢查 Supabase 專案狀態是否正常
4. 查看 Supabase Dashboard → Logs 是否有錯誤

### 資料未載入

1. 確認資料庫表格已建立
2. 檢查 Supabase Dashboard → Table Editor 是否有資料
3. 查看瀏覽器 Console 的錯誤訊息

### 連線問題

1. 確認 `NEXT_PUBLIC_SUPABASE_URL` 格式正確
2. 檢查網路連線
3. 確認 Supabase 專案未暫停

## 📚 相關檔案

- `src/lib/supabase.ts` - Supabase 客戶端設定
- `src/hooks/useScheduleData.ts` - 資料同步 Hook
- `supabase/schema.sql` - 資料庫 Schema
- `.env.example` - 環境變數範例

## 🆘 需要協助？

如有問題，請檢查：
1. Supabase 官方文件：https://supabase.com/docs
2. 專案 GitHub Issues
3. 聯絡開發團隊

