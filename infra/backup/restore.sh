#!/bin/bash
set -eo pipefail

# Usage: ./restore.sh <backup_file> <target_db_url>

BACKUP_FILE=$1
DB_URL=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$DB_URL" ]; then
    echo "Usage: ./restore.sh <backup_file> <target_db_url>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

echo "[$(date -u)] Starting database restoration from $BACKUP_FILE..."

# Check if the file is encrypted
if [[ "$BACKUP_FILE" == *.gpg ]]; then
    if [ -z "$ENCRYPTION_PASSPHRASE" ]; then
        echo "ERROR: ENCRYPTION_PASSPHRASE is required for encrypted backups."
        exit 1
    fi
    echo "[$(date -u)] Decrypting and restoring backup..."
    gpg --batch --yes --passphrase "$ENCRYPTION_PASSPHRASE" -d "$BACKUP_FILE" | zcat | psql "$DB_URL"
elif [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "[$(date -u)] Restoring gzipped backup..."
    zcat "$BACKUP_FILE" | psql "$DB_URL"
else
    echo "[$(date -u)] Restoring uncompressed backup..."
    psql "$DB_URL" < "$BACKUP_FILE"
fi

echo "[$(date -u)] Database restore finished."
