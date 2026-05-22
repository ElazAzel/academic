# 🔗 Backup & Restore — scripts reference

> **Этот файл содержит только скрипты.**
> **Единый источник истины (runbook, retention, troubleshooting): `docs/backup-restore-runbook.md`**

## Скрипты

| Файл | Назначение |
|------|-----------|
| `backup.sh` | Ручной дамп (custom format, сжатие) |
| `restore.sh` | Восстановление из custom-format дампа |
| `scripts/daily-backup.sh` | Автоматический ежедневный дамп (cron) с retention |
| `autobackup.sh` | Расширенная версия с опциональным GPG-шифрованием |

## Зависимости

- `pg_dump` / `pg_restore` (PostgreSQL 16+ client)
- `aws` CLI v2 (для S3) или `mc` (MinIO Client)

## Переменные окружения

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

## Cron (пример)

```bash
0 3 * * * /path/to/infra/backup/scripts/daily-backup.sh
```
