# Backup / Restore Runbook

> Дата: 2026-05-22
> Статус: ✅ Проверено на staging

## 1. Обзор

Для PostgreSQL на Supabase используется штатный механизм бэкапов:
- Supabase Pro автоматически создаёт ежедневные бэкапы (Point-in-Time Recovery)
- Ручные бэкапы: через `pg_dump` или Supabase Dashboard

## 2. Резервное копирование

### 2.1 Автоматические бэкапы (Supabase)

Supabase Pro включает:
- **Ежедневные полные бэкапы** — retention 7 дней
- **Point-in-Time Recovery** — до 30 дней при включённом PITR
- Бэкапы хранятся в инфраструктуре Supabase

Проверка статуса бэкапов:
```bash
# Supabase CLI
supabase projects backups list --project-ref <PROJECT_REF>
```

### 2.2 Ручной бэкап (pg_dump)

Перед каждым релизом со schema change:

```bash
# 1. Установить переменные окружения
$env:PGHOST="<host>"
$env:PGPORT="5432"
$env:PGUSER="postgres"
$env:PGPASSWORD="<password>"
$env:PGDATABASE="postgres"

# 2. Полный дамп БД (без данных сессий)
pg_dump `
  --no-owner `
  --no-acl `
  --exclude-table-data='user_sessions' `
  --exclude-table-data='session' `
  --exclude-table-data='message' `
  --file="backup-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql"
```

### 2.3 Supabase Dashboard

1. Войти в [database.new](https://database.new)
2. Выбрать проект → **Database** → **Backups**
3. Нажать **Download Backup** для скачивания `.sql`

## 3. Восстановление

### 3.1 Восстановление из Supabase бэкапа

```bash
# 1. Скачать бэкап из Dashboard (см. 2.3)

# 2. Восстановить в staging/локальную БД
psql -h localhost -U postgres -d ai_academy_dev -f backup-2026-05-22-1200.sql
```

### 3.2 Point-in-Time Recovery (Supabase)

1. Supabase Dashboard → Database → Backups
2. Выбрать **Restore to a point in time**
3. Указать время (с точностью до минуты)
4. Подтвердить — Supabase создаст новую БД из PITR

### 3.3 Восстановление после неудачной миграции

Если `prisma migrate deploy` сломал production:

```bash
# 1. Откатить версию приложения на Vercel
#    (Redeploy previous deployment)

# 2. Восстановить БД из бэкапа
psql "$DATABASE_URL" -f backup-2026-05-22-1200.sql

# 3. Применить миграции до нужного состояния
npx prisma migrate resolve --rolled-back "<migration_name>"

# 4. Проверить данные
npm run users:check-demo
```

## 4. Проверка восстановления

После restore обязательно проверить:

```bash
# 1. Проверить demo пользователей
npm run users:check-demo

# 2. Проверить demo курс
npm run course:create-demo
npm run users:check-demo  # Снова — должны быть данные

# 3. Smoke-тесты
npm run verify

# 4. E2E smoke
npm run test:e2e -- --grep "public pages"
```

## 5. Recovery Drills

Рекомендуется проводить drill раз в месяц:

| Дата | Тип | Результат |
|------|-----|-----------|
| 2026-05-22 | pg_dump → local restore | ✅ Успешно |
| — | Supabase PITR | 🟡 Не тестировалось |

## 6. Troubleshooting

| Проблема | Решение |
|----------|---------|
| `role "postgres" does not exist` | `$env:PGUSER="<supabase_user>"` (см. Dashboard → Database → Connection params) |
| `ERROR: relation "migrations" does not exist` | Prisma ещё не инициализирован — запусти `npx prisma migrate dev` |
| pg_dump зависает | Добавить `--no-sync` или увеличить `PGHOST` timeout |
