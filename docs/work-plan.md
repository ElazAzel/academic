# Work Plan: AI Strategic Academy

**Начало:** 2026-05-22

План работ с отслеживанием статуса. Каждая задача отмечается по мере выполнения.

---

## Цель 15: Полная оптимизация и доказанная работоспособность платформы

**Статус:** 🟡 Активная долгосрочная цель
**Источник:** `docs/FULL-OPTIMIZATION-GOAL.md`, `docs/READINESS.md`

Цель: довести AI Strategic Academy до состояния, где весь основной функционал платформы оптимизирован, работает end-to-end для всех ролей и подтверждён code/test/browser/gate/docs/ops evidence.

| Фаза | Действие | Статус |
|-----|----------|--------|
| A | Truth & Gates: единый readiness baseline, отсутствие дрейфа статусов, evidence-first правило | 🟡 |
| B | Six-role Functional Proof: сценарии всех 6 ролей через Playwright на seeded/disposable env | 🟡 |
| C | Security/Privacy/Ownership: negative-path coverage для guessed IDs, observer scope, media/report/certificate boundaries | 🟡 |
| D | UX/Accessibility/Responsive: рабочие очереди ролей, keyboard paths, axe/responsive proof | 🟡 |
| E | Performance & Architecture Optimization: N+1, bounded queries, bundle/dependency/client-component audit | 🟡 |
| F | Ops & Release: staging `verify:release`, backup/restore, rollback, monitoring, DPA, secret rotation | ⛔ |

Definition of Done и правило остановки описаны в `docs/FULL-OPTIMIZATION-GOAL.md`.

---

## Задача 14: Release hardening до доказуемой готовности

**Статус:** 🟡 В работе (baseline создан 2026-05-26)
**Источник:** `docs/release.md`, `server/modules/release-hardening/readiness.ts`

Цель: перевести платформу из “реализация широкая, но часть сценариев не доказана” в release-ready состояние с проверенными ролями, доступами, ownership, отчётами, сертификатами, уведомлениями и эксплуатационным запуском.

| WP | Действие | Owner roles | Статус |
|-----|----------|-------------|--------|
| WP0 | Truth Sync: синхронизировать документы, AI-agent roles, product roles, project skills, technical skills и release gates | Orchestrator, Technical Writer | ✅ |
| WP1 | Six-role Scenario Proof: доказать сценарии `admin`, `instructor`, `student`, `curator`, `super_curator`, `customer_observer` через Playwright на seeded/disposable env | QA Release, Product Owner, Frontend LMS UX | 🟡 |
| WP2 | Access/Privacy/Ownership: закрыть guessed IDs, observer read-only, curator/instructor scope, media/report/certificate privacy | Security Privacy, Backend Next Prisma | 🟡 |
| WP3 | Architecture Boundary Cleanup: вынести критичные Prisma/domain queries из UI routes/components в server modules/actions | Principal Architect, Backend Next Prisma | ✅ |
| WP4 | Role Workspace UX: перестроить кабинеты вокруг рабочих очередей и next actions, а не декоративных метрик | Frontend LMS UX, Product Owner | 🟡 |
| WP5 | Reporting/Analytics/Certificates/Notifications Proof: доказать scoped exports, revoked certificates и channel rules | Data Analytics, Security Privacy, QA Release | 🟡 |
| WP6 | DevOps/Release/Backup/Observability: выполнить `verify:release` в целевом окружении, health, backup/restore, rollback | DevOps Platform, QA Release | ⛔ blocked |

**Текущее изменение 2026-05-26:**
- Добавлен машинно-читаемый контракт release hardening.
- Добавлен unit-тест, который проверяет 6 product roles, redirect priority, 10 AI-agent roles, 5 project skills, 14 technical skills, 7 work packages и неполную release-ready оценку до закрытия WP1-WP6.
- Начат WP2: lesson video/media access больше не возвращает generic 500 для ожидаемых forbidden/not-found случаев; тесты обновлены на корректный 403.
- WP2 расширен: signed lesson media URL покрыт negative checks для отсутствующего enrollment, sequential lock и guessed foreign media ID.
- `done` для release-ready теперь требует явного evidence; route rendering больше не считается достаточным доказательством.

