# План реализации AI Strategic Academy

Дата актуализации: 2026-05-07  
Статус документа: operational source of truth для реализации и контроля изменений.

## Цель проекта

Создать закрытую LMS одной академии для управления курсами, потоками, кураторами, заданиями, тестами, сертификатами, платежами, аналитикой и отчётностью. Система должна оставаться production-minded: безопасной, расширяемой, документированной и удобной для AI-assisted разработки.

## Текущее состояние на 2026-05-07

- Создан runnable Next.js modular monolith: App Router, TypeScript strict, Prisma/PostgreSQL, Auth.js, Tailwind, REST API, GraphQL scaffold.
- Созданы основные страницы ролей: публичная зона, слушатель, куратор, супер-куратор, преподаватель, администратор, заказчик-наблюдатель.
- Созданы доменные server modules для auth/RBAC, courses, enrollments, quizzes, assignments, progress, certificates, billing, analytics, notifications, search, audit.
- Созданы docs, OpenAPI, GraphQL schema, Prisma schema, seed, tests, Docker/Compose/K8s/CI templates.
- Проверки bootstrap: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build` проходили успешно.
- Git remote нормализован до `origin`, удалённый initial commit `ElazAzel/academic` с `LICENSE` объединён с локальной историей без force-push.
- Docker runtime не проверялся локально, потому что Docker CLI в среде не обнаружен.

## Правило обновления проекта

Каждое изменение проекта должно обновлять документацию в том же изменении:

1. Любой code/doc/infra change добавляет запись в `docs/updates.md`.
2. Если меняется статус задачи, scope, архитектура или приоритет, обновляется этот файл.
3. Новые записи в `docs/updates.md` добавляются сверху, старые записи не переписываются.
4. Любая запись должна содержать проверки, риски и next steps.
5. Если изменение невозможно завершить полностью, точный остаток фиксируется в `docs/todo.md`.

## Этапы реализации

| Этап | Цель | Status |
|---|---|---|
| Bootstrap | Репозиторий, базовый Next.js app, docs, schema, REST, tests, infra templates | done |
| MVP hardening | Подключение реальной БД, миграций, seed, базового auth flow, роли и данные demo | in_progress |
| Learning core | Полный UX курсов, модулей, уроков, тестов, заданий и прогресса | in_progress |
| Academy operations | Потоки, кураторы, риски, вопросы, отчёты, аудит, согласия | planned |
| Payments and certificates | Stripe production flow, verified webhooks, PDF certificates, verification URL | planned |
| Production readiness | Observability, backup/restore, rate limit, security review, deployment validation | planned |
| Scale path | Outbox, event contracts, extraction-ready services, reporting projections | planned |

## Доменный план задач

| Domain | Задача | Status | Acceptance |
|---|---|---|---|
| Auth/RBAC | Email/password, OAuth examples, session, server-side permissions | done | Auth.js endpoint, register/reset/verify routes, RBAC utilities |
| Auth/RBAC | Полный UI flow подтверждения email и восстановления пароля | in_progress | UI pages/forms подключены к REST; email provider delivery остаётся production-hardening |
| Courses | CRUD курсов, модулей, уроков через REST services | done | Route handlers используют server modules, не UI DB calls |
| Courses | Production editor UI для курса, модулей, уроков и материалов | planned | Преподаватель создаёт published course через UI |
| Progress | Lesson/module/course progress и continue learning logic | done | Progress service пересчитывает проценты |
| Progress | Sequential unlock logic в lesson UI | planned | Заблокированные уроки не открываются до условий |
| Quizzes | Objective autograding, attempts, pass threshold | done | Unit tests покрывают autograding |
| Quizzes | Полный quiz builder UI и история попыток | planned | Instructor creates quiz, student submits, result visible |
| Assignments | Submissions с текстом/fileUrl, review service | done | Submission service и review service созданы |
| Assignments | File upload signing и review queue UI | planned | Загрузка через S3-compatible adapter, очередь куратора |
| Certificates | Certificate issuance rule и PDF generation scaffold | done | Certificate service генерирует number, QR, PDF |
| Certificates | Production certificate templates and verification page | in_progress | Public verification URL и API добавлены; template assets остаются production-hardening |
| Billing | Checkout session и verified webhook scaffold | done | Mock mode без секретов, Stripe mode с signature verification |
| Billing | Production reconciliation and subscription access rules | planned | Payment status синхронизирует enrollments идемпотентно |
| Analytics | Admin overview metrics | done | API возвращает users, enrollments, completion, revenue |
| Analytics | Export-ready reports CSV/PDF/XLSX | planned | Admin/customer observer скачивает отчёты |
| Search | PostgreSQL full-text boundary | done | Search service ищет courses, lessons, users |
| Notifications | In-app notification templates/events | done | Notification service хранит русские templates |
| Notifications | Email provider and push provider production wiring | planned | SMTP/provider отправка и retry policy |
| Security | Security doc, RBAC, webhook verification, env examples | done | `docs/security.md` и server guards существуют |
| Security | Rate limiting with Redis and privacy workflows | planned | Distributed limiter, export/delete PII process |
| DevOps | Docker, Compose, K8s, CI templates | done | Infra files созданы |
| DevOps | GitHub remote/upstream для `ElazAzel/academic` | done | Remote переименован в `origin`, remote `LICENSE` смержен, `main` опубликован и отслеживает `origin/main` |
| DevOps | Реальный deployment validation | planned | Vercel/Docker/K8s smoke checks documented |
| UI | Light Russian LMS shell and role pages | done | Pages build in production |
| UI | Data-connected role dashboards | planned | Pages consume API via server actions/hooks |
| AI Ops | AI roles and portable skills for Codex/Antigravity | done | `ai/roles` and `skills` folders exist |

## MVP Definition

MVP считается готовым, когда:

- администратор может создать курс, модули, уроки и назначить поток;
- слушатель может войти, пройти урок, сдать тест/задание и видеть прогресс;
- куратор видит вопросы, задания и риски;
- сертификат выдаётся по правилам и проверяется по URL;
- платежи через Stripe корректно открывают доступ;
- отчёты по курсу/потоку/слушателям экспортируются;
- security checklist и deployment checklist закрыты.

## Production Hardening

- Подключить реальные secrets через Vercel/K8s secret storage, не через committed files.
- Добавить Redis-backed rate limiting.
- Добавить backup/restore runbook и scheduled backups.
- Добавить Sentry/Web Vitals или эквивалент monitoring.
- Провести OWASP/WCAG review перед production launch.
- Зафиксировать retention policy для персональных данных и consent lifecycle.

## Связанные документы

- `README.md` — быстрый запуск и команды.
- `docs/specification.md` — функциональная и архитектурная спецификация.
- `docs/security.md` — security checklist и риски.
- `docs/todo.md` — незавершённые production-hardening задачи.
- `docs/updates.md` — журнал всех обновлений.
## 2026-05-07 Implementation Delta

- Главная страница академии теперь является страницей входа, без landing/marketing слоя.
- Логин ведет в дашборд по роли пользователя.
- Learning core переведен на server-side service с проверкой active enrollment и последовательного доступа к урокам.
- Назначение ролей реализовано через admin/super_curator API и UI.
- Production data target: self-hosted private PostgreSQL, а не сторонний managed database provider.
