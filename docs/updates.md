# Журнал обновлений AI Strategic Academy

Правило: новые записи добавляются сверху. Старые записи не переписываются, кроме исправления явной опечатки. Каждая запись должна быть достаточно конкретной, чтобы следующий AI-агент или инженер понял, что изменилось и что проверено.

## 2026-05-13 — Credentials login accepts lowercase active status

Автор/agent: Codex
Тип изменения: bugfix / auth

Файлы/модули:

- `server/auth/options.ts` — credentials and OAuth sign-in now use normalized active-status check instead of strict `"ACTIVE"`.
- `lib/auth/user-status.ts` — added shared `isActiveUserStatus()` helper.
- `tests/unit/user-status.test.ts` — added coverage for `active`, `ACTIVE`, inactive and missing statuses.
- `tests/unit/auth-options.test.ts` — added regression coverage for credentials login with Prisma default `status = "active"`.

Summary:

- Fixed production credentials login returning `401 Unauthorized` for valid issued users when database rows use the Prisma default `status = "active"`.
- Kept compatibility with uppercase `"ACTIVE"` rows so existing data does not need an immediate migration.

Проверки:

- `npm run lint` — passed
- `npx vitest run tests/unit/auth-options.test.ts tests/unit/user-status.test.ts tests/integration/login.test.ts` — passed
- `npm run test` — 104 passed, 23 test files
- `npm run typecheck` — passed

Риски:

- Production still returns 401 if the target user was not provisioned/seeded or has no password hash.
- The Vercel deployment must be rebuilt before the deployed URL reflects this fix.

Next steps:

- Redeploy Vercel after merging/pushing this change.
- If login still fails after redeploy, verify production DB contains the expected user and a non-empty `password_hash`.

## 2026-05-12 — 8-PR stabilization: build fix, seed/auth, notifications, progress, assignment/quiz access, student UX, reports scoping

Автор/agent: big-pickle
Тип изменения: stabilization / bugfix / security

Файлы/модули:

- `package.json` — eslint-config-next reverted to ^15.5.18 (compatible with next 16.2.5)
- `eslint.config.mjs` — reverted to FlatCompat format
- `app/instructor/questions/page.tsx` — removed unused CardTitle import
- `app/api/seed-temp/route.ts` — rewritten: SEED_ADMIN_TOKEN auth, deterministic password, no secret logging
- `.env.example` — SEED_USER_PASSWORD → SEED_ADMIN_TOKEN
- `server/modules/notifications/service.ts` — removed `|| !input.channel` from email condition
- `server/modules/progress/service.ts` — added `getCompletionBasis<T>` helper, applied to module/course progress
- `server/modules/assignments/service.ts` — enrollment check + courseId resolution from lesson.module.courseId in `submitAssignment`
- `server/modules/quizzes/service.ts` — courseId resolution from lesson, unswallowed progress sync error
- `components/lms/student-lesson-view.tsx` — `normalizeVideoUrl` helper, toast error handling in `askQuestion`
- `app/api/v1/reports/route.ts` — rewritten `getScopedStudentIds` with per-role scoping (admin, curator, super_curator, instructor, customer_observer), removed duplicate inline scoping
- `tests/unit/assignments.test.ts` — updated mocks for enrollment check

Summary:

- **PR-1 (Green main):** Fixed build by reverting eslint-config-next from 16.2.5 to ^15.5.18, restored FlatCompat config, removed unused CardTitle import.
- **PR-2 (Seed/auth):** Replaced catch-22 `requireUser("settings:manage")` with SEED_ADMIN_TOKEN check, deterministic password, no secret logging.
- **PR-3 (Notifications):** Default in_app channel no longer triggers email (removed `|| !input.channel`).
- **PR-4 (Progress):** Generic `getCompletionBasis<T>` helper uses `isRequired=true` lessons when any exist; applied to module/course progress.
- **PR-5 (Assignment access):** Resolves courseId from `assignment.lesson.module.courseId`, checks active enrollment, throws 403 if not enrolled.
- **PR-6 (Quiz access):** Resolves courseId from lesson when `quiz.courseId` is null, unswallowed progress sync error.
- **PR-7 (Student UX):** YouTube URL normalization (watch?v= → /embed/), toast.error/success on askQuestion, try-catch, sending disabled state.
- **PR-8 (Reports scoping):** Rewritten `getScopedStudentIds` with explicit per-role Prisma queries; customer_observer denied all data.