**Текущее изменение 2026-05-30:**
- WP3 закрыт для текущего repo-local состояния: прямой Prisma Client удален из `app/**/page.tsx` и `components/**`.
- Добавлен guard в `tests/unit/release-hardening-readiness.test.ts`, который блокирует возврат `@/lib/prisma`, `getPrisma()` и `prisma.*` в страницы и UI-компоненты.
- Playwright E2E больше не использует `networkidle`; навигация переведена на `domcontentloaded` для совместимости с SSE.
- Внешние release-задачи DPA, ротации Supabase-пароля и git purge остаются runbook-задачами WP6/Security.

**Текущее изменение 2026-06-03:**
- WP5 усилен: `ReportDesigner` теперь выбирает `status` и `revokedAt` для сертификатных экспортов по умолчанию.
- WP4/WP5 усилены: `DownloadReports` и серверный display-config отчётов используют русские owner/scope labels без видимых `Admin`/`Instructor`/`Customer observer`/`Scope:`.
- WP5 усилен: Report API negative-path ошибки missing/unknown report type и fallback reason генерации отчёта переведены на русский structured contract.
- WP5 усилен: cache key для `generateReportDownload()` теперь включает `fields`, чтобы кастомные экспорты не получали stale cached content от другого набора колонок.
- WP5/WP2 усилены: async report jobs теперь сохраняют выбранные `fields` в outbox payload, processor generation и sanitized status download URL; небезопасные имена колонок не ставятся в очередь и не возвращаются клиенту.
- WP4/WP2 усилены: `ReportDesigner` теперь скрывается для ролей без разрешенных типов отчётов и не показывает fallback action для запрещенного report-доступа.
- WP2/WP4 усилены: curator assistant server action проверяет роль до поиска подсказок, не логирует controlled `ApiError` и возвращает безопасную русскую ошибку при неожиданных сбоях.
- WP4/WP2 усилены: media upload schema/routes, admin popup manager и chat upload fallback больше не отдают английские пользовательские ошибки; русские negative-path сообщения закреплены unit-тестами.
- WP4/WP2 усилены: curator popups, lesson discussion, notifications, deadline alerts, instructor/admin deadline managers и upload-with-compress очищены от типовых английских runtime fallback errors; возврат строк `Failed to fetch`, `Failed to load discussion`, `Upload failed` и upload/popup fallback strings блокируется guard-тестом.
- WP4 усилен: admin/instructor operational labels в настройках, посещаемости, выдаче сертификатов, создании/редактировании пользователей и bulk import переведены на Russian-first copy; возврат выбранных английских labels блокируется guard-тестом.
- WP5/WP4 усилены: report preview contract теперь возвращает `isTruncated`/`rowLimit`, а `ReportDesigner` явно показывает лимитированную выборку вместо безусловного `Всего строк`.
- WP2/WP4 усилены: curator assistant action получил max-length validation для `questionText`, отклоняя oversized input до FTS/glossary поиска.
- WP4 усилен: command palette search fallback переведён на русский и включён в общий runtime-copy guard.
- WP2/WP4 усилены: отключенные billing endpoints `/api/v1/payments/checkout` и `/api/v1/webhooks/stripe` возвращают Russian-first `410 Gone` payloads, покрыты сервисными/route tests и общим runtime-copy guard.
- WP2/WP4 усилены: SCORM manifest parser/import больше не возвращает английские fallback-сообщения и не пробрасывает raw parser details; русский contract покрыт parser/import tests и общим runtime-copy guard.
- WP2 усилен: `verifyCsrf()` возвращает русские structured `403` причины для missing/malformed/mismatched request source и больше не смешивает parsing failure с origin mismatch.
- WP2/WP6 усилены: readiness endpoints `/api/readyz` и `/api/v1/readyz` возвращают русский structured `503 service_unavailable` без raw database details; success/failure payloads покрыты route tests.
- WP2/WP4 усилены: chat action access errors для student/receiver boundaries переведены на русский и закреплены action/runtime-copy tests.
- WP2/WP3 усилены: `/admin/enrollments` использует возвращенного `requireRolePage()` пользователя и больше не содержит raw `Unauthorized` throw после page guard.
- WP2/WP4 усилены: GraphQL scaffold route/resolvers больше не возвращают англоязычные runtime/scaffold-сообщения; русский contract закреплен route/runtime-copy tests.
- WP2/WP4 усилены: lesson media/video access audit reasons для no-enrollment, sequential lock, missing lesson, guessed media ID и repeated signed URL requests переведены на русский и закреплены security/privacy + runtime-copy tests.
- WP4 усилен: shared `WorkspacePage` очищен от visible `MVP`, scaffold, REST/server modules/React Query copy и теперь показывает нейтральное русское пустое состояние.
- WP4 усилен: GraphQL `501 not_implemented` copy очищен от смешанной `runtime`/`REST endpoints MVP` формулировки и закреплен route/runtime-copy tests.
- WP2/WP4 усилены: push subscribe/unsubscribe silent unauthenticated paths возвращают русскую причину без rate-limit/storage side effects и закреплены push API/runtime-copy tests.
- WP4/WP5 усилены: admin visit analytics error state больше не показывает raw `error.message` из server actions и использует стабильную русскую recovery-подсказку, закрепленную component/admin-copy tests.
- WP4/WP5 усилены: certificate designer разделяет ожидаемые локальные ошибки upload/preview и неизвестные action/API exceptions, не показывая raw `error.message` в видимом состоянии ошибки.
- WP4/WP5 усилены: CertificatesDashboard приведен к стандартному `{ data }`/`{ error }` API envelope и скрывает raw network/API exception text при ручной выдаче сертификатов.
- WP4/WP5 усилены: ReportDesigner preview читает стандартный preview API envelope, валидирует форму payload и скрывает raw network exception text в панели предпросмотра.
- WP2/WP4 усилены: пользовательские формы профиля/пароля и настройки уведомлений больше не выводят произвольный raw `Error.message` в toast; ожидаемые доменные ошибки пароля сохранены через whitelist, а network/runtime сбои заменяются безопасными русскими fallback-сообщениями.
- WP2/WP4 усилены: `GlossaryEditor` теперь обрабатывает `{ success: false, error }` от glossary actions и скрывает raw action exceptions за безопасными русскими toast fallback-сообщениями.
- WP2/WP4 усилены: admin cohort create/edit forms теперь обрабатывают `{ success: false, error }` и скрывают raw create/update action exceptions за безопасными русскими toast fallback-сообщениями.
- WP2/WP4 усилены: super-curator cohort create/edit/archive dialog теперь обрабатывает `{ success: false, error }`, скрывает raw action exceptions и имеет `DialogDescription` для доступности.
- WP2/WP4 усилены: admin user edit/delete dialog теперь обрабатывает `{ success: false, error }`, скрывает raw action exceptions и добавляет доступные подписи icon-only controls.
- WP2/WP4 усилены: admin create user modal теперь обрабатывает `{ success: false, error }`, скрывает raw action exceptions за безопасной inline-ошибкой и добавляет доступную подпись кнопке закрытия.
- WP2/WP4 усилены: admin enrollment forms теперь обрабатывают `{ success: false, error }`, скрывают raw enroll/delete action exceptions и добавляют доступную подпись icon-only кнопке удаления зачисления.
- WP2/WP4 усилены: super-curator assignment forms теперь обрабатывают `{ success: false, error }`, скрывают raw add-student/add-curator/assign-curator action exceptions и получают доступные описания/подписи.
- WP2/WP4 усилены: super-curator `RiskActions` теперь скрывает raw student-list/create/resolve action exceptions, обрабатывает failed results и убирает React warning по `selected` option.
- WP2/WP4 усилены: student assignment upload теперь скрывает raw `uploadMedia()` exceptions, сохраняет whitelisted upload-domain errors и добавляет доступные подписи upload/remove controls.
- WP2/WP4 усилены: admin/instructor deadline clients и admin/curator popup clients теперь скрывают raw action/network exceptions, сохраняют controlled доменные ошибки и добавляют доступные подписи/keyboard handling для date inputs, icon-only actions и кликабельных role/cohort/student элементов.
- WP2/WP4 усилены: `LessonDiscussion` теперь читает стандартный `{ data }` API envelope, корректно показывает empty state и скрывает raw post-create/delete exceptions за безопасными русскими fallback-сообщениями.
- WP2 усилен: `/api/v1/sessions/start` больше не пишет raw persistence `error.message`/stack в server console payload и покрыт no-leak route-тестом.
- WP2/WP4 усилены: app/global/component error boundaries больше не показывают raw `error.message`, не логируют raw message/stack и используют спокойный recovery-focused UI без gradient blobs.
- WP2 усилен: storage и Web Push logging больше не раскрывают raw provider errors, exception objects или push endpoint tokens; добавлены focused no-leak tests.

