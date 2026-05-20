#!/usr/bin/env bash
set -euo pipefail

# Daily backup script for AI Strategic Academy
# Prerequisites: pg_dump, aws CLI, configured environment variables

BACKUP_DIR="/var/backups/academy"
DATE=$(date +%F)
TIMESTAMP=$(date +%F_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

DATABASE_URL="${DATABASE_URL:?DATABASE_URL not set}"

pg_dump "$DATABASE_URL" \
  --no-owner \
  --compress=9 \
  --file="$BACKUP_DIR/academy-db-$TIMESTAMP.sql.gz"

echo "[$(date)] Database backup saved: academy-db-$TIMESTAMP.sql.gz"

# Rotate old backups
find "$BACKUP_DIR" -name "academy-db-*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup complete. Retaining last $RETENTION_DAYS days."

# Optionally sync to remote S3
if [[ -n "${S3_BACKUP_BUCKET:-}" ]]; then
  aws s3 cp "$BACKUP_DIR/academy-db-$TIMESTAMP.sql.gz" \
    "s3://$S3_BACKUP_BUCKET/db/$DATE/academy-db-$TIMESTAMP.sql.gz" \
    --endpoint-url "${S3_ENDPOINT:-}"
  echo "[$(date)] Synced to S3: s3://$S3_BACKUP_BUCKET/db/$DATE/"
fi
