# Supabase 備份還原指南

## ✅ 確認：可以完全還原

**是的，如果 Supabase 資料不見或誤刪，可以還原備份後，重新在 Web APP 上重現！**

---

## 🔄 還原流程

### 步驟 1：準備備份檔案

確保你有備份檔案：
- 格式：`backup_YYYYMMDD_HHMMSS.sql`
- 位置：`backups/` 目錄或你保存的位置

### 步驟 2：還原到 Supabase

#### 方法 1：使用 Supabase SQL Editor（最簡單）

1. **登入 Supabase Dashboard**
   - 前往 https://supabase.com/dashboard
   - 選擇你的專案

2. **開啟 SQL Editor**
   - 點擊左側選單的 **"SQL Editor"**
   - 點擊 **"New query"**

3. **執行還原**
   - 打開備份檔案（`.sql`）
   - 複製全部內容
   - 貼上到 SQL Editor
   - 點擊 **"Run"** 執行

4. **確認還原成功**
   - 檢查是否有錯誤訊息
   - 查看資料表是否有資料

#### 方法 2：使用 psql 命令列（推薦）

```bash
# 設定環境變數
export SUPABASE_URL="your-project-ref.supabase.co"
export SUPABASE_PASSWORD="your-password"
export PGPASSWORD=$SUPABASE_PASSWORD

# 還原備份
psql "postgresql://postgres:$SUPABASE_PASSWORD@$SUPABASE_URL:5432/postgres" \
  < backup_20250111_143022.sql
```

#### 方法 3：使用 Supabase CLI

```bash
# 連結專案
supabase link --project-ref your-project-ref

# 還原備份
supabase db reset --file backup_20250111_143022.sql
```

---

## 🌐 還原後 Web APP 自動顯示

### 自動同步機制

還原後，Web APP 會自動顯示資料，因為：

1. **資料庫已更新**
   - 備份還原後，Supabase 資料庫已包含所有資料

2. **Web APP 自動載入**
   - 打開 Web APP 時，會自動從 Supabase 載入資料
   - 使用 `useScheduleData` Hook 自動載入

3. **Realtime 同步**
   - 如果有多個用戶，Realtime 會自動同步更新
   - 所有用戶都會看到還原後的資料

### 驗證步驟

1. **還原備份到 Supabase**
2. **打開 Web APP**
3. **檢查資料是否顯示**
   - 排程項目應該會自動顯示
   - 不需要手動刷新（但建議刷新一次確保同步）

---

## ⚠️ 注意事項

### 1. 還原會覆蓋現有資料

**重要**：還原備份會**覆蓋**當前資料庫中的所有資料！

**建議**：
- 還原前先備份當前資料（以防萬一）
- 確認要還原的備份檔案是正確的版本

### 2. 部分還原（只還原特定表）

如果只想還原特定表（例如：只還原 `schedule_items`）：

```sql
-- 在 Supabase SQL Editor 中執行

-- 1. 先刪除舊資料（可選）
DELETE FROM public.schedule_items;

-- 2. 從備份檔案中找到該表的 COPY 語句
-- 3. 複製並執行該表的資料部分
```

### 3. 還原時間

- **小資料量**（< 1,000 筆）：幾秒鐘
- **中資料量**（1,000-10,000 筆）：幾分鐘
- **大資料量**（> 10,000 筆）：可能需要更長時間

---

## 🔧 還原腳本（自動化）

### Windows PowerShell

建立 `scripts/restore_supabase.ps1`：

