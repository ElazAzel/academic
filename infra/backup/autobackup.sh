#!/bin/bash
# Automated backup script for AI Strategic Academy
# Usage: ./autobackup.sh [db_url] [backup_dir]
# Can be run as cron job: 0 3 * * * /path/to/autobackup.sh

set -euo pipefail

DB_URL="${1:-${DATABASE_URL:-}}"
BACKUP_DIR="${2:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
LOG_FILE="$BACKUP_DIR/backup.log"

if [ -z "$DB_URL" ]; then
  echo "[ERROR] DATABASE_URL not set. Usage: $0 <db_url> [backup_dir]"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Starting backup..."

# Full dump (custom format, compressed)
DUMP_FILE="$BACKUP_DIR/academy_$TIMESTAMP.dump"
pg_dump "$DB_URL" --format=custom --compress=9 --file="$DUMP_FILE"

# Verify
if [ -f "$DUMP_FILE" ] && [ -s "$DUMP_FILE" ]; then
  log "Backup created: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
else
  log "ERROR: Backup file is empty or missing!"
  exit 2
fi

# Remove old backups
find "$BACKUP_DIR" -name "academy_*.dump" -mtime +$RETENTION_DAYS -delete
log "Cleaned backups older than $RETENTION_DAYS days"

# Log latest backup
echo "$TIMESTAMP" > "$BACKUP_DIR/latest.txt"

log "Backup completed successfully"
