# Инструкция для разработчиков AI Strategic Academy

## О проекте

AI Strategic Academy — закрытая LMS (Learning Management System) для управления курсами, потоками, кураторами, прогрессом студентов, заданиями, сертификатами и отчётностью.

**Архитектура:** Next.js modular monolith с REST API, Prisma/PostgreSQL, Auth.js  
**Язык интерфейса:** Русский  
**Профиль:** Invite-only access (саморегистрация отключена)

---

## Быстрый старт

### 1. Подготовка окружения

```bash
# Скопируйте файл конфигурации
cp .env.example .env
```

Отредактируйте `.env` и задайте:
- `NEXTAUTH_SECRET` — минимум 32 случайных символа
- `DATABASE_URL` — строка подключения к PostgreSQL. При использовании Docker Compose: `postgresql://academy:<secret>@postgres:5432/academy?schema=public`. Порт PostgreSQL не публикуется наружу.
- Остальные параметры по необходимости (OAuth, SMTP, S3)

### 2. Безопасный локальный bootstrap

PowerShell:

```powershell
.\scripts\bootstrap.ps1
```

Linux/macOS shell:

```bash
sh scripts/bootstrap.sh
```

Скрипты поднимают зависимости через Docker Compose и выполняют Prisma generate, `db:push` и `db:seed` внутри app-контейнера. `db:push`, `db:seed` и `certificate:issue-demo` блокируют remote DB host по умолчанию; `ALLOW_REMOTE_DATABASE_MUTATION=true` нужен только для явно подтверждённой remote-мутации.

### 3. Запуск зависимостей (Docker Compose)

```bash
docker compose up -d postgres redis mailhog minio
```

**Важно:** PostgreSQL работает во внутренней сети Docker без публикации порта наружу. Для доступа из хоста используйте port-forward.

### 4. Ручная установка зависимостей и инициализация БД

```bash
npm install --legacy-peer-deps
docker compose run --rm app npm run db:generate
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:seed
```

### 5. Запуск разработки

```bash
npm run dev
```

Откройте `http://localhost:3000`

---

## Демо-аккаунты

После выполнения `db:seed` создаются следующие учётные записи:

| Роль | Email | Пароль |
|------|-------|--------|
| Admin | `admin@academy.local` | `Password123!` |
| Instructor | `instructor1@academy.local`, `instructor2@academy.local` | `Password123!` |
| Student | `student1@academy.local` … `student10@academy.local` | `Password123!` |
| Curator | `curator@academy.local` | `Password123!` |
| Super Curator | `supercurator@academy.local` | `Password123!` |
| Observer | `observer@academy.local` | `Password123!` |

---

## Ролевая модель

| Роль | Описание | Основные права |
|------|----------|----------------|
| `admin` | Администратор платформы | Полный доступ, настройки, аудит, управление ролями |
| `instructor` | Преподаватель | Управление курсами, модулями, уроками, тестами, заданиями |
| `student` | Студент | Обучение, просмотр прогресса, прохождение тестов, получение сертификатов |
| `curator` | Куратор | Проверка заданий, ответы на вопросы, мониторинг рисков студентов |
| `super_curator` | Старший куратор | Распределение кураторов по потокам, мониторинг рисков на уровне потока |
| `customer_observer` | Наблюдатель от заказчика | Read-only доступ к отчётам по проекту/потоку |

---

## Структура проекта

```
/workspace
├── app/                    # Next.js App Router: страницы и Route Handlers
│   ├── admin/             # Панель администратора
│   ├── instructor/        # Кабинет преподавателя
│   ├── student/           # Кабинет студента
│   ├── curator/           # Кабинет куратора
│   ├── super-curator/     # Кабинет старшего куратора
│   ├── customer-observer/ # Кабинет наблюдателя
│   └── api/               # REST API endpoints
├── server/                # Бизнес-логика (use-cases, services)
│   ├── actions/           # Server Actions
│   ├── auth/              # Аутентификация и авторизация
│   ├── graphql/           # GraphQL scaffolds
│   └── modules/           # Модули доменной области
│       ├── analytics/     # Аналитика и отчёты
│       ├── assignments/   # Задания и проверки
│       ├── audit/         # Журнал аудита
│       ├── auth/          # Логика аутентификации
│       ├── billing/       # Платежи (отключено, 410 Gone)
│       ├── certificates/  # Сертификаты
│       ├── course-builder/# Конструктор курсов
│       ├── courses/       # Курсы
│       ├── learning/      # Обучение
│       ├── notifications/ # Уведомления
│       ├── progress/      # Прогресс обучения
│       ├── quizzes/       # Тесты
│       ├── search/        # Поиск
│       └── users/         # Пользователи
├── lib/                   # Общие утилиты и typed helpers
├── prisma/                # Схема БД, миграции, seed-данные
├── services/              # Reference architecture микросервисов
├── infra/                 # Docker, Kubernetes шаблоны
├── components/            # React компоненты
├── locales/               # Локализация
├── public/                # Статические файлы
├── tests/                 # Тесты
└── docs/                  # Документация
```

