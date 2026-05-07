# Быстрый старт — локальная разработка

## Требования
- Node.js >= 24 < 25
- Docker + Docker Compose
- npm

## 1. Установка зависимостей
```bash
npm install --legacy-peer-deps
```

## 2. Настройка окружения
```bash
cp .env.example .env
```
Проверьте, что `DATABASE_URL` указывает на внутренний PostgreSQL из `docker-compose.yml`: `postgresql://academy:<secret>@postgres:5432/academy?schema=public`. Порт PostgreSQL не публикуется наружу.

## 3. Запуск PostgreSQL (через Docker)
```bash
# Запустить только PostgreSQL, Redis, MinIO, Mailhog
docker compose up -d postgres redis mailhog minio
```

## 4. Миграция и наполнение БД
```bash
# Создать таблицы в PostgreSQL из app-контейнера, где доступен внутренний host `postgres`
docker compose run --rm app npm run db:migrate

# Наполнить демо-данными
docker compose run --rm app npm run db:seed
```

## 5. Запуск dev-сервера
```bash
npm run dev
```

Откройте http://localhost:3000

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@academy.local | Password123! |
| Преподаватель | instructor1@academy.local | Password123! |
| Куратор | curator@academy.local | Password123! |
| Супер-куратор | supercurator@academy.local | Password123! |
| Слушатель 1-10 | student1@academy.local ... student10@academy.local | Password123! |
| Заказчик | observer@academy.local | Password123! |

## Полный запуск через Docker Compose

```bash
# Запуск всех сервисов (включая приложение)
docker compose up -d

# Миграция и seed внутри контейнера
docker compose exec app npm run db:migrate
docker compose exec app npm run db:seed

# Создание выданных аккаунтов закрытой академии
docker compose exec app npm run users:provision
```

## Полезные команды

```bash
# Типы проверка
npm run typecheck

# Линтинг
npm run lint

# Production build
npm run build

# Prisma Studio (визуальный просмотр БД)
npx prisma studio

# Сброс БД
npx prisma migrate reset
```
