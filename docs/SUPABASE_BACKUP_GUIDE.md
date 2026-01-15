# Supabase 資料備份指南

## 📋 備份方法總覽

Supabase 提供了多種備份方法，從簡單的手動備份到自動化備份策略。

---

## 🔧 方法 1：使用 Supabase Dashboard（最簡單）

### 步驟 1：登入 Supabase Dashboard
1. 前往 https://supabase.com/dashboard
2. 選擇你的專案

### 步驟 2：進入 Database 頁面
1. 點擊左側選單的 **"Database"**
2. 選擇 **"Backups"** 標籤

### 步驟 3：查看自動備份
- **Pro 方案**：自動每日備份，保留 7 天
- **Free 方案**：可能不提供自動備份，需要手動備份

### 步驟 4：下載備份（如果有）
1. 在 Backups 頁面找到可用的備份
2. 點擊 **"Download"** 下載 SQL 備份檔案

---

## 🔧 方法 2：使用 SQL Editor 導出資料（推薦）

### 步驟 1：導出所有資料表

#### 在 Supabase SQL Editor 中執行：

```sql
-- 導出 schedule_items 表
COPY (SELECT * FROM public.schedule_items) 
TO STDOUT WITH (FORMAT csv, HEADER true);

-- 導出 user_profiles 表
COPY (SELECT * FROM public.user_profiles) 
TO STDOUT WITH (FORMAT csv, HEADER true);

-- 導出 line_configs 表
COPY (SELECT * FROM public.line_configs) 
TO STDOUT WITH (FORMAT csv, HEADER true);

-- 導出 suggested_schedules 表
COPY (SELECT * FROM public.suggested_schedules) 
TO STDOUT WITH (FORMAT csv, HEADER true);
```

### 步驟 2：導出為 SQL 格式（更完整）

```sql
-- 導出 schedule_items 表（包含 CREATE TABLE 語句）
SELECT 
  'CREATE TABLE IF NOT EXISTS public.schedule_items (' ||
  string_agg(column_name || ' ' || data_type, ', ') ||
  ');' AS create_table_sql
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'schedule_items';

-- 然後導出資料
SELECT 
  'INSERT INTO public.schedule_items VALUES (' ||
  string_agg(
    COALESCE('''' || REPLACE(column_value, '''', '''''') || '''', 'NULL'),
    ', '
  ) ||
  ');' AS insert_sql
FROM (
  -- 這裡需要手動替換為實際的欄位值
  SELECT * FROM public.schedule_items
) AS data;
```

---

## 🔧 方法 3：使用 Supabase CLI（推薦用於自動化）

### 步驟 1：安裝 Supabase CLI

```bash
# 使用 npm 安裝
npm install -g supabase

# 或使用 Homebrew (macOS)
brew install supabase/tap/supabase
```

### 步驟 2：登入 Supabase

```bash
supabase login
```

### 步驟 3：連結專案

```bash
supabase link --project-ref your-project-ref
```

### 步驟 4：導出資料庫架構

```bash
# 導出資料庫架構（不含資料）
supabase db dump --schema public -f schema.sql

# 導出資料庫架構和資料
supabase db dump --schema public --data-only -f data.sql

# 導出完整資料庫（架構 + 資料）
supabase db dump --schema public -f full_backup.sql
```

---

## 🔧 方法 4：使用 pg_dump（最靈活）

### 步驟 1：獲取資料庫連線資訊

在 Supabase Dashboard：
1. 前往 **Settings** → **Database**
2. 找到 **"Connection string"** 或 **"Connection pooling"**
3. 複製連線字串（格式：`postgresql://postgres:[password]@[host]:5432/postgres`）

### 步驟 2：安裝 PostgreSQL 客戶端工具

```bash
# Windows (使用 Chocolatey)
choco install postgresql

# macOS (使用 Homebrew)
brew install postgresql

# Linux
sudo apt-get install postgresql-client
```

### 步驟 3：使用 pg_dump 備份

