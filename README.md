# AI Strategic Academy

Закрытая LMS-платформа для корпоративного AI-обучения. Управление курсами, потоками, кураторами, слушателями, сертификатами и отчётностью.

**Стек:** Next.js 16 (App Router) · TypeScript strict · Prisma ORM 7.8 · PostgreSQL 17 (Supabase) · Tailwind CSS 3.4 · NextAuth.js 4 · Framer Motion · Redis (Upstash)

---

## Роли

| Роль | Кабинет | Описание |
|------|---------|----------|
| **Администратор** | `/admin` | Полное управление: пользователи, курсы, потоки, аналитика, аудит, инвайты |
| **Супер-куратор** | `/super-curator` | Потоки, кураторы, распределение, риски, отчёты, глоссарий |
| **Куратор** | `/curator` | Слушатели, вопросы, проверка заданий, риски, чат, глоссарий |
| **Преподаватель** | `/instructor` | Конструктор курсов, слушатели, вопросы от кураторов, аналитика |
| **Слушатель** | `/student` | Обучение: уроки, тесты, задания, чат с куратором, сертификаты |
| **Заказчик-наблюдатель** | `/customer-observer` | Read-only: прогресс потоков, сертификаты, отчёты |

---

## Функционал

### Управление курсами
- Конструктор курсов: модули → блоки → уроки
- Типы уроков: видео (YouTube embed), текст, файлы, тесты, задания
- Режимы прохождения: последовательный / открытый
- Deadlines модулей и блоков (рекомендованные даты)

### Чат с вложениями
- Полноценный чат слушатель ↔ куратор внутри урока
- Отправка изображений (PNG/JPEG до 15MB) через S3 presigned URL
- Автоматическая отметка прочитанного
- Автосжатие изображений перед загрузкой (JPEG 80%, макс. 1920px)
- Список диалогов для куратора

### Тесты и задания
- Тесты с autograding (одиночный/множественный выбор)
- Задания с проверкой куратором, оценкой и обратной связью
- Всё внутри курса — нет отдельных страниц в меню

### Отчёты и аналитика
- Экспорт в CSV, XLSX, PDF (pdf-lib, серверная генерация)
- Экранные диаграммы: BarChart, DonutChart, stacked progress bars
- Активность: ежедневные/еженедельные входы (7–180 дней)
- Фильтры по потоку, курсу, куратору, типу риска

### Риски
- Детальные риски с прогрессом, вопросами, заданиями
- Фильтры по потоку/куратору/типу/уровню
- Ручное создание и закрытие рисков
- Связка студент → display name → реальное имя → куратор

### Глоссарий
- Ответы на частые вопросы для кураторов
- Категории, поиск по ключевым словам
- Наполняется администратором и супер-куратором

### Пользователи
- Двухслойная система имён: display name + реальное имя (для сертификата)
- Поиск, фильтры по роли и статусу
- Экспорт в CSV
- Создание, редактирование, деактивация

### PWA
- Манифест, service worker, кэширование статики
- Push-уведомления через браузер
- Apple Web App capable

---

## Технический стек

| Слой | Технология |
|------|-----------|
| **Фреймворк** | Next.js 16.2.6 (App Router) |
| **Язык** | TypeScript 5.9 (strict mode) |
| **ORM** | Prisma 7.8 |
| **База данных** | PostgreSQL 17 (Supabase) |
| **Аутентификация** | NextAuth.js 4.24 (JWT, credentials + OAuth) |
| **UI** | Tailwind CSS 3.4, Radix UI, shadcn/ui, Framer Motion |
| **Отчёты** | exceljs, pdf-lib (PDF) |
| **Хранилище** | S3-compatible (Supabase / MinIO) |
| **Кэш/Rate limiter** | Redis (Upstash) + memory fallback |
| **Тесты** | Vitest (unit, 422 теста), Playwright (E2E, 52 теста) |
| **Мониторинг** | Sentry |
| **CI/CD** | GitHub Actions, Vercel |
| **MCP** | Supabase MCP сервер |

---

## Структура проекта