Проверки:

- `npm run typecheck` — passed
- `npm run lint -- --max-warnings=0` — passed
- `npm run test` — 93 passed, 20 test files
- `npm run build` — passed

Риски:

- SEED_ADMIN_TOKEN is a dev-only bootstrap; must not be used in production.
- customer_observer currently has no cohort/project linkage; scoped to empty array (safe default).
- Reports scoping depends on correct role assignment in the database.

Next steps:

- Wire transactional email provider (SMTP) for password reset and verification flows.
- Add production backup jobs and restore runbooks.
- Add test coverage for reports scoping edge cases (multi-role users, customer_observer cohorts).

## 2026-05-12 — Instructor questions and reports, analytics tabs, curator/instructor settings

Автор/agent: big-pickle
Тип изменения: feature / UI / analytics
Файлы/модули:

- `app/instructor/questions/page.tsx` — full forwarded questions UI with answer form
- `app/instructor/reports/page.tsx` — report export cards with fixed href template
- `app/instructor/analytics/page.tsx` — added "По тестам" tab with per-quiz avg score
- `app/admin/analytics/page.tsx` — added "По пользователям" tab with role distribution, recent registrations
- `app/curator/settings/page.tsx` — реализованы вкладки Профиль/Уведомления/Безопасность
- `app/instructor/settings/page.tsx` — реализованы вкладки Профиль/Уведомления/Безопасность
- `app/student/certificates/page.tsx` — fixed PDF download link `/api/certificates` → `/api/v1/certificates`
- `components/layout/navigation.ts` — added "Отчёты" nav item for instructor
- `components/ui/textarea.tsx` — new UI component
- `server/actions/curator.ts` — fixed syntax errors ({{ }}, \r\n), added missing findUnique, converted answerForwardedQuestionAction to FormData, preserved curatorId on instructor answer
- `server/actions/dashboard.ts` — added getForwardedQuestions(), extended getInstructorAnalytics with per-quiz stats
- `server/modules/notifications/service.ts` — added `question_forwarded` event type
- `server/modules/learning/service.ts` — added notification to curator on student question
- `app/api/v1/reports/route.ts` — added instructor role scoping to reports API

Summary:

- Реализован полный цикл вопросов: студент → куратор → инструктор с уведомлениями
- Страница отчётов инструктора с экспортом CSV/Excel/PDF
- Страницы настроек куратора и инструктора (3 вкладки: профиль, уведомления, безопасность)
- Аналитика "По пользователям" для админа (распределение ролей, последние регистрации)
- Аналитика "По тестам" для инструктора (средний балл по каждому тесту)
- Исправлены синтаксические ошибки в server/actions/curator.ts
- Добавлен UI-компонент Textarea

Проверки:

- `npx tsc --noEmit` — прошёл успешно
- `npx vitest run` — 93 passed, 20 test files

Риски:

- Instructor analytics "По тестам" загружает все попытки тестов; при большом количестве может быть медленно (можно добавить пагинацию позднее)
- Настройки профиля используют статические placeholder-данные (name/email), т.к. не подключены к серверу для сохранения

Next steps:

- Подключить mutation actions для сохранения профиля и смены пароля
- Добавить Redis-backed rate limiting
- Production deployment validation

Автор/agent: Codex
Тип изменения: infra / security / learning / verification
Файлы/модули:

