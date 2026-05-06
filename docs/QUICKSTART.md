# Быстрый старт — локальная разработка

## Требования
- Node.js >= 20.9.0
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
Проверьте, что `DATABASE_URL` указывает на `postgresql://academy:academy@localhost:5432/academy?schema=public`.

## 3. Запуск PostgreSQL (через Docker)
```bash
# Запустить только PostgreSQL, Redis, MinIO, Mailhog
docker compose up -d postgres redis mailhog minio
```

## 4. Миграция и наполнение БД
```bash
# Создать таблицы в PostgreSQL
npx prisma migrate dev --name init

# Наполнить демо-данными
npx prisma db seed
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

# Миграция внутри контейнера
docker compose exec app npx prisma migrate dev --name init
docker compose exec app npx prisma db seed
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
