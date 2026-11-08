#!/usr/bin/env bash
set -e

# ==============================================================================
# SmartTeacherBook — Database Disaster Recovery Restore Script
# Usage: ./restore-database.sh /path/to/stb_backup_20260101_120000.sql.gz
# ==============================================================================

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Please specify a valid backup file (.sql.gz) to restore."
  echo "Usage: $0 <path_to_backup_file.sql.gz>"
  exit 1
fi

DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-smartteacherbook}"
DB_USER="${POSTGRES_USER:-stb_admin}"

echo "=========================================================="
echo "⚠️  DATABASE RESTORE INITIATED"
echo "   Source File: $BACKUP_FILE"
echo "   Target DB:   $DB_NAME on $DB_HOST:$DB_PORT"
echo "=========================================================="
read -p "Are you sure you want to overwrite database '$DB_NAME'? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

echo "🔄 Restoring database..."
if command -v docker &> /dev/null && docker ps -q -f name=stb_postgres | grep -q .; then
  echo "🐳 Restoring into Docker container 'stb_postgres'..."
  gunzip -c "$BACKUP_FILE" | docker exec -i stb_postgres psql -U "$DB_USER" -d "$DB_NAME"
else
  echo "🐘 Restoring via host psql..."
  PGPASSWORD="${POSTGRES_PASSWORD:-stb_secret_pass}" gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
fi

echo "=========================================================="
echo "✅ Database restore completed successfully!"
echo "=========================================================="