---

## Задача 1: Отключение самосброса пароля

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 1.1 | Изменить страницу `/forgot-password` — убрать форму, показать сообщение: написать на admin@aistrategic.kz | ✅ |
| 1.2 | Отключить API `/api/v1/auth/forgot-password` — возвращать 410 Gone | ✅ |
| 1.3 | Отключить API `/api/v1/auth/reset-password` — возвращать 410 Gone | ✅ |
| 1.4 | Изменить страницу `/reset-password` — перенаправлять на `/forgot-password` | ✅ |
| 1.5 | Обновить e2e тест forgot-password | ✅ |
| 1.6 | Обновить `docs/updates.md` | ✅ |

---

## Задача 2: Исправление Prisma schema ↔ migration (12 critical)

**Статус:** ✅ Завершено (2026-05-22)

**Что сделано:**
- Создана миграция `20260522000003_fix_schema_mismatches` с ALTER TABLE для всех 12 расхождений
- Все 14 миграций применены (`prisma migrate resolve --applied`)
- `prisma migrate diff` подтверждает: **База ↔ Schema: нет расхождений**
- `prisma migrate status`: Database schema is up to date!
- `prisma generate` успешно
- Typecheck: ✅ | Tests 377/377 ✅

| Шаг | Действие | Статус |
|-----|----------|--------|
| 2.1 | `lesson_progress` — ADD `started_at`, `last_seen_at` | ✅ |
| 2.2 | `assignment_submissions` — RENAME `created_at` → `submitted_at`, DROP `updated_at` | ✅ |
| 2.3 | `activity_logs` — RENAME `entity/resource`, ADD `ip_address`, `session_id`, FIX FK CASCADE | ✅ |
| 2.4 | `risk_flags` — RENAME `student_id` → `user_id`, ADD `cohort_id`, FIX FK CASCADE | ✅ |
| 2.5 | `reports` — ADD `project_id`, `course_id`, `url`, DROP `created_by_id`, ALTER DEFAULT | ✅ |
| 2.6 | `admin_popups` — ADD `target_user_ids` | ✅ |
| 2.7 | `messages` — ADD `reply_to_id` + index | ✅ |
| 2.8 | `certificates` — ADD UNIQUE INDEX `(user_id, course_id)` | ✅ |
| 2.9 | `course.finalAssignmentId` — ADD FK constraint | ✅ |
| 2.10 | `quizzes.maxAttempts` — ALTER DEFAULT 3, `reports.status` — ALTER DEFAULT 'ready' | ✅ |
| 2.11 | FK onDelete: `activity_logs`→CASCADE, `risk_flags`→CASCADE | ✅ |