- `docker-compose.yml`
- `.env.example`
- `infra/k8s/postgres.yaml`
- `infra/k8s/networkpolicy.yaml`
- `infra/k8s/secret.template.yaml`
- `lib/auth/role-redirect.ts`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/student/courses/[courseId]/page.tsx`
- `app/student/modules/[moduleId]/page.tsx`
- `app/student/lessons/[lessonId]/page.tsx`
- `server/modules/learning/service.ts`
- `server/modules/analytics/service.ts`
- `docs/assumptions.md`
- `docs/security.md`
- `docs/todo.md`

Summary:

- Главная страница академии закреплена как форма входа; landing/marketing слой не используется.
- После входа пользователь направляется в дашборд по своей роли через серверный role redirect.
- База данных переведена в self-hosted модель: PostgreSQL запускается как внутренний сервис платформы, без публичного порта в Docker Compose.
- Kubernetes получил `academy-postgres` StatefulSet, ClusterIP Service и NetworkPolicy, разрешающую доступ к БД только pod-ам приложения.
- `DATABASE_URL`, `POSTGRES_PASSWORD` и MinIO credentials документированы как внутренние секреты, не предназначенные для Git или публичных консолей.
- Credentials login теперь принимает только активных пользователей; отключённый аккаунт не может войти даже с правильным паролем.
- Learning flow подключен к server-side service: курс, модуль и урок проверяют активное enrollment, sequential lock и показывают реальные lesson/progress данные.
- Readiness endpoints теперь возвращают typed `503 service_unavailable`, если self-hosted PostgreSQL недоступен из runtime, вместо generic `500`.

Проверки:

- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run test` — прошёл успешно: 9 test files, 13 tests.
- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run build` — прошёл успешно.

Риски:

- Локальное создание 4053 аккаунтов через `npm.cmd run users:provision` требует запущенный внутренний PostgreSQL и реальный `.env`; CSV с паролями пишется только в ignored `var/credentials`.
- Админский доступ к самой БД остаётся операционной процедурой: через защищённый shell/port-forward/bastion, а не через публичный DB UI.
- Для production нужен backup/restore runbook и регулярная проверка восстановления.

Next steps:

- Запустить self-hosted PostgreSQL через Docker/K8s/VPS, применить миграции и seed.
- Выполнить `npm.cmd run users:provision` в закрытой среде и передать CSV через защищённый канал.
- Добавить backup jobs, restore rehearsal и admin-only operational access procedure.

## 2026-05-07 — Issued credentials вместо публичной регистрации

Автор/agent: Codex
Тип изменения: auth / user provisioning / documentation
Файлы/модули:

- `scripts/provision-users.ts`
- `app/register/page.tsx`
- `app/api/v1/auth/register/route.ts`
- `app/login/page.tsx`
- `components/auth/register-form.tsx`
- `.env.example`
- `.gitignore`
- `README.md`
- `docs/api/openapi.yaml`
- `docs/specification.md`
- `docs/implementation-plan.md`
- `tests/integration/auth-register-disabled.test.ts`
- `tests/integration/seed.test.ts`

Summary:

- Публичная self-registration модель отключена: `/api/v1/auth/register` возвращает typed `410 Gone`, `/register` объясняет, что аккаунты выдаёт академия.
- Удалена UI-форма регистрации и ссылка "Регистрация" со страницы входа.
- Добавлен `npm.cmd run users:provision` для создания 4000 слушателей, 50 кураторов, главного куратора, администратора и наблюдающего.
- Скрипт создаёт/обновляет роли и permissions, создаёт email/password аккаунты и пишет credentials CSV в ignored `var/credentials`.
- Добавлены env-параметры `PROVISION_STUDENT_COUNT`, `PROVISION_CURATOR_COUNT`, `PROVISION_EMAIL_DOMAIN`, `PROVISION_OUTPUT_DIR`, `PROVISION_RESET_EXISTING_PASSWORDS`.

Проверки:

- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run test` — прошёл успешно: 9 test files, 13 tests.
- `npm.cmd run build` — прошёл успешно.
- `npm.cmd run users:provision` — не выполнил создание аккаунтов, потому что текущий `DATABASE_URL` из `.env` недоступен с этой машины.

Риски:

- Credentials CSV содержит реальные временные пароли; директория `var/` добавлена в `.gitignore` и не должна коммититься.
- Для production нужно сначала настроить `DATABASE_URL` и применить миграции, затем запускать provisioning.
- Если используется Supabase, нужен доступный из среды запуска pooler/direct URL; текущий direct DB endpoint не принимает подключение из этой среды.

Next steps:

- Запустить `npm.cmd run users:provision` против production PostgreSQL только после проверки сетевого доступа к `DATABASE_URL`.
- Перед выдачей пользователям хранить CSV в защищённом канале и удалить локальную копию после операционной передачи.

## 2026-05-07 — P0 защита role pages и отключение production mock fallback