```
.
├── app/                  # Next.js App Router pages
│   ├── admin/           # Администратор
│   ├── curator/         # Куратор
│   ├── instructor/      # Преподаватель
│   ├── student/         # Слушатель
│   ├── super-curator/   # Супер-куратор
│   ├── customer-observer/ # Заказчик-наблюдатель
│   └── api/             # API маршруты
├── components/
│   ├── admin/           # Компоненты админки
│   ├── auth/            # Аутентификация
│   ├── instructor/      # Компоненты преподавателя
│   ├── layout/          # AppShell, навигация
│   ├── lms/             # Общие компоненты LMS
│   └── ui/              # Базовые UI (Radix/shadcn)
├── lib/
│   ├── auth/            # Сессия, RBAC, пароли
│   ├── reports/         # Генерация CSV/XLSX/PDF
│   └── env.ts           # Zod-схема переменных окружения
├── server/
│   ├── actions/         # Server Actions
│   ├── modules/         # Бизнес-логика
│   └── auth/            # NextAuth config
├── prisma/
│   ├── schema.prisma    # Модели данных
│   └── seed.ts          # Сидирование
├── types/               # TypeScript типы
├── ai/                  # AI-роли (оркестратор, бэкенд, фронтенд...)
├── .agents/skills/      # Supabase skills
├── tests/               # Unit-тесты (Vitest)
│   ├── unit/            # Модульные тесты
│   └── e2e/             # E2E smoke-тесты (Playwright)
├── docs/                # Документация
│   ├── updates.md       # Журнал обновлений
│   ├── implementation-plan.md # План реализации
│   ├── MASTER-PLAN.md   # Стратегический план
│   ├── specification.md # Спецификация
│   ├── security.md      # Безопасность
│   ├── todo.md          # TODO-лист
│   ├── archive/         # Архивные документы
│   └── legal/           # Юридические документы
└── CHANGELOG.md         # Лог изменений по версиям
```

---

## Запуск

```bash
# Установка
npm ci

# Локальная база данных (PostgreSQL portable)
# Скопируйте .env.example → .env
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1
# или: sh scripts/bootstrap.sh

# Разработка
npm run dev

# Проверки
npm run typecheck       # TypeScript (strict mode)
npm run lint            # ESLint (0 warnings)
npm run test            # Unit/integration Vitest
npm run test:e2e        # E2E Playwright (Chromium + Pixel 7)
npm run build           # Production Next.js build
npm run verify          # banned patterns + lint + typecheck + test + build + specs
npm run verify:security # Security skills + npm audit (high/critical gate)
npm run verify:release  # Полный release gate (security + Prisma validate + E2E)
```

`db:push`, `db:seed` и `certificate:issue-demo` отказываются мутировать remote database host по умолчанию. Для локального bootstrap используйте `scripts/bootstrap.ps1` или `scripts/bootstrap.sh`; `ALLOW_REMOTE_DATABASE_MUTATION=true` нужен только для намеренной remote-мутации.

### Пользователи по умолчанию (seed)

| Email | Пароль | Роль |
|-------|--------|------|
| `admin@academy.local` | `Password123!` | Администратор |
| `instructor1@academy.local` | `Password123!` | Преподаватель |
| `curator@academy.local` | `Password123!` | Куратор |
| `supercurator@academy.local` | `Password123!` | Супер-куратор |
| `student1@academy.local` | `Password123!` | Слушатель |
| `observer@academy.local` | `Password123!` | Заказчик-наблюдатель |

---

## Статус проекта

| Метрика | Значение |
|---------|----------|
| **Страницы** | 87/87 сборка 0 ошибок |
| **API routes** | 102 |
| **Unit-тесты** | 422/422 (69 файлов) |
| **E2E smoke** | 52/52 (Chromium + Mobile) |
| **Lint** | 0 errors, 0 warnings |
| **Typecheck** | clean ✅ |
| **Deployment** | Vercel auto-deploy (main) |
| **Последний релиз** | v1.0.0 (2026-05-24) |

## Переменные окружения

Основные (обязательные):
- `DATABASE_URL` — PostgreSQL подключение (Supabase pooler)
- `NEXTAUTH_SECRET` — секрет для JWT (≥32 символов)
- `NEXTAUTH_URL` — URL приложения

Опционально:
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — файловое хранилище (MinIO/Supabase)
- `NEXT_PUBLIC_DEMO_MODE=true` — демо-режим без базы данных
- `FEATURE_EMAIL_NOTIFICATIONS` — email-уведомления (по умолчанию выкл.)
- `CRON_SECRET` — секрет для cron-воркеров
- `STORAGE_SUPABASE_URL`, `STORAGE_SUPABASE_SERVICE_ROLE_KEY` — Supabase Storage

Полный список: `.env.example`

---

## Лицензия

MIT
