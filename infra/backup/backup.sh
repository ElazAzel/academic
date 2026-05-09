#!/bin/bash
set -eo pipefail

# Configuration
# Requires BACKUP_DIR, DB_URL, and optionally ENCRYPTION_PASSPHRASE
BACKUP_DIR="${BACKUP_DIR:-/var/backups/academy-postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/academy_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "[$(date -u)] Starting database backup..."

if [ -z "$DB_URL" ]; then
    echo "ERROR: DB_URL environment variable is not set."
    exit 1
fi

# Dump database and compress
pg_dump "$DB_URL" -O -c | gzip > "$BACKUP_FILE"

# Optional: Encrypt backup if passphrase is provided
if [ -n "$ENCRYPTION_PASSPHRASE" ]; then
    echo "[$(date -u)] Encrypting backup..."
    gpg --batch --yes --passphrase "$ENCRYPTION_PASSPHRASE" -c "$BACKUP_FILE"
    rm "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gpg"
fi

echo "[$(date -u)] Backup completed successfully: $BACKUP_FILE"

# Clean up old backups
echo "[$(date -u)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "academy_db_*.sql.gz*" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date -u)] Backup process finished."
