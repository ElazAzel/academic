# Database Backup & Restore Runbook

> AI Strategic Academy — PostgreSQL backup procedures

## Prerequisites

- `pg_dump` and `pg_restore` installed (PostgreSQL client tools)
- Database connection details in `.env` or environment variables
- Sufficient disk space (estimate: DB size × 2 for dump + compressed archive)

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `BACKUP_DIR` | Directory for backup files (default: `./backups`) | ❌ No |

## Backup Procedures

### 1. Manual Full Backup

```bash
# Set variables
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="academy"
DB_URL="postgresql://user:password@localhost:5432/academy"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Full database dump (custom format, compressed)
pg_dump "$DB_URL" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/academy_full_$TIMESTAMP.dump"

# Optional: plain SQL dump (more portable, larger)
pg_dump "$DB_URL" \
  --format=plain \
  --no-owner \
  --file="$BACKUP_DIR/academy_sql_$TIMESTAMP.sql"

# Compress SQL dump
gzip "$BACKUP_DIR/academy_sql_$TIMESTAMP.sql"

echo "Backup created: academy_full_$TIMESTAMP.dump"
```

### 2. Scheduled Automated Backup

Create `/etc/cron.daily/academy-backup` or use systemd timer:

```bash
#!/bin/bash
# /usr/local/bin/academy-backup.sh

BACKUP_DIR="/var/backups/academy"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_URL="${DATABASE_URL}"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump
pg_dump "$DB_URL" --format=custom --compress=9 --file="$BACKUP_DIR/academy_$TIMESTAMP.dump"

# Remove backups older than retention period
find "$BACKUP_DIR" -name "academy_*.dump" -mtime +$RETENTION_DAYS -delete

# Log
echo "[$(date)] Backup created, retained $RETENTION_DAYS days" >> "$BACKUP_DIR/backup.log"
```

### 3. Encrypted Backup (Production)

For production environments, encrypt backups before storing off-site:

```bash
# Generate encryption key (first time only)
openssl rand -base64 32 > /etc/backup-keys/academy.key

# Encrypt dump
gpg --symmetric --cipher-algo AES256 \
  --passphrase-file /etc/backup-keys/academy.key \
  --output "academy_$TIMESTAMP.dump.gpg" \
  "academy_$TIMESTAMP.dump"
```

### 4. Off-site Backup (S3-Compatible)

```bash
# Upload encrypted backup to S3
aws s3 cp "academy_$TIMESTAMP.dump.gpg" "s3://academy-backups/database/"

# Or with MinIO client
mc cp "academy_$TIMESTAMP.dump.gpg" "myminio/academy-backups/"
```

## Restore Procedures

### 1. Restore from Custom Format Dump

```bash
# Warning: This will DROP and recreate the database
pg_restore --dbname=academy \
  --clean \
  --if-exists \
  --no-owner \
  --verbose \
  "academy_full_20260516_120000.dump"
```

### 2. Restore from Plain SQL Dump

```bash
# Drop and recreate target database first
dropdb --if-exists academy
createdb academy

# Restore from SQL
gunzip -c "academy_sql_20260516_120000.sql.gz" | psql academy
```

### 3. Restore to a Different Database (for testing)

```bash
createdb academy_restore_test
pg_restore --dbname=academy_restore_test \
  "academy_full_20260516_120000.dump"
```

## Restore Rehearsal Checklist

Run this checklist before every production restore:

- [ ] Back up current database before attempting restore
- [ ] Verify dump file integrity: `pg_restore --list academy.dump | head -20`
- [ ] Check disk space: `df -h`
- [ ] Stop application: `docker compose stop app`
- [ ] Notify users of maintenance window
- [ ] Create a restore test database first
- [ ] Run `npx prisma migrate deploy` after restore to ensure migrations match
- [ ] Run `npm run seed` if lookup data needs re-initialization
- [ ] Verify key metrics: user count, enrollment count, certificates
- [ ] Start application: `docker compose start app`
- [ ] Monitor logs for errors: `docker compose logs --tail=100 app`

## Retention Policy

| Environment | Retention | Frequency | Off-site |
|---|---|---|---|
| Development | 7 days | Daily | No |
| Staging | 14 days | Daily | Optional |
| Production | 30 days | Daily | ✅ Required |

## Emergency Recovery

If no backup is available but the database files exist:

```bash
# 1. Stop PostgreSQL
pg_ctl stop -D /var/lib/postgresql/data

# 2. Copy data directory
cp -a /var/lib/postgresql/data /var/lib/postgresql/data.backup

# 3. Start PostgreSQL in single-user mode
postgres --single -D /var/lib/postgresql/data academy

# 4. Dump data manually
pg_dump academy > emergency_recovery.sql
```

## Monitoring

- Check backup logs: `cat /var/backups/academy/backup.log`
- Verify dump file sizes: `ls -lh /var/backups/academy/`
- Test restore monthly in staging environment
