#!/bin/bash

# Supabase 資料庫備份腳本 (Bash)
# 使用前請在 .env.local 中設定環境變數或修改以下變數

set -e  # 遇到錯誤立即退出

# 預設值
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_PASSWORD="${SUPABASE_PASSWORD:-}"
SUPABASE_USER="${SUPABASE_USER:-postgres}"
SUPABASE_DB="${SUPABASE_DB:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

# 檢查必要參數
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PASSWORD" ]; then
    echo "❌ 錯誤：請提供 Supabase URL 和密碼" >&2
    echo "使用方法：" >&2
    echo "  export SUPABASE_URL='your-project.supabase.co'" >&2
    echo "  export SUPABASE_PASSWORD='your-password'" >&2
    echo "  ./scripts/backup_supabase.sh" >&2
    exit 1
fi

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

# 生成備份檔案名稱
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

echo "🔄 開始備份 Supabase 資料庫..."
echo "   專案 URL: $SUPABASE_URL"
echo "   備份檔案: $BACKUP_FILE"

# 設定環境變數（pg_dump 會讀取）
export PGPASSWORD="$SUPABASE_PASSWORD"

# 執行備份
if ! command -v pg_dump &> /dev/null; then
    echo "❌ 錯誤：找不到 pg_dump 命令" >&2
    echo "請安裝 PostgreSQL 客戶端工具：" >&2
    echo "  brew install postgresql   # macOS" >&2
    echo "  sudo apt-get install postgresql-client   # Linux" >&2
    exit 1
fi

if pg_dump -h "$SUPABASE_URL" \
    -U "$SUPABASE_USER" \
    -d "$SUPABASE_DB" \
    --schema=public \
    --no-owner \
    --no-acl \
    --file="$BACKUP_FILE" 2>&1; then
    
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 備份完成: $BACKUP_FILE"
    echo "   檔案大小: $FILE_SIZE"
    
    # 嘗試壓縮（如果 gzip 可用）
    if command -v gzip &> /dev/null; then
        gzip -f "$BACKUP_FILE"
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        echo "✅ 已壓縮: $COMPRESSED_FILE"
        echo "   壓縮後大小: $COMPRESSED_SIZE"
    fi
else
    echo "❌ 備份失敗" >&2
    exit 1
fi

# 清理舊備份（保留最近 7 天）
echo "🗑️  清理 7 天前的備份..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql*" -mtime +7)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | xargs rm -f
    CLEANED_COUNT=$(echo "$OLD_BACKUPS" | wc -l)
    echo "✅ 已清理 $CLEANED_COUNT 個舊備份"
else
    echo "✅ 沒有需要清理的舊備份"
fi

echo ""
echo "📊 當前備份檔案："
ls -lh "$BACKUP_DIR"/backup_*.sql* 2>/dev/null | tail -5 | while read -r line; do
    echo "   $line"
done

echo ""
echo "✅ 備份流程完成！"

# 清除環境變數中的密碼
unset PGPASSWORD