Автор/agent: Codex
Тип изменения: security / auth / production hardening
Файлы/модули:

- `lib/auth/page-guards.ts`
- `middleware.ts`
- `app/403/page.tsx`
- `app/{admin,student,curator,instructor,super-curator,customer-observer}/page.tsx`
- `components/lms/dashboard-unavailable.tsx`
- `components/auth/login-form.tsx`
- `server/auth/options.ts`
- `server/auth/provider-flags.ts`
- `server/modules/auth/service.ts`
- `server/modules/progress/service.ts`
- `.env.example`

Summary:

- Добавлен `requireRolePage()` и server-side role guard для основных кабинетов ролей.
- Добавлен `middleware.ts` для базового отсечения приватных route prefixes до входа.
- Production mock fallback отключён: фейковые dashboard data используются только при `NEXT_PUBLIC_DEMO_MODE=true`; иначе показывается явное состояние недоступности данных.
- Добавлена `/403` страница для аккаунтов без нужной роли.
- OAuth providers и кнопки Google/GitHub подключаются только при наличии реальных client id/secret.
- Регистрация теперь создаёт роль `student`, если seed ещё не создал её в новой базе.
- `markLessonProgress()` требует active enrollment и блокирует ручное прохождение sequential-уроков без предыдущих обязательных lessons.

Проверки:

- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run build` — требуется финальный повтор после записи.
- `npm.cmd run test` — требуется финальный повтор; ранее локально мог блокироваться sandbox `spawn EPERM`.

Риски:

- Живой Vercel URL `https://academic-silk-ten.vercel.app` сейчас отвечает `500` на `/api/readyz`, что указывает на отсутствующий/неготовый production `DATABASE_URL` или неприменённые миграции.
- `/api/auth/providers` на живом URL отвечает, но `/api/auth/session` и регистрация будут зависеть от готовности БД.

Next steps:

