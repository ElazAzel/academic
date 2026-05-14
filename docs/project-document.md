# AI Strategic Academy — Полный документ проекта

**Версия:** 1.0.0  
**Дата:** 14 мая 2026  
**Статус:** Active Development  

---

## 1. Назначение

Закрытая LMS-платформа для корпоративного обучения AI-стратегии.  
Платформа управляет полным циклом: выдача доступа → обучение по курсам → сопровождение кураторами → тестирование → задания → сертификация.

Продуктовая идея:
- Слушатель проходит обучение в одном кабинете
- Команда академии видит ход обучения по ролям
- Полный цифровой след: прогресс, тесты, задания, активность

---

## 2. Архитектура

### 2.1 Технический стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Фреймворк | Next.js (App Router) | 16.2.5 |
| Язык | TypeScript (strict) | 5.9.3 |
| ORM | Prisma | 7.8.0 |
| База данных | PostgreSQL | 17 |
| Хостинг БД | Supabase | — |
| Аутентификация | NextAuth.js | 4.24.11 |
| Стили | Tailwind CSS | 3.4.17 |
| UI-библиотека | Radix UI + shadcn/ui | — |
| Анимации | Framer Motion | latest |
| Отчёты PDF | pdf-lib | 1.17.1 |
| Отчёты XLSX | exceljs | 4.4.0 |
| Файлы | S3 (Supabase / MinIO) | — |
| Тесты | Vitest + Playwright | 2.1.9 / 1.58.2 |
| CI/CD | GitHub Actions + Vercel | — |
| Контейнеризация | Docker | — |

### 2.2 Структура директорий

```
app/                          # Next.js App Router
├── [role]/                   # Кабинеты по ролям (6 шт.)
│   ├── page.tsx              # Дашборд
│   ├── students/             # Слушатели
│   ├── questions/            # Вопросы
│   ├── risks/                # Риски
│   ├── reports/              # Отчёты
│   ├── analytics/            # Аналитика
│   ├── settings/             # Настройки
│   ├── chat/                 # Чат (куратор)
│   ├── glossary/             # Глоссарий (куратор)
│   ├── cohorts/              # Потоки (super_curator)
│   └── curators/             # Кураторы (super_curator)
├── api/v1/                   # REST API
│   ├── reports/              # Генерация отчётов
│   ├── quizzes/              # Тесты
│   ├── assignments/          # Задания
│   ├── progress/             # Прогресс
│   ├── chat/                 # Чат presigned URL
│   ├── certificates/         # Сертификаты
│   ├── courses/              # Курсы
│   ├── modules/              # Модули
│   ├── lessons/              # Уроки
│   └── users/export/         # Экспорт пользователей

components/
├── admin/                    # Компоненты админки
├── auth/                     # Логин, регистрация
├── instructor/               # Редакторы курсов
├── layout/                   # AppShell, навигация, шапка
├── lms/                      # Общие: чат, плеер, анимации, виджеты
└── ui/                       # Базовые UI (button, card, dialog...)

server/
├── actions/                  # Server Actions (FormData)
├── modules/                  # Бизнес-логика
│   ├── auth/                 # Профиль, пароли
│   ├── courses/              # Курсы
│   ├── learning/             # Обучение (студент)
│   ├── quizzes/              # Тесты
│   ├── certificates/         # Сертификаты
│   ├── notifications/        # Уведомления
│   ├── audit/                # Аудит
│   ├── users/                # Пользователи
│   ├── observer/             # Scope наблюдателя
│   └── course-builder/       # Конструктор курсов
└── auth/options.ts           # NextAuth config

lib/
├── auth/                     # session.ts, rbac.ts, password.ts
├── reports/                  # data.ts, types.ts, csv/xlsx/pdf generators
├── storage.ts                # S3 presigned URLs
├── http.ts                   # API helpers
├── validation.ts             # Zod схемы
├── env.ts                    # Zod-схема env
└── utils.ts                  # cn() и утилиты

prisma/
├── schema.prisma             # ~1000 строк, 30+ моделей
├── seed.ts                   # 3 курса, 10 студентов
└── config (prisma.config.ts) # Пуллер URL

types/domain.ts               # Доменные типы (~500 строк)
```

---

## 3. Модели данных

### 3.1 Основные модели

- **User** — пользователи (поля: name, email, organization для realName, status, lastLoginAt)
- **Role** — роли (admin, instructor, student, curator, super_curator, customer_observer)
- **UserRole** — связь пользователь-роль
- **Course** — курсы (slug, title, status, traversalMode, completionThreshold)
- **Module** — модули (order, title, recommendedDays, status)
- **Block** — блоки (order, title, recommendedDays, status)
- **Lesson** — уроки (type: VIDEO/TEXT/QUIZ/ASSIGNMENT..., content blocks)
- **LessonMedia** — медиафайлы урока
- **Cohort** — потоки (name, courseId, projectId, status, startsAt, endsAt)
- **CohortDeadline** — дедлайны модулей для потоков
- **BlockCohortDeadline** — дедлайны блоков для потоков
- **Enrollment** — зачисления (status: ACTIVE/PAUSED/COMPLETED/CANCELLED)
- **Progress** — прогресс по урокам/блокам/модулям/курсам
- **Quiz / QuizQuestion / QuizAttempt** — тесты
- **Assignment / AssignmentSubmission** — задания
- **LessonQuestion** — вопросы куратору (OPEN/ANSWERED/FORWARDED/CLOSED)
- **Message** — чат (senderId, receiverId, text, attachmentUrl, attachmentType, lessonId, readAt)
- **RiskFlag** — риски (type, severity, status, userId, courseId, cohortId)
- **Certificate** — сертификаты (number, verificationCode, pdfUrl)
- **Report** — отчёты
- **ActivityLog** — лог действий
- **AuditLog** — аудит
- **Notification** — уведомления
- **GlossaryEntry** — глоссарий (question, answer, category)
- **AppSetting** — настройки платформы
- **InviteLink** — инвайт-ссылки