```bash
# 備份整個資料庫（架構 + 資料）
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --schema=public \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql

# 只備份資料（不包含架構）
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --schema=public \
  --data-only \
  --file=data_backup_$(date +%Y%m%d_%H%M%S).sql

# 只備份架構（不包含資料）
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --schema=public \
  --schema-only \
  --file=schema_backup_$(date +%Y%m%d_%H%M%S).sql

# 備份特定表
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" \
  --schema=public \
  --table=schedule_items \
  --table=user_profiles \
  --file=tables_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔧 方法 5：建立自動化備份腳本

### Windows PowerShell 腳本

建立 `backup_supabase.ps1`：

```powershell
# Supabase 資料庫備份腳本
# 使用前請設定環境變數

$SUPABASE_URL = "your-project-ref.supabase.co"
$SUPABASE_DB = "postgres"
$SUPABASE_USER = "postgres"
$SUPABASE_PASSWORD = "your-password"

$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = "backups"
$BACKUP_FILE = "$BACKUP_DIR\backup_$DATE.sql"

# 建立備份目錄
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR
}

# 執行備份
$ENV:PGPASSWORD = $SUPABASE_PASSWORD
pg_dump -h $SUPABASE_URL -U $SUPABASE_USER -d $SUPABASE_DB `
    --schema=public `
    --file=$BACKUP_FILE

Write-Host "✅ 備份完成: $BACKUP_FILE"

# 清理舊備份（保留最近 7 天）
Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.sql" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Remove-Item

Write-Host "✅ 已清理 7 天前的備份"
```

### Linux/macOS Bash 腳本

建立 `backup_supabase.sh`：

```bash
#!/bin/bash

# Supabase 資料庫備份腳本
# 使用前請設定環境變數

SUPABASE_URL="your-project-ref.supabase.co"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
SUPABASE_PASSWORD="your-password"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 執行備份
export PGPASSWORD=$SUPABASE_PASSWORD
pg_dump -h $SUPABASE_URL -U $SUPABASE_USER -d $SUPABASE_DB \
    --schema=public \
    --file=$BACKUP_FILE

echo "✅ 備份完成: $BACKUP_FILE"

# 清理舊備份（保留最近 7 天）
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "✅ 已清理 7 天前的備份"
```

### 使用方式

```bash
# 設定執行權限（Linux/macOS）
chmod +x backup_supabase.sh

# 執行備份
./backup_supabase.sh

# 或使用 Windows PowerShell
.\backup_supabase.ps1
```

---

## 🔧 方法 6：建立備份 SQL 腳本

建立 `backup_data.sql`：

```sql
-- ============================================
-- Supabase 資料備份腳本
-- ============================================
-- 使用方式：在 Supabase SQL Editor 中執行
-- 然後複製結果並保存為檔案
-- ============================================

-- 1. 導出 schedule_items 表
SELECT 
  '-- schedule_items 表資料' AS comment;
  
-- 使用 COPY 導出（推薦，但需要從 Dashboard 下載）
-- 或使用 SELECT 語句生成 INSERT 語句
SELECT 
  'INSERT INTO public.schedule_items VALUES (' ||
  '''' || id || ''', ' ||
  '''' || COALESCE(product_name, '') || ''', ' ||
  '''' || COALESCE(batch_number, '') || ''', ' ||
  COALESCE(quantity::text, 'NULL') || ', ' ||
  '''' || COALESCE(delivery_date, '') || ''', ' ||
  '''' || COALESCE(line_id, '') || ''', ' ||
  '''' || COALESCE(schedule_date::text, '') || ''', ' ||
  COALESCE(start_hour::text, 'NULL') || ', ' ||
  COALESCE(end_hour::text, 'NULL') || ', ' ||
  -- 其他欄位...
  ');' AS insert_sql
FROM public.schedule_items
ORDER BY created_at;

-- 2. 導出 user_profiles 表
SELECT 
  '-- user_profiles 表資料' AS comment;

SELECT 
  'INSERT INTO public.user_profiles VALUES (' ||
  '''' || id || ''', ' ||
  '''' || email || ''', ' ||
  '''' || role || ''', ' ||
  '''' || created_at::text || ''', ' ||
  '''' || updated_at::text || ''');' AS insert_sql
FROM public.user_profiles
ORDER BY created_at;

-- 3. 導出 line_configs 表
SELECT 
  '-- line_configs 表資料' AS comment;

SELECT 
  'INSERT INTO public.line_configs VALUES (' ||
  '''' || id || ''', ' ||
  '''' || line_id || ''', ' ||
  COALESCE(avg_output::text, 'NULL') || ');' AS insert_sql
