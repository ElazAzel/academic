# Executive Summary

AI Strategic Academy — закрытая LMS одной академии для управления курсами, потоками, кураторами, прогрессом, заданиями, сертификатами, инвайт-доступом и отчётностью. Основная реализация — Next.js modular monolith с REST API, Prisma/PostgreSQL и русским интерфейсом.

# Требования

| MVP feature | Статус | Примечание |
|---|---|---|
| Аутентификация email/password и OAuth | done | Auth.js credentials + Google/GitHub |
| RBAC | done | 6 ролей, `requireRolePage`, `assertPermission` |
| Курсы/модули/уроки | done | Draft/published/archived, unified builder |
| Прогресс и continue learning | done | Lesson/module/course progress, sequential unlock |
| Тесты и задания | done | Autograding, attempts, submissions, curator review |
| Сертификаты | done | Unique number, premium PDF, verification URL |
| Invite-only access | done | Инвайт-ссылки; Stripe — `410 Gone` |
| Аналитика/отчёты | done | CSV/XLSX/PDF, per-role scope, scheduled export |
| Поиск | done | PostgreSQL full-text |
| Уведомления | done | In-app + push (Firebase), SMTP pending wiring |
| Чат | done | Студент ↔ куратор, S3 presigned uploads |
| Риски | done | Deadline-based flags, curator/super-curator views |
| Глоссарий | done | Категории, поиск, admin/super-curator наполнение |
| PWA | done | Манифест, SW, push, Apple Web App capable |

## Роли

| Роль | Основные права |
|---|---|
| admin | Полный доступ, настройки, аудит, роли |
| instructor | Управление курсами, уроками, тестами, заданиями |
| student | Обучение, прогресс, тесты, сертификаты |
| curator | Проверка заданий, вопросы, риски по слушателям |
| super_curator | Распределение кураторов, риски потоков |
| customer_observer | Read-only отчёты по проекту/потоку |

# Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Pages     │  │ Route Handl. │  │ Server Act.  │      │
│  │  (app/*/)    │  │ (app/api/*)  │  │ (actions/*)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └─────────────────┼──────────────────┘              │
│                           ▼                                 │
│              ┌────────────────────────┐                     │
│              │  server/modules/*     │                     │
│              │  (domain services)    │                     │
│              └───────────┬────────────┘                     │
│                          ▼                                  │
│              ┌────────────────────────┐                     │
│              │    Prisma ORM + DB     │                     │
│              │    Redis (Upstash)     │                     │
│              │    S3 (MinIO/Supabase) │                     │
│              └────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

| Stack | Назначение | Статус |
|---|---|---|
| Next.js 16 | Full-stack implementation | Production |
| Prisma 7.8 | ORM | Production |
| PostgreSQL 17 | Database | Production |
| Auth.js 4 | Authentication | Production |
| Tailwind/shadcn | UI | Production |
| Redis (Upstash) | Rate limiting, cache | Production |
| S3 (Supabase/MinIO) | File storage | Production |
| Firebase Admin | Push notifications | Production |

# API

| Endpoint | Method | Назначение |
|---|---|---|
| `/api/v1/healthz` | GET | Liveness |
| `/api/v1/readyz` | GET | Readiness |
| `/api/v1/auth/register` | POST | `410 Gone` (self-reg disabled) |
| `/api/v1/auth/forgot-password` | POST | Запрос сброса |
| `/api/v1/auth/reset-password` | POST | Сброс пароля |
| `/api/v1/me` | GET | Текущий профиль |
| `/api/v1/courses` | GET/POST | Курсы |
| `/api/v1/courses/{id}` | GET/PATCH | Курс |
| `/api/v1/courses/{id}/modules` | POST | Модули |
| `/api/v1/modules/{id}/lessons` | POST | Уроки |
| `/api/v1/enrollments` | GET/POST | Зачисления |
| `/api/v1/quizzes/{id}/attempts` | POST | Попытка теста |
| `/api/v1/assignments/{id}/submissions` | POST | Сдача задания |
| `/api/v1/progress` | GET/POST | Прогресс |
| `/api/v1/certificates` | GET/POST | Сертификаты |
| `/api/v1/payments/checkout` | POST | `410 Gone` |
| `/api/v1/webhooks/stripe` | POST | `410 Gone` |
| `/api/v1/analytics` | GET | Аналитика |
| `/api/v1/audit-logs` | GET | Аудит |
| `/api/v1/notifications` | GET | Уведомления |
| `/api/v1/search` | GET | Поиск |
| `/api/v1/media/uploads` | POST | S3 presigned upload |
| `/api/v1/push/subscribe` | POST | Push subscription |

# Структура проекта

```
app/                    # Страницы и Route Handlers
  admin/               # Администратор
  instructor/          # Преподаватель
  student/             # Слушатель
  curator/             # Куратор
  super-curator/       # Супер-куратор
  customer-observer/   # Заказчик-наблюдатель
  api/v1/              # REST API
  (auth)/              # Аутентификация
components/
  admin/               # Компоненты админки
  auth/                # Аутентификация
  instructor/          # Компоненты преподавателя
  layout/              # AppShell, навигация
  lms/                 # Общие компоненты LMS
  ui/                  # Базовые UI (Radix/shadcn)
server/
  actions/             # Server Actions
  modules/             # Доменные сервисы
  auth/                # NextAuth config
lib/
  auth/                # Сессия, RBAC, пароли
  reports/             # CSV/XLSX/PDF генерация
prisma/                # Schema, migrations, seed
types/                 # TypeScript типы
proxy.ts               # Middleware (auth gate, CSRF)
```

# Безопасность

- Argon2id для паролей
- Auth.js JWT сессии
- Server-side RBAC (`requireRolePage`, `assertPermission`)
- Zod валидация на всех входных данных
- RLS на всех 55 таблицах
- Rate limiting (Redis + memory fallback)
- CSRF check в middleware (origin vs hostname)
- Content Security Policy в заголовках
- Sentry monitoring
- Аудит всех sensitive операций

# Связанные документы

- `docs/MASTER-PLAN.md` — полный план развития
- `docs/implementation-plan.md` — операционный план
- `docs/security.md` — security checklist
- `docs/DEVELOPER_GUIDE.md` — инструкция для разработчиков
- `docs/PLATFORM_SNAPSHOT.md` — архитектурный обзор
- `docs/updates.md` — журнал обновлений
