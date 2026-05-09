# PostgreSQL Database Backup and Restore Runbook

This guide covers the procedures for backing up and restoring the `academy-postgres` database.

## 1. Backups

The backup script `backup.sh` uses `pg_dump` to create compressed, optionally encrypted database backups. It also cleans up backups older than a specified retention period (default 30 days).

### Automated Setup (Cron)

Set up a daily cron job (e.g., at 2:00 AM) to run the backup script:

```bash
# Edit crontab
crontab -e

# Add the following line
0 2 * * * DB_URL="postgresql://user:password@host:port/dbname" ENCRYPTION_PASSPHRASE="your-secret-passphrase" /path/to/infra/backup/backup.sh >> /var/log/academy-backup.log 2>&1
```

## 2. Restore Procedure

The restore script `restore.sh` accepts a backup file and a target database connection string.

### Prerequisites
1. Ensure the target database exists. The backup script drops and recreates schema objects, but the database itself must be present.
2. If the backup is encrypted (`.gpg`), you need the `ENCRYPTION_PASSPHRASE`.

### Steps
1. Stop application traffic to prevent inconsistent states.
2. Execute the restore script:

```bash
# For an encrypted backup
ENCRYPTION_PASSPHRASE="your-secret-passphrase" ./restore.sh /path/to/backup.sql.gz.gpg "postgresql://user:password@host:port/dbname"

# For an unencrypted backup
./restore.sh /path/to/backup.sql.gz "postgresql://user:password@host:port/dbname"
```

## 3. Disaster Recovery: Restore Rehearsal Checklist

It is critical to regularly test backups to ensure data integrity and team readiness. Perform this checklist **at least once per quarter** or before a major production cohort launch.

- [ ] **Provision a Staging/Test DB**: Create a temporary PostgreSQL instance separate from production.
- [ ] **Locate Backup**: Identify and download the latest automated backup from storage.
- [ ] **Verify Encryption (if applicable)**: Successfully decrypt the backup using the stored passphrase from the secrets manager.
- [ ] **Run Restore**: Execute `restore.sh` against the staging DB and monitor logs for any import errors.
- [ ] **Data Validation**:
  - Connect to the test DB and count records in critical tables (e.g., `User`, `Enrollment`, `Certificate`).
  - Compare these counts with metrics from production around the time of the backup.
- [ ] **Application Smoke Test**: Point a staging instance of the AI Strategic Academy app to the restored database and verify user login and course access.
- [ ] **Teardown**: Destroy the staging database to prevent accidental data leaks or usage.
- [ ] **Sign-off**: Document the date, duration, and outcome of the restore rehearsal.