---

## Доступные команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск сервера разработки |
| `npm run build` | Сборка production-версии |
| `npm run start` | Запуск production-сервера |
| `npm run lint` | Проверка ESLint |
| `npm run typecheck` | Проверка типов TypeScript |
| `npm run test` | Запуск unit-тестов (Vitest) |
| `npm run test:watch` | Тесты в режиме watch |
| `npm run test:e2e` | E2E тесты (Playwright) |
| `npm run db:generate` | Генерация Prisma Client |
| `npm run db:migrate` | Применение миграций БД |
| `npm run db:push` | Push схемы БД (для разработки) |
| `npm run db:seed` | Заполнение БД демо-данными |
| `npx prisma migrate reset` | Сброс БД (удаление всех данных) |
| `npm run certificate:issue-demo` | Локальная demo-выдача сертификата после seed |
| `npm run users:provision` | Провизион аккаунтов для production |
| `npm run verify` | Полная проверка: lint + typecheck + test + build |

---

## Провизион аккаунтов

Для закрытой академии саморегистрация отключена. Используйте скрипт провизиона:

```bash
npm run users:provision
```

По умолчанию создаётся:
- 4000 студентов
- 50 кураторов
- 1 старший куратор
- 1 администратор
- 1 наблюдатель заказчика

Результат записывается в `var/credentials/` (папка игнорируется Git).

**Важно:** CSV с паролями следует распространять через защищённый канал и удалять локальные копии после передачи.

---

## Архитектурные принципы

### Modular Monolith

- **UI** (`app/`) → **Route Handlers / Server Actions** → **Use-cases/Services** (`server/modules/`) → **Repositories** → **Database**
- Прямой доступ к Prisma из UI-компонентов запрещён
- RBAC проверяется на уровне сервера через `requirePermission()` и `requireRolePage()`

### Безопасность

- Пароли хешируются через Argon2id (`@node-rs/argon2`)
- Сессии управляются через Auth.js
- Все секреты только в environment variables
- PostgreSQL развёртывается как внутренний сервис без публичного порта
- Audit log фиксирует привилегированные действия

### Invite-only доступ

- Платёжные endpoints (`/api/v1/payments/checkout`, `/api/v1/webhooks/stripe`) возвращают `410 Gone`
- Доступ осуществляется по инвайт-ссылкам или через провизион аккаунтов

---

## API Endpoints

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/v1/healthz` | GET | Liveness probe |
| `/api/v1/readyz` | GET | Readiness probe |
| `/api/v1/me` | GET | Текущий профиль пользователя |
| `/api/v1/courses` | GET/POST | Список/создание курсов |
| `/api/v1/courses/{id}` | GET/PATCH | Получение/обновление курса |
| `/api/v1/enrollments` | GET/POST | Зачисления на курсы |
| `/api/v1/quizzes/{id}/attempts` | POST | Попытка прохождения теста |
| `/api/v1/assignments/{id}/submissions` | POST | Отправка задания на проверку |
| `/api/v1/progress` | GET/POST | Прогресс обучения |
| `/api/v1/certificates` | GET/POST | Сертификаты |
| `/api/v1/analytics` | GET | Аналитика и отчёты |
| `/api/v1/audit-logs` | GET | Журнал аудита |
| `/api/v1/notifications` | GET | Уведомления |
| `/api/v1/search` | GET | Поиск по платформе |

Полная спецификация: [`docs/api/openapi.yaml`](docs/api/openapi.yaml)  
GraphQL схема: [`docs/api/graphql-schema.graphql`](docs/api/graphql-schema.graphql)

---

## База данных

### Основные таблицы

- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `courses`, `modules`, `blocks`, `lessons`, `lesson_media`
- `cohorts`, `cohort_deadlines`, `enrollments`
- `lesson_progress`, `block_progress`, `module_progress`, `course_progress`
- `quizzes`, `quiz_questions`, `quiz_attempts`
- `assignments`, `assignment_submissions`
- `certificates`, `certificate_templates`
- `invite_links`, `notifications`, `audit_logs`, `consent_logs`

См. полную схему: [`prisma/schema.prisma`](prisma/schema.prisma)

---

## Разработка новых функций

### 1. Создание модуля

Новые функции размещайте в `server/modules/<module-name>/`:

```typescript
// server/modules/courses/course-service.ts
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/server/auth/permissions';