---

## Задача 3: Исправление quiz grading logic

**Статус:** ✅ Завершено (2026-05-22)

**Что сделано:**
- Полностью переписан `gradeObjectiveQuiz` — теперь `resolveOptionLabel` применяется к ОБОИМ сторонам сравнения (expected + actual), что устраняет mismatch при object-options
- Добавлены 8 новых тестов: object options с id/label (index, label, id форматы), multi-choice, wrong answer rejection
- **Тесты: 385/385** (было 377, +8 новых)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 3.1 | Переписать `gradeObjectiveQuiz` — resolveOption на обе стороны | ✅ |
| 3.2 | Добавить тесты на все форматы (index, label, ID, value, multi-select, object options) | ✅ |

---

## Задача 4: Rate limiter fail-open → fail-closed

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 4.1 | `lib/rate-limit.ts` — изменить catch block на `{ success: false }` | ✅ |
| 4.2 | `lib/rate-limit.ts` — атомарный INCR (`cacheIncr` с Redis INCR + memory fallback) | ✅ |
| 4.3 | `proxy.ts` — ключ per-IP (без per-path) | ✅ |

---

## Задача 5: CSRF + submissions leak (security)

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 5.1 | `proxy.ts` — добавить scheme check в CSRF | ✅ |
| 5.2 | `proxy.ts` — заменить `!isPublicRoute` на bypass-list (только webhooks/cron) | ✅ |
| 5.3 | `assignments/service.ts` — `listAssignments`: фильтр `{ userId }` для студентов | ✅ |
| 5.4 | `lib/auth/rbac.ts` — пустые роли возвращают `false` (защита от неполных JWT) | ✅ |

---

## Задача 6: Race conditions

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 6.1 | `progress/service.ts` — sequential unlock перенесён ВНУТРЬ `$transaction` | ✅ |
| 6.2 | `progress/service.ts` — `SELECT ... FOR UPDATE` на enrollment в начале tx | ✅ |
| 6.3 | `quizzes/service.ts` — FOR UPDATE на enrollment, count+create в tx | ✅ |
| 6.4 | `assignments/service.ts` — FOR UPDATE на enrollment, count+create в tx | ✅ |
| 6.5 | `auth/service.ts` — атомарный `delete` вместо `findUnique`+`delete` | ✅ |
| 6.6 | `outbox/service.ts` — rescue cutoff по `updated_at` с `updated_at = NOW()` при dequeue | ✅ |
| 6.7 | `certificates/service.ts` — добавлен `findFirst` check перед create | ✅ |

