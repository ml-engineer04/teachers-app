#!/usr/bin/env bash
set -e

# ==============================================================================
# SmartTeacherBook — Automated PostgreSQL Database Backup Script
# Features: Compressed pg_dump, 30-day retention pruning, S3 sync
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-/var/backups/smartteacherbook}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/stb_backup_${TIMESTAMP}.sql.gz"

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-smartteacherbook}"
DB_USER="${POSTGRES_USER:-stb_admin}"

mkdir -p "$BACKUP_DIR"

echo "=========================================================="
echo "📦 Starting SmartTeacherBook Database Backup: $TIMESTAMP"
echo "   Target: $BACKUP_FILE"
echo "=========================================================="

# 1. Execute pg_dump with gzip compression
if command -v docker &> /dev/null && docker ps -q -f name=stb_postgres | grep -q .; then
  echo "🐳 Dumping database from running Docker container 'stb_postgres'..."
  docker exec -t stb_postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  echo "🐘 Dumping database via host pg_dump..."
  PGPASSWORD="${POSTGRES_PASSWORD:-stb_secret_pass}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "✅ Database dump completed. Size: $BACKUP_SIZE"

# 2. Upload to AWS S3 if bucket is specified
if [ -n "$AWS_S3_BACKUP_BUCKET" ] && command -v aws &> /dev/null; then
  echo "☁️ Uploading backup to S3: s3://${AWS_S3_BACKUP_BUCKET}/backups/stb_backup_${TIMESTAMP}.sql.gz..."
  aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BACKUP_BUCKET}/backups/stb_backup_${TIMESTAMP}.sql.gz"
  echo "✅ S3 backup sync successful."
fi

# 3. Prune local backups older than 30 days
echo "🧹 Pruning backups older than 30 days..."
find "$BACKUP_DIR" -name "stb_backup_*.sql.gz" -type f -mtime +30 -delete
echo "✅ Pruning completed."

echo "=========================================================="
echo "🎉 Backup operation finished successfully at $(date)!"
echo "=========================================================="