- Настроить Vercel env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL`.
- Выполнить `npm.cmd run db:migrate` и `npm.cmd run db:seed` против managed PostgreSQL.
- После деплоя проверить `/api/readyz`, `/login`, `/register`, `/admin`, `/student`.

## 2026-05-07 — Стабилизация GitHub/Vercel и invite-only контракта

Автор/agent: Codex
Тип изменения: CI/CD / Vercel / runtime / documentation
Файлы/модули:

- `.github/workflows/ci.yml`
- `vercel.json`
- `package.json`, `package-lock.json`
- `app/student/lessons/[lessonId]/page.tsx`
- `app/{admin,curator,customer-observer,instructor,student,super-curator}/page.tsx`
- `app/api/v1/payments/checkout/route.ts`
- `app/api/v1/webhooks/stripe/route.ts`
- `server/auth/options.ts`
- `server/modules/analytics/service.ts`
- `server/modules/billing/service.ts`
- `lib/auth/rbac.ts`
- `docs/api/openapi.yaml`
- `docs/specification.md`
- `docs/security.md`
- `docs/assumptions.md`
- `services/*`

Summary:

- Исправлены TypeScript и ESLint blockers, из-за которых падали GitHub Actions и Vercel build.
- `payments:manage` заменён на `invites:manage`; платежные endpoints теперь возвращают typed `410 Gone`, а не generic runtime error.
- Аналитика больше не обращается к удалённой `Payment` модели и отдаёт invite metrics вместе с backward-compatible `revenueCents: 0`.
- Stripe dependency удалена из runtime dependencies; текущий production contract зафиксирован как invite-only.
- CI усилен: `npm run lint -- --max-warnings=0` запускается до typecheck/test/build, Vercel использует `npm ci`.
- Документация, OpenAPI и microservices reference синхронизированы с invite-only моделью.
- Role dashboards помечены `force-dynamic`, чтобы Vercel build не выполнял Prisma-запросы без `DATABASE_URL` во время static generation.

Проверки:

- `npm.cmd run db:generate` — прошёл успешно.
- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run test` — локально блокируется sandbox `spawn EPERM`; escalated повтор в этой сессии был отклонён auto-review лимитом, поэтому финальный статус зависит от GitHub Actions.
- `npm.cmd run build` — прошёл успешно; role dashboards теперь собираются как dynamic routes без Prisma `DATABASE_URL` noise во время build.

Риски:

- Vercel Production/Preview требуют реальные `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL` и OAuth secrets при наличии; значения не коммитятся.
- До подключения managed PostgreSQL `readyz` будет зависеть от доступности `DATABASE_URL`.
- Browser plugin ранее мог не стартовать в Codex runtime; если повторится, smoke нужно выполнить Playwright fallback и зафиксировать отдельной записью.

Next steps:

- Запушить ветку `codex/stabilize-github-vercel`, открыть PR в `ElazAzel/academic`.
- Проверить GitHub Actions job `verify` и Vercel Preview.
- После merge настроить production env, выполнить миграции/seed против managed PostgreSQL и проверить production deployment.

## 2026-05-07 — Server Actions, полные суб-страницы ролей, страницы курсов/уроков

Автор/agent: Antigravity
Тип изменения: feature — backend actions, full pages

### Что сделано

1. **Server Actions** — `server/actions/dashboard.ts`
   - `getStudentDashboard()` — реальные Prisma-запросы для слушателя (enrollments, progress, questions)
   - `getCuratorDashboard()` — вопросы, задания, риски слушателей куратора
   - `getSuperCuratorDashboard()` — нагрузка кураторов, потоки
   - `getAdminDashboard()` — курсы, потоки, инвайты, сертификаты
   - `safeQuery()` wrapper: graceful fallback если БД недоступна

2. **Server Actions** — `server/actions/courses.ts`
   - `getCourseForStudent(courseId)` — курс с модулями, уроками и прогрессом
   - `getLessonForStudent(lessonId)` — урок с медиа, тестами, заданиями
   - `askCuratorQuestion(lessonId, text)` — задать вопрос куратору

3. **Страница курса слушателя** — `app/student/courses/[courseId]/page.tsx`
   - Прогресс-бар курса с инструкторами
   - Цель курса и порог сертификации
   - Модули: развёрнутые уроки, иконки типов, статусы (✓ / ▶ / 🔒)
   - Sequential lock визуализация
   - Навигация по урокам

4. **Страница урока слушателя** — `app/student/lessons/[lessonId]/page.tsx`
   - YouTube видео embed (16:9 responsive)
   - Текстовый контент (blocks)
   - Прикреплённые файлы
   - Тест: карточка с кнопкой "Пройти тест"
   - "Задать вопрос куратору": форма + история вопросов
   - Навигация: ← предыдущий / следующий → урок
   - Breadcrumb: Мои курсы > Курс > Модуль

5. **Суб-страницы куратора:**
   - `app/curator/students/page.tsx` — таблица слушателей с прогрессом, рисками
   - `app/curator/questions/page.tsx` — открытые/отвеченные вопросы
   - `app/curator/assignments/page.tsx` — задания на проверку
   - `app/curator/risks/page.tsx` — риски слушателей

6. **Суб-страницы супер-куратора:**
   - `app/super-curator/curators/page.tsx` — таблица кураторов
   - `app/super-curator/distribution/page.tsx` — назначение кураторов нераспределённым слушателям
   - `app/super-curator/risks/page.tsx` — риски по потокам
   - `app/super-curator/reports/page.tsx` — отчёты с кнопками скачивания

7. **Суб-страницы администратора:**
   - `app/admin/invites/page.tsx` — полная страница инвайтов (создание формы + таблица + copy/delete)
   - `app/admin/users/page.tsx` — таблица пользователей + импорт Excel
   - `app/admin/courses/page.tsx` — сетка курсов с кнопкой создания
   - `app/student/my-courses/page.tsx` — реальный список курсов

8. **Документация** — `docs/QUICKSTART.md`
   - Docker setup, Prisma migrate, seed, тестовые аккаунты

**Файлы (новые)**: 14 файлов
**Файлы (перезаписаны)**: 3 файла

## 2026-05-07 — Удаление Stripe/billing, полные дашборды ролей, доменные типы

Автор/agent: Antigravity (Planning Mode)
Тип изменения: **breaking** — schema, UI, architecture

### Список изменений

1. **Billing удалён.** Платформа использует invite-доступ (InviteLink + выданные credentials).
   - Удалены: `PaymentStatus`, `PaymentType` enum, `Payment` model из Prisma schema
   - Удалены: `STRIPE_*` переменные из `lib/env.ts` и `.env.example`
   - `server/modules/billing/service.ts` → stub (throws "disabled")
   - `app/api/v1/payments/checkout/route.ts` → disabled stub
   - `app/api/v1/webhooks/stripe/route.ts` → disabled stub
   - `app/admin/payments/page.tsx` → redirect to invite management
   - Seed: `payments:manage` → `invites:manage`

2. **Доменные типы** — `types/domain.ts`
   - 30+ TypeScript интерфейсов: CourseSummary, ModuleDetail, LessonDetail, StudentProgress, ContinueLearning, QuizSummary, AssignmentSummary, SubmissionForReview, QuestionFromStudent, RiskItem, CuratorLoad, CohortSummary, CertificateSummary, InviteLinkSummary, DashboardMetric
   - Enums: RoleKey, CourseStatus, ProgressStatus, EnrollmentStatus, SubmissionStatus, RiskType, RiskSeverity
   - ROLE_LABELS, RISK_LABELS — локализованные словари

3. **Mock-данные** — `lib/mock-data.ts`
   - Typed mock данные для всех ролей: курсы, прогресс, вопросы, задания, риски, кураторы, потоки, сертификаты, инвайты
   - Функции метрик: getStudentMetrics, getCuratorMetrics, getSuperCuratorMetrics, getAdminMetrics, getInstructorMetrics, getObserverMetrics

4. **UI-компоненты** — новые:
   - `components/ui/avatar.tsx` — инициалы + image
   - `components/ui/tabs.tsx` — animated tab switcher
   - `components/ui/table.tsx` — full table suite (Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
   - `components/ui/skeleton.tsx` — loading placeholder
   - `components/ui/separator.tsx` — divider

5. **Dashboard widgets** — `components/lms/dashboard-widgets.tsx` полная перезапись:
   - MetricGrid, ContinueLearningCard, CourseProgressGrid, CourseManageGrid, QuestionsQueue, SubmissionsQueue, RisksList, CuratorLoadTable

6. **Универсальный AppShell** — `components/layout/app-shell.tsx`
   - Role-based sidebar навигация для 6 ролей
   - Badge с текущей ролью
   - Полные меню: student(7), curator(6), super_curator(6), instructor(7), admin(9), customer_observer(4)

7. **Полные дашборды ролей:**
   - `app/student/page.tsx` — MetricGrid + ContinueLearningCard + табы (Курсы, Ответы куратора, Дедлайны, Уведомления)
   - `app/curator/page.tsx` — MetricGrid + табы (Вопросы, Задания, Риски)
   - `app/super-curator/page.tsx` — MetricGrid + табы (Нагрузка кураторов, Потоки, Риски, Нераспределённые)
   - `app/admin/page.tsx` — MetricGrid + action buttons + табы (Курсы, Потоки, Инвайты, Сертификаты, Аудит)
   - `app/instructor/page.tsx` — MetricGrid + табы (Мои курсы, Аналитика, Вопросы от кураторов)
   - `app/customer-observer/page.tsx` — MetricGrid + прогресс потоков + табы (Сертификаты, Отчёты)

### Проверки

- [ ] `npm run typecheck` — нет TS ошибок (TODO: запустить локально)
- [ ] `npm run build` — production build проходит
- [ ] Visually verify all 6 dashboards in browser

### Риски

- Breaking: Payment model удалён из schema, нужен `npx prisma migrate dev` для сброса текущей БД
- Billing API routes — stubs, но файлы остаются для обратной совместимости
- Все суб-страницы (settings, courses, lessons) всё ещё используют WorkspacePage shell

### Следующие шаги

- Запустить PostgreSQL через Docker, `prisma migrate dev`, `prisma db seed`
- Заменить mock-данные в дашбордах на server actions с реальной БД
- Реализовать страницы курсов и уроков для слушателя
- Добавить instructor course editor

## 2026-05-07 — Подготовлена публикация проекта в GitHub

Автор/agent: Codex  
Тип изменения: repository operations / documentation  
Файлы/модули:

- `LICENSE`
- `.git/config`
- `docs/updates.md`
- `docs/implementation-plan.md`

Summary:

- Remote `Academic` переименован в стандартный `origin` для корректной работы git tooling и cloud task diff.
- Удалённая ветка `main` из `https://github.com/ElazAzel/academic` подтянута локально.
- Initial commit удалённого репозитория с `LICENSE` объединён с локальной историей через merge без force-push.
- Локальный проект опубликован в `origin/main`.

Проверки:

- `git status --short --branch` показал чистую ветку `main` перед операцией.
- `git fetch origin main` прошёл успешно.
- `git merge FETCH_HEAD --allow-unrelated-histories --no-edit` прошёл успешно и добавил `LICENSE`.
- `git push -u origin main` прошёл успешно, ветка `main` теперь отслеживает `origin/main`.

Риски:

- Истории локального проекта и удалённого initial commit были unrelated; решено через обычный merge, чтобы сохранить удалённый `LICENSE`.
- Дальнейшие push/fetch операции всё ещё зависят от доступной GitHub-аутентификации в локальном окружении.

Next steps:

- Использовать `origin/main` как upstream для дальнейших задач и cloud diff.
- При следующих изменениях продолжать обновлять этот журнал и план реализации.

## 2026-05-07 — Добавлены auth UI flow и публичная проверка сертификатов

Автор/agent: Codex  
Тип изменения: runtime / UI / API / documentation  
Файлы/модули:

- `components/auth/*`
- `app/forgot-password/page.tsx`
- `app/reset-password/page.tsx`
- `app/verify-email/page.tsx`
- `app/certificates/verify/[verificationCode]/page.tsx`
- `app/api/v1/certificates/verify/[verificationCode]/route.ts`
- `server/modules/certificates/service.ts`
- `docs/api/openapi.yaml`
- `docs/implementation-plan.md`

Summary:

- Подключена форма восстановления пароля к `/api/v1/auth/forgot-password`.
- Добавлены страницы сброса пароля и подтверждения email с поддержкой `?token=...`.
- Добавлена публичная страница проверки сертификата по verification code.
- Добавлен REST endpoint публичной проверки сертификата без раскрытия email и внутренних данных слушателя.
- OpenAPI и implementation plan обновлены под новый API/UI срез.

Проверки:

- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- `npm.cmd run test` прошёл успешно: 8 test files, 11 tests. В sandbox запуск упёрся в `spawn EPERM`, повторный escalated запуск прошёл.
- `npm.cmd run build` прошёл успешно, включая новые routes `/reset-password`, `/verify-email`, `/certificates/verify/[verificationCode]` и `/api/v1/certificates/verify/[verificationCode]`.

Риски:

- Email delivery остаётся scaffold: reset/verify tokens создаются, но production SMTP/provider ещё не подключён.
- Certificate template assets и финальный visual PDF остаются production-hardening.

Next steps:

- Подключить transactional email provider и шаблоны писем для reset/verify flows.
- Добавить public certificate verification smoke/e2e после подключения тестовой БД.

## 2026-05-07 — Добавлен agent-операционный слой документации

Автор/agent: Codex  
Тип изменения: documentation / AI operations  
Файлы/модули:

- `docs/implementation-plan.md`
- `docs/updates.md`
- `ai/roles/*`
- `skills/**/*/SKILL.md`

Summary:

- Создан план реализации проекта с доменным backlog, статусами и правилом обновления документации при каждом изменении.
- Создан журнал обновлений с шаблоном записи.
- Создана папка AI-ролей для распределения задач между специализированными агентами.
- Созданы переносимые skills для Codex и Antigravity в формате `SKILL.md`.

Проверки:

- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- Проверка `skills/**/*/SKILL.md` на наличие YAML frontmatter `name` и `description` прошла успешно.

Риски:

- Skills являются проектными инструкциями и не устанавливаются автоматически в глобальные каталоги Codex/Antigravity.
- При изменениях проекта агенты должны дисциплинированно обновлять этот журнал вручную.

Next steps:

- При следующем runtime/code изменении обновить эту запись или добавить новую сверху.
- Если skills начнут использоваться в конкретном IDE, при необходимости добавить symlink/copy instructions под выбранный toolchain.

## 2026-05-07 — Bootstrap проекта LMS

Автор/agent: Codex  
Тип изменения: repository bootstrap / architecture / runtime scaffold  
Файлы/модули:

- `app/`, `components/`, `server/`, `lib/`, `prisma/`, `tests/`
- `docs/`, `infra/`, `services/`, `.github/workflows/ci.yml`
- `Dockerfile`, `docker-compose.yml`, `.env.example`, `package.json`

Summary:

- Создан runnable Next.js modular monolith для закрытой LMS AI Strategic Academy.
- Добавлены REST endpoints, GraphQL schema scaffold, Prisma schema, seed data, tests, Docker/Compose/K8s/CI templates.
- Добавлены роли academy-ru-closed: admin, instructor, student, curator, super_curator, customer_observer.

Проверки:

- `npm.cmd run db:generate` прошёл успешно.
- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- `npm.cmd run test` прошёл успешно: 8 test files, 11 tests.
- `npm.cmd run build` прошёл успешно.

Риски:

- `.npmrc` использует `legacy-peer-deps=true`, потому что NextAuth stable `4.24.x` не объявляет peer support для Next `16`.
- Docker runtime не проверен локально из-за отсутствия Docker CLI.
- Production email, push, backup, storage upload signing и advanced reporting остаются в `docs/todo.md`.

Next steps:

- Подключить реальную PostgreSQL среду и выполнить миграции/seed.
- Пройти auth flow end-to-end на dev server.
- Начать MVP hardening по `docs/implementation-plan.md`.

## Шаблон записи

```markdown
## YYYY-MM-DD — Краткое название изменения

