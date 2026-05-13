# Backup & Restore — AI Strategic Academy

## Overview

The LMS uses PostgreSQL (via Supabase or self-hosted) and S3-compatible storage
for media uploads. This runbook covers backup and restore for both.

---

## Prerequisites

- `pg_dump` / `pg_restore` (PostgreSQL 16+ client)
- `aws` CLI v2 (for S3 operations)
- Access to `DATABASE_URL` or Supabase project credentials
- Access to S3 endpoint and credentials (minio/bucket keys)

---

## Database

### Backup

```bash
# Full backup (compressed)
pg_dump "$DATABASE_URL" \
  --no-owner \
  --compress=9 \
  --file="academy-$(date +%F).sql.gz"

# Schema-only (for version control diff)
pg_dump "$DATABASE_URL" \
  --no-owner \
  --schema-only \
  --file="academy-schema-$(date +%F).sql"
```

### Restore

```bash
# Drop and recreate (destructive)
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c academy-2026-05-13.sql.gz | psql "$DATABASE_URL"

# Or use pg_restore for custom format
pg_restore --clean --no-owner --dbname="$DATABASE_URL" academy-2026-05-13.dump
```

### Automated (cron)

```bash
0 3 * * * /path/to/infra/backup/scripts/daily-backup.sh
```

---

## S3 Media

### Backup

```bash
aws s3 sync s3://academy-media/ ./backup-media-$(date +%F)/ \
  --endpoint-url "$S3_ENDPOINT" \
  --profile academy
```

### Restore

```bash
aws s3 sync ./backup-media-2026-05-13/ s3://academy-media/ \
  --endpoint-url "$S3_ENDPOINT" \
  --profile academy
```

---

## Retention Policy

| Tier | Frequency | Retention | Destination |
|------|-----------|-----------|-------------|
| Daily | Every 24h | 7 days | Local disk |
| Weekly | Sunday 03:00 | 4 weeks | Local disk |
| Monthly | 1st of month | 12 months | S3 bucket |

---

## Runbook: Full Disaster Recovery

1. Provision a new PostgreSQL instance (or unpause Supabase)
2. Restore the latest database dump
3. Run `npx prisma migrate deploy` to apply any pending migrations
4. Restore S3 media from the latest backup
5. Update `DATABASE_URL` and `S3_*` env vars
6. Start the application: `npm run build && npm start`
7. Verify: `curl http://localhost:3000/api/healthz`
8. Verify: Test login with a known seed user