export async function createCourse(input: CreateCourseInput, actorId: string) {
  await requirePermission(['courses:write'], actorId);
  
  const course = await prisma.course.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      // ...
    },
  });
  
  return course;
}
```

### 2. Добавление API endpoint

```typescript
// app/api/v1/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createCourse } from '@/server/modules/courses/course-service';
import { getSession } from '@/server/auth/session';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  const course = await createCourse(body, session.user.id);
  
  return NextResponse.json(course);
}
```

### 3. Валидация данных

Используйте Zod для валидации входных данных:

```typescript
import { z } from 'zod';

const CreateCourseSchema = z.object({
  slug: z.string().min(3).max(50),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  durationHours: z.number().int().positive().optional(),
});

type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
```

### 4. Проверка прав доступа

```typescript
// Проверка разрешения
await requirePermission(['courses:write'], userId);

// Проверка роли для страницы
import { requireRolePage } from '@/server/auth/role-guards';

export default async function InstructorDashboard() {
  await requireRolePage(['instructor', 'admin']);
  // ...
}
```

---

## Тестирование

### Unit-тесты

```bash
npm run test
```

Тесты находятся в `tests/` и рядом с тестируемым кодом (`*.test.ts`).

### E2E тесты

```bash
npm run test:e2e
```

Конфигурация: [`playwright.config.ts`](playwright.config.ts)

---

## Развёртывание

### Docker Compose (Production на VPS)

```bash
# Миграции и провизион внутри контейнера
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run users:provision

# Запуск приложения
docker compose up app
```

### Kubernetes

Шаблоны манифестов находятся в `infra/k8s/`:
- Deployment, Service, ConfigMap, Secret
- NetworkPolicy для изоляции PostgreSQL
- Ingress для внешнего доступа

---

## Мониторинг и логирование

- Health endpoints: `/api/v1/healthz`, `/api/v1/readyz`
- Audit logs: все привилегированные действия записываются в `audit_logs`
- Sentry: настроен через `sentry.client.config.ts`, `sentry.server.config.ts`

---

## Важные замечания

1. **Не коммитьте секреты:** `.env` игнорируется, используйте `.env.example` как шаблон
2. **PostgreSQL не публикуется наружу:** доступ только из контейнера приложения
3. **Платежи отключены:** endpoints возвращают `410 Gone`
4. **RBAC на сервере:** никогда не полагайтесь на клиентскую проверку прав
5. **Argon2id для паролей:** не используйте другие алгоритмы хеширования
6. **CSV с паролями:** удаляйте после передачи пользователям

---

## Staging-окружение

Ветка `staging` автоматически деплоится в preview на Vercel при пуше.

### Настройка (однократно)

1. Создать ветку: `git checkout -b staging main && git push origin staging`
2. В Vercel Dashboard → Add New Project → импортировать этот же репозиторий
3. Установить Framework: Next.js
4. В Environment Variables добавить переменные с суффиксом `_STAGING`:
   - `DATABASE_URL_STAGING` — URL БД для staging (отдельный Supabase проект)
   - `NEXT_PUBLIC_SITE_URL_STAGING` — URL деплоя
   - Остальные переменные можно скопировать из production
5. Установить Branch: `staging`
6. Deploy

После настройки каждый push в `staging` создаёт preview-деплой с URL вида `project-name-git-staging-*.vercel.app`.

## Документация

- [Assumptions](docs/assumptions.md) — предположения и ограничения
- [Specification](docs/specification.md) — полная спецификация системы
- [Security](docs/security-review.md) — модель безопасности и аудит
- [TODO](docs/todo.md) — план развития
- [AI Agent Roles](docs/archive/ai-agent-roles.md) — роли AI-агентов (архив)
- [Updates](docs/updates.md) — журнал обновлений
- [MASTER-PLAN](docs/MASTER-PLAN.md) — стратегический план

---

## Контакты и поддержка

Вопросы по разработке направляйте через issue tracker репозитория.