---

## Задача 7: Аудит документации и устранение несостыковок

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 7.1 | Создать `/admin/invites` — страница-заглушка (редирект `/admin/payments` в 404) | ✅ |
| 7.2 | Создать `_prisma_migrations` на Supabase, внести все 15 resolved миграций | ✅ |
| 7.3 | Обновить `full-project-audit.md` — тесты 368→385, lint `broken`→`done`, `/admin/invites` `missing`→`done` | ✅ |
| 7.4 | Обновить `vercel-supabase-deployment.md` — 100MB→20MB, PostgreSQL 15→17 | ✅ |
| 7.5 | Обновить `platform-functional-overview.md` — `/student/modules/[moduleId]` помечен как удалённый | ✅ |
| 7.6 | Чат: `max-w-5xl mx-auto` для стандартной ширины окна чата | ✅ |
| 7.7 | Чат: адаптивная и настраиваемая высота окна чата в `ChatPanel` для предотвращения переполнения на мобильных и в модальных окнах | ✅ |

---

## Задача 8: Автосжатие изображений при загрузке

**Статус:** ✅ Завершено (2026-05-22)

| Шаг | Действие | Статус |
|-----|----------|--------|
| 8.1 | Создать `lib/client-image-compress.ts` — Canvas-based сжатие (1920px max, JPEG 80%, пропуск GIF/<50KB) | ✅ |
| 8.2 | Создать `lib/upload-with-compress.ts` — обёртки `uploadMedia()` и `uploadChatFile()` | ✅ |
| 8.3 | Интегрировать в `chat-panel.tsx` — чат | ✅ |
| 8.4 | Интегрировать в `assignment-block.tsx` — загрузка к заданию | ✅ |
| 8.5 | Интегрировать в `assignment-view.tsx` — студент | ✅ |
| 8.6 | Интегрировать в `course-builder-shell.tsx` — обложка курса | ✅ |
| 8.7 | Интегрировать в `lesson-block-editor.tsx` — файлы уроков | ✅ |
| 8.8 | Написать тесты (11 шт.) — Node.js mocks для Canvas API | ✅ |

---

## Задача 9: Система сертификатов для Мастер-курса

**Статус:** ✅ Завершено (2026-05-22)

**Что сделано:**
- Добавлена учебная программа "Стратегическое мышление и управление: Мастер-курс" (`strategic-thinking-masterclass`) в `prisma/seed.ts`.
- Реализован параметр `force` в `issueCertificate` для принудительного выпуска сертификата администратором (с автоматическим зачислением и проставлением прогресса 100%).
- Добавлен `force` параметр в валидационную схему `certificateIssueSchema` в `lib/validation.ts`.
- Создана новая интерактивная страница администратора `/admin/certificates` для ведения журнала выданных документов и мгновенного ручного выпуска в красивом и отзывчивом UI.
- Добавлена новая вкладка и ссылка "Сертификаты" в навигацию администратора (`components/layout/navigation.ts`).
- Проверена совместимость Cyrillic (кириллицы) в генераторе PDF на базе NotoSans-Regular/Bold и формирование QR-кода.

| Шаг | Действие | Статус |
|-----|----------|--------|
| 9.1 | Внедрить "Стратегическое мышление и управление: Мастер-курс" в seed.ts | ✅ |
| 9.2 | Добавить поддержку `force` (bypass) в `issueCertificate` | ✅ |
| 9.3 | Обновить валидацию схемы `certificateIssueSchema` в `lib/validation.ts` | ✅ |
| 9.4 | Реализовать интерфейс администратора `app/admin/certificates/page.tsx` | ✅ |
| 9.5 | Создать интерактивный клиентский дашборд `components/admin/certificates-dashboard.tsx` | ✅ |
| 9.6 | Добавить ссылку на страницу сертификатов в навигацию администратора `navigation.ts` | ✅ |
| 9.7 | Изменить ссылки проверки сертификатов на относительные в UI (автовыбор хоста) | ✅ |
| 9.8 | Исправить 500 ошибку рендеринга PDF (переход на буферы, автозамена localhost, автосборка ассетов в next.config, RFC 5987 кодирование в заголовках) | ✅ |