FROM public.line_configs
ORDER BY line_id;
```

---

## 📅 自動化備份策略

### 使用 Windows Task Scheduler（Windows）

1. 開啟 **Task Scheduler**
2. 建立新任務
3. 設定：
   - **名稱**：Supabase 資料庫備份
   - **觸發條件**：每日 凌晨 2:00
   - **動作**：執行 PowerShell 腳本
   - **腳本路徑**：`D:\Cursor_scheduling\backup_supabase.ps1`

### 使用 cron（Linux/macOS）

```bash
# 編輯 crontab
crontab -e

# 添加每日備份（每天凌晨 2:00）
0 2 * * * /path/to/backup_supabase.sh >> /path/to/backup.log 2>&1
```

---

## 🔄 還原資料

### 還原 SQL 備份

```bash
# 使用 psql 還原
psql "postgresql://postgres:[password]@[host]:5432/postgres" < backup.sql

# 或使用 Supabase CLI
supabase db reset --file backup.sql
```

### 還原 CSV 備份

```sql
-- 在 Supabase SQL Editor 中執行
COPY public.schedule_items 
FROM STDIN WITH (FORMAT csv, HEADER true);
-- 然後貼上 CSV 資料
```

---

## 📊 備份頻率建議

### 小型專案（每日 < 100 筆資料）
- **備份頻率**：每週一次
- **保留期間**：4 週

### 中型專案（每日 100-1000 筆資料）
- **備份頻率**：每日一次
- **保留期間**：2 週

### 大型專案（每日 > 1000 筆資料）
- **備份頻率**：每日多次（例如：每日 2 次）
- **保留期間**：4 週
- **建議**：考慮升級到 Pro 方案（自動備份）

---

## 🎯 最佳實踐

### 1. 多重備份策略
- ✅ 本地備份（硬碟）
- ✅ 雲端備份（Google Drive、Dropbox、OneDrive）
- ✅ 自動備份（每日）

### 2. 備份測試
- ✅ 定期測試備份還原
- ✅ 確認備份檔案完整性

### 3. 備份加密
- ✅ 備份檔案加密（特別是包含敏感資料）
- ✅ 使用密碼保護備份檔案

### 4. 備份監控
- ✅ 監控備份是否成功
- ✅ 設定備份失敗通知

---

## ⚠️ 注意事項

### 1. 密碼安全
- ⚠️ 不要在程式碼中硬編碼密碼
- ⚠️ 使用環境變數儲存密碼
- ⚠️ 不要將包含密碼的備份檔案提交到 Git

### 2. 備份檔案大小
- ⚠️ 大型資料庫備份可能需要較長時間
- ⚠️ 考慮使用壓縮（例如：`.sql.gz`）

### 3. 網路連線
- ⚠️ 確保網路連線穩定
- ⚠️ 大型備份可能因為網路問題中斷

---

## 📝 快速備份命令（當前專案）

### 導出所有表

```bash
# 設定環境變數（替換為實際值）
export SUPABASE_URL="your-project-ref.supabase.co"
export SUPABASE_PASSWORD="your-password"

# 執行備份
pg_dump "postgresql://postgres:$SUPABASE_PASSWORD@$SUPABASE_URL:5432/postgres" \
  --schema=public \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔒 備份安全建議

1. **備份檔案加密**：
   ```bash
   # 使用 gpg 加密備份檔案
   gpg -c backup.sql
   ```

2. **備份檔案權限**：
   ```bash
   # Linux/macOS：限制備份檔案權限
   chmod 600 backup.sql
   ```

3. **備份檔案位置**：
   - ✅ 不要將備份檔案放在公開目錄
   - ✅ 不要將備份檔案提交到 Git
   - ✅ 將備份檔案加入 `.gitignore`

---

## 📚 相關文件

- [Supabase 官方文檔 - Backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump 文檔](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Supabase CLI 文檔](https://supabase.com/docs/reference/cli)

---

## ✅ 檢查清單

- [ ] 確認備份方法適合你的需求
- [ ] 設定自動化備份腳本
- [ ] 測試備份還原流程
- [ ] 將備份檔案加入 `.gitignore`
- [ ] 設定備份監控和通知
- [ ] 定期檢查備份檔案完整性