---

## 4. API Endpoints

### Server Actions (FormData-based)

| Экшен | Назначение |
|-------|-----------|
| `sendMessageAction` | Отправка сообщения в чат |
| `getConversation` | История чата со студентом |
| `getMyConversations` | Список диалогов |
| `createRiskAction` | Создание риска |
| `resolveRiskAction` | Закрытие риска |
| `createGlossaryEntryAction` | Создание записи глоссария |
| `createCohortAction` | Создание потока |
| `enrollStudentAction` | Зачисление |
| `assignCuratorAction` | Назначение куратора |
| `createUserAction` | Создание пользователя |
| `updateUserAction` | Обновление пользователя |
| `deleteUserAction` | Деактивация пользователя |
| `answerQuestionAction` | Ответ на вопрос |
| `reviewSubmissionAction` | Проверка задания |
| `forwardQuestionAction` | Пересылка вопроса |

### REST API Routes

| Маршрут | Метод | Назначение |
|---------|-------|-----------|
| `/api/v1/reports` | GET | Скачивание отчётов (CSV/XLSX/PDF) |
| `/api/v1/queries/[id]/attempts` | POST | Отправка теста |
| `/api/v1/assignments/[id]/submissions` | POST | Отправка задания |
| `/api/v1/progress` | POST | Сохранение прогресса |
| `/api/v1/chat/presign` | GET | Presigned URL для загрузки |
| `/api/v1/courses/[id]/builder` | GET/PATCH | Конструктор курсов |
| `/api/v1/users/export` | GET | Экспорт пользователей CSV |
| `/api/v1/certificates/[id]/pdf` | GET | Скачивание сертификата PDF |

---

## 5. Аутентификация и RBAC

- **NextAuth.js** с JWT-стратегией
- **Credentials Provider** (email + пароль, argon2)
- **proxy.ts** (Next.js 16) — middleware для редиректов по ролям
- **requireRolePage()** — guard на уровне страниц
- **requireRole()** — guard на уровне server actions
- Роли: `admin` > `super_curator` > `curator` > `instructor` > `customer_observer` > `student`

---

## 6. Отчёты

| Формат | Библиотека | Статус |
|--------|-----------|--------|
| CSV | Ручная генерация | ✅ |
| XLSX | exceljs | ✅ (с группировкой, сводками, цветами) |
| PDF | pdf-lib | ✅ (серверная генерация, стабильно) |

Типы отчётов: progress, risk, certificates.  
Скоупинг данных: admin (все), curator (свои студенты), instructor (свои курсы), observer (scope).

---

## 7. CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`):
- Node 22, PostgreSQL 16
- `prisma db push` + seed
- TypeScript check + ESLint
- Unit tests (Vitest)
- E2E (Playwright)
- Build

**Vercel**: автоматический деплой с main-ветки.

---

## 8. PWA

- manifest.json (standalone, иконки SVG)
- Service Worker (sw.js): кэш статики, push-уведомления
- appleWebApp capable
- Регистрация через `PWARegister` компонент

---

## 9. Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|-----------|-------------|-------------|----------|
| `DATABASE_URL` | да | — | PostgreSQL (Supabase pooler) |
| `NEXTAUTH_SECRET` | да | — | JWT секрет (≥32 символов) |
| `NEXTAUTH_URL` | да | — | URL приложения |
| `APP_URL` | да | `http://localhost:3000` | URL приложения |
| `NODE_ENV` | нет | `development` | Окружение |
| `S3_ENDPOINT` | нет | — | S3 endpoint |
| `S3_BUCKET` | нет | — | S3 bucket |
| `S3_ACCESS_KEY` | нет | — | S3 ключ |
| `S3_SECRET_KEY` | нет | — | S3 секрет |
| `FEATURE_EMAIL_NOTIFICATIONS` | нет | `false` | Email-уведомления |
| `NEXT_PUBLIC_DEMO_MODE` | нет | `false` | Демо-режим |

---

## 10. Тестирование

| Тип | Инструмент | Количество |
|-----|-----------|-----------|
| Unit-тесты | Vitest | 217 тестов, 40 файлов (✅ все проходят) |
| E2E | Playwright | 50 тестов (требуется seeded БД) |
| TypeScript | tsc --noEmit | 0 errors |
| Линтер | ESLint | 0 warnings |

---

## 11. Разработка

```bash
# Первый запуск
cp .env.example .env  # настроить DATABASE_URL и NEXTAUTH_SECRET
npm ci
npx prisma db push
npx prisma db seed
npm run dev

# Ежедневная работа
npm run dev        # next dev
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run test       # Unit-тесты
npm run build      # Production сборка
```

---

## 12. Changelog

### 14 мая 2026
- Фаза 4: PWA (manifest, sw.js, push), feature flags, .env.example
- Фаза 3: Активность (7–180 дней, фильтры поток/курс), PDF (pdf-lib вместо pdfmake)
- Фаза 2: Риски (фильтры, создание, закрытие), пользователи (поиск, экспорт), глоссарий (категории, поиск)
- Фаза 1: Чат с вложениями, deadlines блоков, анимация логина, отчёты XLSX fallback
- Animations: framer-motion (FadeIn, Stagger, CardHover, PageTransition)
- База: все роли закрыты