---

## Задача 10: UX/UI 2026 — визуальная система платформы

**Статус:** ✅ Завершено (P0, 2026-05-24)
**Основание:** `docs/ux-ui-2026-audit.md`

Цель: убрать ощущение дешёвой AI-генерации и привести платформу к строгой академической операционной системе: спокойной, доступной, адаптивной и компонентно управляемой.

| Шаг | Действие | Статус |
|-----|----------|--------|
| 10.1 | Утвердить один дизайн-контракт: цвета, радиусы, тени, типографика, spacing, статусы, density modes | ✅ |
| 10.2 | Убрать `glass-card-premium`, `glass-panel`, `btn-shine`, декоративные blobs, массовые gradient strips из core UI | ✅ |
| 10.3 | Нормализовать `Card`, `Button`, `StatusBadge`, `Table`, `Dialog`, `FormField`, `EmptyState`, `PageHeader` | ✅ |
| 10.4 | Ввести запретный список визуальных паттернов через audit checklist или `rg` smoke | ✅ |
| 10.5 | Проверить desktop/tablet/mobile: 375, 430, 768, 1024, 1440, 1920 px | 🟡 частично: 375/768/1024/1440 |

---

## Задача 11: UX/UI 2026 — единый путь студента

**Статус:** 🟡 Частично выполнено (P0/P1, 2026-05-24)
**Основание:** `docs/ux-ui-2026-audit.md`

Цель: студент должен видеть один понятный учебный путь, а не набор несвязанных карточек и игровых блоков.

| Шаг | Действие | Статус |
|-----|----------|--------|
| 11.1 | Оставить `Продолжить обучение` первым блоком `/student`; gamification только вторично и компактно | ✅ |
| 11.2 | Переделать `/student/my-courses` под компактные карточки/список с progress, next action, certificate state | ✅ |
| 11.3 | Переделать `/student/courses/[courseId]` под Course → Module → Block → Lesson с next CTA и locked states | 🟡 визуально выровнено, полный сценарий требует seeded flow |
| 11.4 | Переделать `/student/lessons/[lessonId]`: materials/test/assignment/question/rating/completion внутри урока | 🟡 визуально выровнено, полный embedded assessment smoke ещё нужен |
| 11.5 | Оставить quizzes/assignments как агрегаторы с явной привязкой назад к уроку и курсу | 🟡 |

---

## Задача 12: UX/UI 2026 — операционные кабинеты ролей

**Статус:** 🟡 Частично выполнено (visual pass, 2026-05-24)
**Основание:** `docs/ux-ui-2026-audit.md`

Цель: каждый кабинет должен отвечать на вопрос “что этой роли делать дальше?”, а не показывать декоративный набор KPI.

| Шаг | Действие | Статус |
|-----|----------|--------|
| 12.1 | Curator: вопросы, задания на проверку, риски, просрочки, быстрые действия | 🟡 визуально выровнено |
| 12.2 | Super Curator: нагрузка кураторов, распределение, SLA очередей, риски когорт | 🟡 визуально выровнено |
| 12.3 | Instructor: курсы к публикации, forwarded questions, тесты/задания, аналитика курса | 🟡 визуально выровнено |
| 12.4 | Admin: доступы, пользователи, когорты, зачисления, сертификаты, audit/system health | 🟡 surfaces normalized; scenario UX pending |
| 12.5 | Customer Observer: read-only отчёты и сертификаты без edit affordances | 🟡 surfaces normalized; scenario UX pending |

---

## Задача 13: UX/UI 2026 — accessibility и адаптивная проверка

**Статус:** 🟡 Частично выполнено (responsive smoke, 2026-05-24)
**Основание:** `docs/ux-ui-2026-audit.md`

| Шаг | Действие | Статус |
|-----|----------|--------|
| 13.1 | Провести WCAG 2.2 AA-oriented audit: contrast, focus, keyboard, status semantics, target size | ⏳ |
| 13.2 | Добавить Playwright responsive smoke для core routes на phone/tablet/desktop | 🟡 ручной smoke: `/login`, `/student`, 375/768/1024/1440 |
| 13.3 | Добавить keyboard smoke для login, continue lesson, quiz, assignment, curator answer, certificate issue | ⏳ |
| 13.4 | Проверить sticky header/bottom nav/dialog focus clipping и reduced motion | 🟡 частично через no-overflow smoke |
| 13.5 | Зафиксировать результаты в `docs/updates.md` после каждой UX партии | ✅ |
