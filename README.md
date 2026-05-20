# AI Strategic Academy

Закрытая LMS-платформа для корпоративного AI-обучения. Управление курсами, потоками, кураторами, слушателями, сертификатами и отчётностью.

**Стек:** Next.js 16 (App Router) · TypeScript · Prisma ORM · PostgreSQL (Supabase) · Tailwind CSS · NextAuth.js · Framer Motion

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
| **Фреймворк** | Next.js 16.2.5 (App Router) |
| **Язык** | TypeScript 5.9 (strict mode) |
| **ORM** | Prisma 7.8 |
| **База данных** | PostgreSQL 17 (Supabase) |
| **Аутентификация** | NextAuth.js 4.24 (JWT, credentials) |
| **UI** | Tailwind CSS 3.4, Radix UI, shadcn/ui |
| **Анимации** | Framer Motion |
| **Отчёты** | exceljs, pdf-lib (PDF) |
| **Хранилище** | S3-compatible (Supabase / MinIO) |
| **Тесты** | Vitest (unit), Playwright (E2E) |
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
└── .agents/skills/      # Supabase skills
```

---

## Запуск

```bash
# Установка
npm ci

# База данных (Supabase)
# Скопируйте .env.example → .env и укажите DATABASE_URL
npx prisma db push
npx prisma db seed

# Разработка
npm run dev

# Проверки
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run test         # Unit-тесты
npm run test:e2e     # E2E (требуется база)
npm run build        # Production сборка
```

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

## Переменные окружения

Основные (обязательные):
- `DATABASE_URL` — PostgreSQL подключение (Supabase pooler)
- `NEXTAUTH_SECRET` — секрет для JWT (≥32 символов)
- `NEXTAUTH_URL` — URL приложения

Опционально:
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — файловое хранилище
- `NEXT_PUBLIC_DEMO_MODE=true` — демо-режим без базы данных
- `FEATURE_EMAIL_NOTIFICATIONS` — email-уведомления (по умолчанию выкл.)

Полный список: `.env.example`

---

## Лицензия

MIT
