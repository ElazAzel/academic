# Backup / Restore Runbook

> **Единый источник истины для всех процедур бэкапа.**
> Дата: 2026-05-31
> Статус: `partial` — pg_dump/local restore документированы, Supabase PITR и полный staging rollback drill требуют evidence.

Связанные файлы:
- Скрипты автоматизации: `infra/backup/scripts/daily-backup.sh`, `infra/backup/backup.sh`, `infra/backup/restore.sh`
- S3-конфигурация: `infra/s3-config.md`
- Документация: `docs/implementation-plan.md`, `docs/security-review.md`

---

## 1. Обзор

Production работает на **Supabase PostgreSQL** (автоматические бэкапы + PITR).
Для ручных операций — `pg_dump` / Supabase Dashboard.
Для автоматизации (Linux-серверы) — bash-скрипты в `infra/backup/scripts/`.

### Политика хранения (единая)

| Уровень | Частота | Retention | Куда |
|---------|---------|-----------|------|
| Supabase авто | Ежедневно | 7 дней | Инфраструктура Supabase |
| PITR | Непрерывно | до 30 дней (если включён) | Supabase |
| Ручной pre-release | Перед каждым релизом | До следующего релиза | Локально |
| S3 off-site | Еженедельно | 4 недели | S3-совместимое хранилище |
| S3 monthly | 1-го числа | 12 месяцев | S3-совместимое хранилище |

---

## 2. Резервное копирование

### 2.1 Автоматические бэкапы (Supabase Pro)

Supabase Pro включает:
- **Ежедневные полные бэкапы** — retention 7 дней
- **Point-in-Time Recovery** — до 30 дней при включённом PITR (рекомендуется включить в Production)
- Бэкапы хранятся в инфраструктуре Supabase

Проверка статуса:
```bash
# Supabase CLI (Linux/macOS)
supabase projects backups list --project-ref <PROJECT_REF>

# Supabase Dashboard
# https://supabase.com/dashboard/project/<ref>/database/backups
```

### 2.2 Ручной бэкап (pg_dump) — Windows (PowerShell)

Перед каждым релизом со schema change:

```powershell
# 1. Установить переменные окружения
$env:PGHOST="<host>"
$env:PGPORT="5432"
$env:PGUSER="postgres"
$env:PGPASSWORD="<password>"
$env:PGDATABASE="postgres"

# 2. Полный дамп БД (без данных сессий и сообщений — они не критичны для восстановления)
pg_dump `
  --no-owner `
  --no-acl `
  --exclude-table-data='user_sessions' `
  --exclude-table-data='session' `
  --exclude-table-data='message' `
  --file="backup-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql"
```

### 2.3 Ручной бэкап (pg_dump) — Linux / CI

```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --compress=9 \
  --exclude-table-data='user_sessions' \
  --exclude-table-data='session' \
  --exclude-table-data='message' \
  --file="backup-$(date +%F-%H%M).sql.gz"
```

### 2.4 Supabase Dashboard

1. Войти в [database.new](https://database.new)
2. Выбрать проект → **Database** → **Backups**
3. Нажать **Download Backup** для скачивания `.sql`

### 2.5 Автоматизированный бэкап (Linux cron)

Скрипты в `infra/backup/scripts/`:
- `daily-backup.sh` — ежедневный дамп, retention 7 дней, опциональная загрузка в S3
- `backup.sh` — расширенная версия с GPG-шифрованием
- Настройка: `0 3 * * * /path/to/infra/backup/scripts/daily-backup.sh`

### 2.6 S3 Media Backup

```bash
# Backup media files
aws s3 sync s3://academy-media/ ./backup-media-$(date +%F)/ \
  --endpoint-url "$S3_ENDPOINT" \
  --profile academy
```

---

## 3. Восстановление

### 3.1 Из Supabase бэкапа

1. Supabase Dashboard → Database → Backups
2. Download нужного бэкапа
3. Восстановить:
```bash
psql "$DATABASE_URL" -f backup-2026-05-22-1200.sql
```

### 3.2 Point-in-Time Recovery (Supabase)

1. Supabase Dashboard → Database → Backups
2. Выбрать **Restore to a point in time**
3. Указать время (с точностью до минуты)
4. Подтвердить — Supabase создаст новую БД из PITR

### 3.3 Из custom-format dump (Linux)

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" academy_20260516.dump
```

### 3.4 После неудачной миграции

```bash
# 1. Откатить версию приложения на Vercel (Redeploy previous deployment)

# 2. Восстановить БД из бэкапа
psql "$DATABASE_URL" -f backup-2026-05-22-1200.sql

# 3. Применить миграции до нужного состояния
npx prisma migrate resolve --rolled-back "<migration_name>"

# 4. Проверить данные
npm run users:check-demo
```

### 3.5 S3 Media Restore

```bash
aws s3 sync ./backup-media-2026-05-13/ s3://academy-media/ \
  --endpoint-url "$S3_ENDPOINT" \
  --profile academy
```

---

## 4. Проверка восстановления

После restore обязательно проверить:

```bash
# 1. Health check
curl http://localhost:3000/api/healthz

# 2. Demo пользователи
npm run users:check-demo

# 3. Smoke-тесты
npm run verify

# 4. Login smoke
```

---

## 5. Recovery Drills

Рекомендуется проводить drill раз в месяц:

| Дата | Тип | Результат |
|------|-----|-----------|
| 2026-05-22 | pg_dump → local restore | ✅ Успешно |
| 2026-05-24 | Supabase PITR проверка | 🟡 Не тестировалось — PITR включён в Supabase Pro |

---

## 6. Troubleshooting

| Проблема | Решение |
|----------|---------|
| `role "postgres" does not exist` | Указать правильного пользователя из Supabase Dashboard → Database → Connection params |
| `ERROR: relation "_prisma_migrations" does not exist` | Таблица отсутствует — выполнить скрипт создания (см. schema-cleanup-preflight.ts) |
| pg_dump зависает | Добавить `--no-sync` или проверить сетевой доступ к Supabase pooler |
| `_prisma_migrations` not in dump | Нормально — таблица создаётся Prisma при первом `migrate deploy` |
