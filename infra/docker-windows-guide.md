# Docker — Windows (PowerShell) Guide

> **Дата:** 2026-05-22
> **Назначение:** Альтернативы Linux-командам для Windows-разработчиков.
> **Совместимость:** Docker Desktop for Windows (WSL2 backend)

## Статус

- `docker-compose.yml` и `Dockerfile` **полностью совместимы** с Docker Desktop (WSL2).
- Запуск одним стеком: `docker compose up -d` поднимает postgres, redis, mailhog, minio.
- **Ограничение:** приложение (`app` сервис) маппит `.` как volume — на Windows работают нативные `node_modules` (не Linux). Если модули собраны под Windows, в контейнере они могут не подойти.

## PowerShell vs Bash эквиваленты

| Linux (bash) | Windows (PowerShell) |
|---|---|
| `docker compose up -d` | `docker compose up -d` (одинаково) |
| `docker compose down` | `docker compose down` (одинаково) |
| `docker compose logs -f` | `docker compose logs -f` (одинаково) |
| `docker compose exec app sh` | `docker compose exec app sh` (одинаково) |
| `docker compose build` | `docker compose build` (одинаково) |
| `docker compose pull` | `docker compose pull` (одинаково) |
| `DATABASE_URL=... docker compose up` | `$env:DATABASE_URL="..."; docker compose up` |
| `$(pwd)` в volume paths | `${PWD}` или полный абсолютный путь |
| `export VAR=val` | `$env:VAR="val"` |

## Обход загрузки `node_modules` в контейнер

Если `node_modules` собраны под Windows и блокируют контейнер:

```powershell
# Создать .dockerignore (уже должен быть)
# Добавить строку: node_modules

# Запустить только инфраструктуру (без app)
docker compose up -d postgres redis mailhog minio

# Локально запустить приложение с переменными для Docker-сервисов
$env:DATABASE_URL="postgresql://academy:academy-local-only@localhost:5432/academy?schema=public"
$env:REDIS_URL="redis://localhost:6379"
$env:SMTP_HOST="localhost"
$env:S3_ENDPOINT="http://localhost:9000"
npm run dev
```

## Альтернатива Docker (чистый Windows)

Если Docker Desktop недоступен:

| Сервис | Windows-альтернатива |
|---|---|
| PostgreSQL | Установить через `winget install PostgreSQL.PostgreSQL` |
| Redis | `winget install Redis.Redis` или Memurai (Windows-native Redis) |
| SMTP (MailHog) | Docker-only — временно пропустить (отправка не упадёт) |
| MinIO | Docker-only — временно пропустить (загрузка файлов не будет работать) |

## Известные проблемы

| Проблема | Решение |
|---|---|
| `exec user process caused: exec format error` | Пересобрать образ с arm64 (для ARM-ноутбуков) |
| Volume mount is slow | Добавить `:delegated` суффикс к volume: `.:/app:delegated` |
| Port conflicts (3000, 5432) | Остановить локальные сервисы или сменить порты в `docker-compose.override.yml` |