```powershell
# Supabase 資料庫還原腳本

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$SupabaseUrl = "",
    [string]$SupabasePassword = ""
)

# 從環境變數獲取設定
if (-not $SupabaseUrl) {
    $SupabaseUrl = $env:SUPABASE_URL
}
if (-not $SupabasePassword) {
    $SupabasePassword = $env:SUPABASE_PASSWORD
}

# 檢查備份檔案是否存在
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ 錯誤：找不到備份檔案: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 開始還原備份..." -ForegroundColor Cyan
Write-Host "   備份檔案: $BackupFile" -ForegroundColor Gray
Write-Host "   專案 URL: $SupabaseUrl" -ForegroundColor Gray

# 設定環境變數
$env:PGPASSWORD = $SupabasePassword

# 執行還原
try {
    psql "postgresql://postgres:$SupabasePassword@$SupabaseUrl:5432/postgres" `
        -f $BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 還原成功！" -ForegroundColor Green
        Write-Host "💡 請重新整理 Web APP 查看資料" -ForegroundColor Yellow
    } else {
        Write-Host "❌ 還原失敗（錯誤代碼: $LASTEXITCODE）" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 還原異常: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
```

### Linux/macOS Bash

建立 `scripts/restore_supabase.sh`：

```bash
#!/bin/bash

# Supabase 資料庫還原腳本

set -e

BACKUP_FILE="$1"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_PASSWORD="${SUPABASE_PASSWORD:-}"

# 檢查參數
if [ -z "$BACKUP_FILE" ]; then
    echo "❌ 錯誤：請提供備份檔案路徑" >&2
    echo "使用方法: ./scripts/restore_supabase.sh <備份檔案>" >&2
    exit 1
fi

# 檢查備份檔案是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 錯誤：找不到備份檔案: $BACKUP_FILE" >&2
    exit 1
fi

echo "🔄 開始還原備份..."
echo "   備份檔案: $BACKUP_FILE"
echo "   專案 URL: $SUPABASE_URL"

# 設定環境變數
export PGPASSWORD="$SUPABASE_PASSWORD"

# 執行還原
psql "postgresql://postgres:$SUPABASE_PASSWORD@$SUPABASE_URL:5432/postgres" \
    -f "$BACKUP_FILE"

echo "✅ 還原成功！"
echo "💡 請重新整理 Web APP 查看資料"

# 清除環境變數
unset PGPASSWORD
```

---

## 📋 完整還原流程範例

### 情境：資料誤刪，需要還原

#### 步驟 1：確認備份檔案

```bash
# 查看可用的備份檔案
ls -lh backups/backup_*.sql

# 選擇最新的備份
BACKUP_FILE="backups/backup_20250111_143022.sql"
```

#### 步驟 2：還原備份

**方法 A：使用 SQL Editor（推薦新手）**

1. 打開 Supabase Dashboard → SQL Editor
2. 打開備份檔案，複製全部內容
3. 貼上到 SQL Editor
4. 點擊 "Run" 執行

**方法 B：使用命令列（推薦進階用戶）**

```bash
# Windows
.\scripts\restore_supabase.ps1 -BackupFile "backups/backup_20250111_143022.sql"

# Linux/macOS
./scripts/restore_supabase.sh backups/backup_20250111_143022.sql
```

#### 步驟 3：驗證還原

1. **在 Supabase Dashboard 檢查**
   - 前往 Database → Tables
   - 查看 `schedule_items` 表是否有資料
   - 確認資料筆數是否正確

2. **在 Web APP 檢查**
   - 打開 Web APP
   - 重新整理頁面（F5）
   - 確認排程資料是否顯示
   - 確認所有功能正常

---

## 🔍 還原後驗證清單

- [ ] 資料表結構正確（欄位都存在）
- [ ] 資料筆數正確（與備份時一致）
- [ ] Web APP 可以正常載入資料
- [ ] 排程項目顯示正確
- [ ] 用戶資料正確
- [ ] 產線設定正確
- [ ] 所有功能正常運作

---

## ⚠️ 常見問題

### Q1: 還原後 Web APP 沒有顯示資料？

**可能原因**：
1. 還原未完成（檢查 SQL Editor 是否有錯誤）
2. 快取問題（清除瀏覽器快取或重新整理）
3. Realtime 未同步（等待幾秒或重新整理）

**解決方法**：
1. 檢查 Supabase Dashboard → Database → Tables 確認資料存在
2. 清除瀏覽器快取（Ctrl+Shift+Delete）
3. 強制重新整理（Ctrl+F5）
4. 檢查 Console 是否有錯誤訊息

### Q2: 還原時出現錯誤？

**可能原因**：
1. 備份檔案格式錯誤
2. 資料表結構已變更
3. 權限不足

**解決方法**：
1. 確認備份檔案是完整的 SQL 檔案
2. 檢查資料表結構是否與備份時一致
3. 確認有足夠的權限執行還原

### Q3: 可以只還原部分資料嗎？

**可以**，有兩種方法：

**方法 1：手動選擇還原**
- 從備份檔案中找到特定表的 COPY 語句
- 只執行該表的還原

**方法 2：先刪除再還原**
```sql
-- 只還原 schedule_items 表
DELETE FROM public.schedule_items;
-- 然後從備份檔案中複製該表的資料部分執行
```

---

## 🎯 最佳實踐

### 1. 定期備份
- ✅ 每日自動備份
- ✅ 重要操作前手動備份

### 2. 備份測試
- ✅ 定期測試備份還原流程
- ✅ 確認備份檔案完整性

### 3. 多重備份
- ✅ 本地備份（硬碟）
- ✅ 雲端備份（Google Drive、Dropbox）
- ✅ 自動備份（每日）

### 4. 還原前確認
- ✅ 確認要還原的備份檔案版本
- ✅ 還原前先備份當前資料（以防萬一）
- ✅ 在測試環境先測試還原

---

## 📝 總結

### ✅ 確認答案

**是的，如果 Supabase 資料不見或誤刪，可以還原備份後，重新在 Web APP 上重現！**

### 還原流程

1. **還原備份到 Supabase**（使用 SQL Editor 或命令列）
2. **Web APP 自動載入**（打開 Web APP 時自動從 Supabase 載入）
3. **資料自動顯示**（所有排程資料會自動顯示）

### 注意事項

- ⚠️ 還原會覆蓋現有資料
- ⚠️ 還原前建議先備份當前資料
- ⚠️ 還原後建議重新整理 Web APP

---

## 🔧 快速還原命令

```bash
# 設定環境變數
export SUPABASE_URL="your-project-ref.supabase.co"
export SUPABASE_PASSWORD="your-password"
export PGPASSWORD=$SUPABASE_PASSWORD

# 還原備份
psql "postgresql://postgres:$SUPABASE_PASSWORD@$SUPABASE_URL:5432/postgres" \
  < backups/backup_20250111_143022.sql

# 清除環境變數
unset PGPASSWORD
```

---

## 📚 相關文件

- `docs/SUPABASE_BACKUP_GUIDE.md` - 備份指南
- `docs/BACKUP_FILE_FORMAT.md` - 備份檔案格式說明
- `scripts/backup_supabase.ps1` - 備份腳本
- `scripts/backup_supabase.sh` - 備份腳本