Автор/agent:
Тип изменения:
Файлы/модули:

- `path/or/module`

Summary:

- Что изменилось.

Проверки:

- Какая команда или ручной сценарий выполнены.

Риски:

- Что может сломаться или требует внимания.

Next steps:

- Что сделать дальше.
```
## 2026-05-07 — Login-first academy, course passing core, private self-hosted DB

Автор/agent: Codex  
Тип изменения: feature/security/infra

### Что изменено

- Главная страница `/` стала страницей входа; отдельной посадочной страницы академии больше нет.
- После входа пользователь перенаправляется в типовой кабинет по своей роли.
- Добавлен server-side learning service: active enrollment, sequential lock, реальные страницы курса/модуля/урока, отметка урока пройденным и вопрос куратору.
- Добавлен API назначения ролей: админ может назначать все роли, главный куратор — только учебные/операционные роли без доступа к `admin`.
- Docker Compose переведен на private PostgreSQL: порт БД не публикуется наружу, доступ есть только у app-контейнера по внутренней сети.
- Kubernetes получил `academy-postgres` StatefulSet, ClusterIP service и NetworkPolicy для доступа к БД только от `academy-web`.

### Проверки

- `npm.cmd run typecheck` — passed.

### Риски и next steps

- Нужно прогнать `lint`, `test`, `build`.
- Для production self-hosted DB нужны backup/restore runbook, регулярные бэкапы и процедура доступа администратора через защищенный bastion/port-forward.

## $(date +%Y-%m-%d) — Wire transactional email provider

Автор/agent: Jules
Тип изменения: feature / email
Файлы/модули:

- `package.json`
- `server/modules/notifications/service.ts`
- `server/modules/auth/service.ts`

Summary:

- Добавлен пакет `nodemailer`.
- В `server/modules/notifications/service.ts` добавлена утилита `sendEmail`, которая использует настройки SMTP из переменных окружения, что позволяет локально использовать MailHog, а на проде — любой реальный провайдер.
- Настроен `createNotification` на отправку письма, если указан соответствующий `channel`.
- В `server/modules/auth/service.ts` настроена отправка письма для восстановления пароля через ту же утилиту `sendEmail`.

Проверки:

- `npm run typecheck`, `npm run lint`, `npm run build` прошли успешно.
- `vitest run tests/unit/notifications.test.ts` прошёл успешно.
- Код-ревью пройдено.

Риски:

- Необходима корректная настройка SMTP-переменных на проде. Ошибки отправки логируются (catch), чтобы не блокировать процесс создания уведомления в БД.

Next steps:

- Добавить логирование исходящих писем в аудит, если это необходимо.
- Проверить доставку на реальном SMTP (SendGrid/Resend).
