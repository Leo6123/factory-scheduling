# Supabase 資料庫備份腳本 (PowerShell)
# 使用前請在 .env.local 中設定環境變數或修改以下變數

param(
    [string]$SupabaseUrl = "",
    [string]$SupabasePassword = "",
    [string]$SupabaseUser = "postgres",
    [string]$SupabaseDb = "postgres",
    [string]$BackupDir = "backups"
)

# 從環境變數獲取設定（如果未提供參數）
if (-not $SupabaseUrl) {
    $SupabaseUrl = $env:SUPABASE_URL
}
if (-not $SupabasePassword) {
    $SupabasePassword = $env:SUPABASE_PASSWORD
}

# 檢查必要參數
if (-not $SupabaseUrl -or -not $SupabasePassword) {
    Write-Host "❌ 錯誤：請提供 Supabase URL 和密碼" -ForegroundColor Red
    Write-Host "使用方法：" -ForegroundColor Yellow
    Write-Host "  .\scripts\backup_supabase.ps1 -SupabaseUrl 'your-project.supabase.co' -SupabasePassword 'your-password'" -ForegroundColor Yellow
    Write-Host "或設定環境變數：" -ForegroundColor Yellow
    Write-Host "  \$env:SUPABASE_URL = 'your-project.supabase.co'" -ForegroundColor Yellow
    Write-Host "  \$env:SUPABASE_PASSWORD = 'your-password'" -ForegroundColor Yellow
    exit 1
}

# 建立備份目錄
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "✅ 已建立備份目錄: $BackupDir" -ForegroundColor Green
}

# 生成備份檔案名稱
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "backup_$Date.sql"
$CompressedFile = "$BackupFile.gz"

Write-Host "🔄 開始備份 Supabase 資料庫..." -ForegroundColor Cyan
Write-Host "   專案 URL: $SupabaseUrl" -ForegroundColor Gray
Write-Host "   備份檔案: $BackupFile" -ForegroundColor Gray

# 設定環境變數（pg_dump 會讀取）
$env:PGPASSWORD = $SupabasePassword

# 執行備份
try {
    # 檢查 pg_dump 是否可用
    $pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
    if (-not $pgDumpPath) {
        Write-Host "❌ 錯誤：找不到 pg_dump 命令" -ForegroundColor Red
        Write-Host "請安裝 PostgreSQL 客戶端工具：" -ForegroundColor Yellow
        Write-Host "  choco install postgresql  # Windows" -ForegroundColor Yellow
        Write-Host "  brew install postgresql   # macOS" -ForegroundColor Yellow
        exit 1
    }

    # 執行 pg_dump
    pg_dump -h $SupabaseUrl `
        -U $SupabaseUser `
        -d $SupabaseDb `
        --schema=public `
        --no-owner `
        --no-acl `
        --file=$BackupFile 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "✅ 備份完成: $BackupFile" -ForegroundColor Green
        Write-Host "   檔案大小: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Gray

        # 嘗試壓縮（如果 gzip 可用）
        $gzipPath = Get-Command gzip -ErrorAction SilentlyContinue
        if ($gzipPath) {
            gzip -f $BackupFile
            $CompressedSize = (Get-Item $CompressedFile).Length / 1MB
            Write-Host "✅ 已壓縮: $CompressedFile" -ForegroundColor Green
            Write-Host "   壓縮後大小: $([math]::Round($CompressedSize, 2)) MB" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ 備份失敗（錯誤代碼: $LASTEXITCODE）" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 備份異常: $_" -ForegroundColor Red
    exit 1
} finally {
    # 清除環境變數中的密碼
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# 清理舊備份（保留最近 7 天）
Write-Host "🗑️  清理 7 天前的備份..." -ForegroundColor Cyan
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "backup_*.sql*" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }

if ($OldBackups.Count -gt 0) {
    $OldBackups | Remove-Item
    Write-Host "✅ 已清理 $($OldBackups.Count) 個舊備份" -ForegroundColor Green
} else {
    Write-Host "✅ 沒有需要清理的舊備份" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 當前備份檔案：" -ForegroundColor Cyan
Get-ChildItem -Path $BackupDir -Filter "backup_*.sql*" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5 |
    ForEach-Object {
        $Size = $_.Length / 1MB
        Write-Host "   $($_.Name) - $([math]::Round($Size, 2)) MB - $($_.LastWriteTime)" -ForegroundColor Gray
    }

Write-Host ""
Write-Host "✅ 備份流程完成！" -ForegroundColor Green
