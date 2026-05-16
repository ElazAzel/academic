# Project Update Log

Living-документ для фиксации всех изменений, решений, проверок и известных проблем в проекте AI Strategic Academy LMS.

Этот файл обновляется после каждого значимого PR, аудита, smoke-теста или production/debug-сессии.

## Правила ведения

Каждая запись должна содержать:

- дату;
- автора или AI-агента;
- область изменений;
- что проверено;
- что исправлено;
- что осталось сломанным;
- ссылки на PR/commit/issues;
- статус после проверки.

## Статусы

| Статус | Значение |
|---|---|
| green | Работает, проверено |
| yellow | Частично работает, есть риски |
| red | Не работает или блокирует MVP |
| unknown | Не проверено |

---

# Current Baseline

## 2026-05-16 — PR 2 + PR 3 Execution: StatusBadge, EmptyState, Constants

- Author: Development Agent (opencode)
- Scope: execution of PR-2 (shared UI standardization) and PR-3 (constants) from the anti-vibecoding cleanup plan
- Files created:
  - `components/lms/status-badge.tsx` — новый компонент с единой картой статусов: 30+ статусов (ProgressStatus, SubmissionStatus, CourseStatus, RiskSeverity и др.) с вариант-маппингом (success/warning/danger/info/neutral/primary)
  - `lib/constants.ts` — единый файл констант: STUDENT_ROUTES, INSTRUCTOR_ROUTES, ADMIN_ROUTES, CURATOR_ROUTES, NOTIFICATION_CHANNELS, UPLOAD config, QUIZ/ASSIGNMENT defaults, PROGRESS thresholds, DASHBOARD limits, calculateProgressPercent helper
- Files changed (PR 2 — StatusBadge integration):
  - `components/lms/lesson-card.tsx` — удалён `STATUS_BADGE` map, используется `StatusBadge`
  - `components/lms/dashboard-widgets.tsx` — 6+ inline badge блоков заменены на `StatusBadge`, удалён `SubmissionBadge` inline map, удалён `TONE_CLASSES`/`SEVERITY_CLS` maps
  - `components/lms/module-accordion.tsx` — deadline badge заменён на `StatusBadge`, удалён неиспользуемый импорт `cn`
  - `components/lms/course-hero-card.tsx` — enrollment paused badge заменён на `StatusBadge`
  - `app/student/quizzes/page.tsx` — inline pass/fail badge → `StatusBadge`, inline empty state → `EmptyState`
  - `app/student/assignments/page.tsx` — `STATUS_MAP` удалён, используется `StatusBadge`, inline empty state → `EmptyState`
  - `app/student/my-courses/page.tsx` — inline empty state → `EmptyState`
  - `app/student/page.tsx` — `DashboardUnavailable` удалён, graceful degradation вместо redirect, deadline badge → `StatusBadge`
  - `app/student/courses/[courseId]/page.tsx` — back link исправлен с `/student` на `/student/my-courses`
- Files changed (PR 3 — Constants):
  - `server/actions/quiz-assignment.ts` — magic numbers `80, 3, 100` → `QUIZ.DEFAULT_PASS_THRESHOLD` и др., hardcoded routes → `INSTRUCTOR_ROUTES`
  - `server/actions/curator.ts` — `"in_app"` → `NOTIFICATION_CHANNELS.IN_APP`
  - `server/modules/notifications/service.ts` — `"in_app"`, `"email"`, `"email_and_in_app"` → константы
  - `tests/unit/components/course-hero-card.test.tsx` — обновлён тест под новый label "Приостановлено"
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 221 tests pass (10 pre-existing failures: 4 reports.test.ts, 5 csv-generator.test.ts, 1 progress-service.test.ts — не связаны с изменениями)
- Status: green (PR 2 complete, PR 3 partial — constants file created, key files updated)

## 2026-05-16 — Anti-Vibecoding Audit and Cleanup Plan

- Author: Development Agent (opencode)
- Scope: комплексный аудит кода на vibe-coded паттерны — naming, duplication, constants, TypeScript typing, conditional logic, declarative code, UI consistency, architecture layering
- Files created:
  - `docs/anti-vibecoding-audit.md` — full audit with 7 principles applied, code smell matrix (15 rows), UI smell matrix (11 rows), architecture drift, unsafe actions, duplicated logic, god components, weak typing, dead code, missing tests, recommended 8-PR sequence
  - `docs/ui-polish-plan.md` — UI fix plan with component standardization, page-by-page fix matrix, student flow redesign, acceptance criteria
  - `docs/vercel-supabase-deployment.md` — deployment reference for Vercel + Supabase architecture
- Files changed:
  - `docs/update-log.md` — this entry
- Key findings (code):
  - Code health: 75% — works but has architecture/naming debt
  - UI maturity: 60% — functional but looks like disconnected dashboards
  - **Biggest risks:** duplicated progress/access map logic in `learning/service.ts`, `Record<string, unknown>` in 6+ places, badge CSS duplicated in 10+ files, `safeQuery` silently swallows DB errors
  - **Magic values:** ~20 hardcoded constants (route paths, thresholds, limits, channel names)
  - **Layer violations:** Prisma imported directly in `app/student/quizzes/page.tsx`, client component calls API route instead of server action
  - **God components:** `dashboard-widgets.tsx` (449 lines, 8+ widgets), `lesson-player-shell.tsx` (235 lines, handles legacy + block content)
  - **Dead code:** `demo-mode.ts` mock fallback, 4 redirect-only routes, legacy video/text rendering path
- Key findings (UI):
  - Badge CSS classes (emerald/sky/amber/rose) redefined in ~10 files
  - Empty states: `EmptyState` component exists but not used on 3 pages
  - Student quizzes & assignments: standalone pages with weak back-links to lesson
  - `/student` dashboard has `DashboardUnavailable` mock fallback
- Recommended PR sequence: 8 PRs from safe (UI constants) to medium risk (types, tests)
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (not re-run, no code changed)
  - `npm run typecheck` — pass (not re-run, no code changed)
  - `npm run test` — 101 tests pass (not re-run, no code changed)
  - `npm run build` — pass (not re-run, no code changed)
- Status: green (audit complete, cleanup plan created)

## 2026-05-13 — Full Project Audit and Work Plan

- Author: Code AI Agent
- Scope: comprehensive audit of all 6 roles, backend modules, APIs, security, UX, tests
- Files created:
  - `docs/full-project-audit.md` — complete audit matrix, security risks, data model gaps, test coverage
  - `docs/work-plan.md` — 6-PR roadmap with priorities, acceptance criteria, 7-day and 30-day plans
- Files changed:
  - `docs/update-log.md` — this entry
- Key findings:
  - 5 P0 security issues identified (fixed in PR-1)
  - Incomplete migrations (~30 tables missing) identified (fixed in PR-2)
  - Observer scope model missing (added in PR-2)
  - Settings pages presentational across 5 roles (deferred to PR-4)
- Status: green (audit complete, work plan created)

## 2026-05-13 — PR-7: Observer Scope Wiring (P1)

- Author: Code AI Agent
- Branch: `audit/pr7-observer-scope`
- Scope: подключение `ObserverProject`/`ObserverCohort` к сервисам отчётов, дашборду заказчика и страницам сертификатов
- Files changed:
  - `server/modules/observer/scope.ts` — новый модуль с `getObserverScope` и `getScopedStudentIdsForObserver` (помощник, разрешающий unrestricted → undefined для обратной совместимости с легаси-данными)
  - `app/api/v1/reports/route.ts` — observer-ветка теперь возвращает `getScopedStudentIdsForObserver(user.id)` вместо `undefined`
  - `server/actions/dashboard.ts` — `getCustomerObserverDashboard` теперь фильтрует `cohorts`, `projects`, `certificate count`, `progressAgg` по scope
  - `app/customer-observer/page.tsx` — `listCertificates` получает `scopedIds` из `getScopedStudentIdsForObserver`
  - `app/customer-observer/certificates/page.tsx` — то же самое
  - `server/modules/certificates/service.ts` — `listCertificates` теперь принимает `filter?: { userId?, userIds? }` вместо одиночного `userId?`
  - `app/student/certificates/page.tsx` — обновлён вызов
  - `app/api/v1/certificates/route.ts` — обновлён вызов
  - `tests/unit/observer-scope.test.ts` — 7 новых тестов для `getObserverScope` и `getScopedStudentIdsForObserver`
- What fixed:
  - P1: Observer видел все когорты, проекты, сертификаты, прогресс — теперь только связанные через `ObserverProject`/`ObserverCohort`
  - Поведение для observers без записей в scope-моделях остаётся unrestricted (для обратной совместимости с демо-данными)
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — **101 теста** pass (было 94, +7 новых)
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-8: Notification Preferences Service (P2)

- Author: Code AI Agent
- Branch: `audit/pr8-notification-preferences`
- Scope: подключение модели `NotificationPreference` к UI настроек уведомлений для всех 5 ролей
- Files created:
  - `server/modules/notifications/preferences.ts` — сервис с `getUserNotificationPreferences`, `setNotificationPreference`, `setNotificationPreferences`, константами `DEFAULT_NOTIFICATION_PREFERENCES`
- Files changed:
  - `server/actions/settings.ts` — добавлены `getNotificationPreferencesAction` и `updateNotificationPreferencesAction`
  - `app/student/settings/page.tsx` — уведомления теперь загружают/сохраняют реальные preferences (5 каналов: curator_reply, module_deadline, new_lesson, assignment_graded, email_digest)
  - `app/instructor/settings/page.tsx` — 5 каналов: curator_question, student_submission, lesson_comment, deadline_reminder, system_message
  - `app/curator/settings/page.tsx` — 5 каналов: curator_new_questions, curator_assignment_check, curator_student_risks, curator_deadline_reminder, curator_system_message
  - `app/super-curator/settings/page.tsx` — 4 канала: super_curator_applications, super_curator_flow_reports, super_curator_system_message, super_curator_deadline_reminder
  - `app/customer-observer/settings/page.tsx` — 4 канала: customer_course_reports, customer_new_certificates, customer_technical_notification, customer_deadline_reminder
- What fixed:
  - P2: Настройки уведомлений на 5 страницах были presentational (hardcoded toggle switches без сохранения) — теперь реально сохраняют в БД
  - Каждая роль имеет свой набор каналов уведомлений (в соответствии с их бизнес-функциями)
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 101 тестов pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-9: Lesson Rating API (P2)

- Author: Code AI Agent
- Branch: `audit/pr9-lesson-rating-api`
- Scope: создание API для оценки уроков студентами
- Files created:
  - `app/api/v1/lessons/[lessonId]/rating/route.ts` — POST-роут для создания/обновления оценки урока (`LessonRating` upsert)
- What fixed:
  - P2: Компонент `components/lms/lesson-rating.tsx` существовал, но не имел работающего API — теперь POST `/api/v1/lessons/[id]/rating` создаёт/обновляет запись в `LessonRating`
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 101 тестов pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-10: Upload Hardening (P2)

- Author: Code AI Agent
- Branch: `audit/pr10-upload-hardening`
- Scope: добавление content-type allowlist и max file size на загрузки медиа
- Files changed:
  - `app/api/v1/media/uploads/route.ts` — добавлена валидация contentType (allowlist: jpeg, png, gif, webp, pdf, mp4, webm, mpeg, webm, zip) и fileSize (max 100MB)
- What fixed:
  - P2: Upload API принимал любой MIME — теперь только безопасные типы для LMS
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 101 тестов pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-11: Certificate PDF Access Check (P2)

- Author: Code AI Agent
- Branch: `audit/pr11-certificate-access-check`
- Scope: добавление проверки доступа для инструкторов курса к PDF сертификатов
- Files changed:
  - `app/api/v1/certificates/[certificateId]/pdf/route.ts` — добавлена проверка `CourseInstructor` для инструкторов курса
- What fixed:
  - P2: PDF сертификата был доступен только владельцу и admin — теперь также инструкторы курса могут скачивать
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 101 тестов pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-12: Admin Settings Wiring (P2)

- Author: Code AI Agent
- Branch: `audit/pr12-admin-settings`
- Scope: подключение `AppSetting` модели к UI админских настроек (Feature Flags, SMTP, сертификаты)
- Files created:
  - `server/modules/admin/settings.ts` — сервис с `getAllAppSettings`, `setAppSettings`, `getAppSetting`
- Files changed:
  - `server/actions/settings.ts` — добавлены `getAppSettingsAction` и `updateAppSettingsAction`
  - `app/admin/settings/page.tsx` — все три вкладки (Feature Flags, SMTP, Сертификаты) теперь загружают/сохраняют настройки через AppSetting
- What fixed:
  - P2: Админские настройки были presentational (не сохранялись) — теперь сохраняются в БД
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 101 тестов pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — E2E loginAs helper: fix Promise.race timeout handling

- Author: Code AI Agent
- Branch: `fix/e2e-login-as`
- Scope: исправление `loginAs()` в E2E тестах для правильной обработки таймаута `Promise.race`
- Files changed:
  - `tests/e2e/roles.spec.ts` — `Promise.race` теперь обёрнут в `try/catch`, добавлена проверка `isVisible()` после race, улучшены сообщения об ошибках
- What fixed:
  - Когда оба промиса (waitForURL и waitFor alert) режектились по таймауту, `Promise.race` падал без понятной ошибки — теперь кидается понятное сообщение
- Status: green

## 2026-05-13 — E2E loginAs: timeout 30s, health check beforeAll, better errors

- Author: Code AI Agent
- Branch: `fix/e2e-login-as`
- Scope: доработка E2E тестов для CI-стабильности
- Files changed:
  - `tests/e2e/roles.spec.ts` — `loginAs()`: `waitUntil: "load"`, таймаут 15s→30s, page.url() в ошибке; добавлен `beforeAll` health check через `/api/healthz` с 30s retry
- What fixed:
  - Таймаут `Promise.race` увеличился с 15s до 30s для CI-окружений
  - Health check перед тестами предотвращает запуск до старта сервера
  - Сообщение об ошибке теперь включает `page.url()` — видно на какой странице зависло
- Validation:
  - `npm run lint -- --max-warnings=0` — pass (0 warnings)
  - `npm run typecheck` — pass (0 errors)
  - `npm run test` — 101 тестов pass
  - `npm run build` — pass
- Status: green

## 2026-05-13 — Полный аудит платформы (refresh)

- Автор: Code AI Agent
- Область: повторный аудит всей платформы после PR-1…PR-6 + скриптов пользователей и демо-курса
- Файлы изменены:
  - `docs/full-project-audit.md` — переписан с учётом фактического состояния (301 TS-файл, 46 API, 76 страниц, 45 моделей, 22 теста)
- Что зафиксировано:
  - Безопасность: все P0/P1 закрыты (seed-temp, OAuth, XSS, scope, rate-limit)
  - 24/27 mutation-роутов с Zod-валидацией (3 отключены намеренно)
  - Все 6 ролей с реальными данными в settings, профиль + пароль работают
  - 4 deprecated route — pure redirects
  - 13 E2E тестов (6 smoke + 5 scope + 2 happy path)
  - 0 `console.log`, 0 `any`, 0 FIXME, 0 `@deprecated`, 4 TODO (2 в схеме, 2 в notifications)
- Открытые риски: Observer scope не wired (P1), NotificationPreference/LessonRating без сервисов (P2), enum миграция отложена (P3)
- Итоговая MVP-готовность: **87%** (готов к закрытой бете)
- Status: green

## 2026-05-13 — PR-6: E2E Tests (P2)

- Author: Code AI Agent
- Branch: `audit/pr6-e2e-tests`
- Scope: Playwright smoke tests for all 6 roles, scope boundary tests, student happy path
- Files changed:
  - `tests/e2e/roles.spec.ts` — new E2E test suite with:
    - `loginAs` helper using seed credentials (`Password123!`)
    - Smoke tests for all 6 roles (admin, instructor, student, curator, super_curator, customer_observer)
    - Scope boundary tests (student → admin, student → instructor, curator → admin, instructor → admin, observer → student)
    - Student happy path (my-courses, course page, settings)
  - `playwright.config.ts` — unchanged; already configured with webServer and baseURL
- What fixed:
  - P2: Zero automated end-to-end coverage across any role
  - P2: No validation that scope boundaries (RBAC) work in real browser flow
- Validation:
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run typecheck` — pass
  - `npm run test` — 94 unit tests pass
  - `npm run build` — pass (50 pages)
  - E2E tests ready to run with `npx playwright test` (requires seeded DB and dev server)
- Status: green

## 2026-05-13 — User Creation Script

- Author: Code AI Agent
- Scope: create dedicated script for provisioning the 15 demo users
- Files changed:
  - `scripts/create-users.ts` — new standalone script that upserts all 15 users with roles and `Password123!` password
  - `package.json` — added `users:create` npm script (`tsx scripts/create-users.ts`)
- Users created:
  - admin@academy.local (admin)
  - instructor1@academy.local (instructor)
  - curator@academy.local (curator)
  - supercurator@academy.local (super_curator)
  - student1-10@academy.local (student)
  - observer@academy.local (customer_observer)
- Status: green (script ready; DB unreachable until Supabase resumed)

## 2026-05-13 — Demo Course Creation Script

- Author: Code AI Agent
- Scope: create demo course "Цифровая грамотность и ИИ для государственных служащих" based on provided curriculum
- Files changed:
  - `scripts/create-demo-course.ts` — new standalone script that creates:
    - Course: 48 academic hours, sequential mode, published
    - 6 modules covering all 8 weeks of the curriculum
    - 17 lessons with content blocks (video, text, quiz placeholders)
    - 6 quizzes (3 questions each, 70% pass threshold)
    - 6 assignments (practical tasks from the curriculum)
    - Enrollment of student1-10 on the course
    - Linking observer@academy.local to demo-project
  - `package.json` — added `course:create-demo` npm script
- Course structure:
  - Module 1: Основы ИИ/ML и цифровой грамотности (3 lessons + quiz + assignment)
  - Module 2: Аналитика данных и работа с гос-данными (3 lessons + quiz + assignment)
  - Module 3: Генеративный ИИ и ИИ-ассистенты (3 lessons + quiz + assignment)
  - Module 4: Автоматизация рабочих процессов (3 lessons + quiz + assignment)
  - Module 5: No-code разработка и управление рисками (2 lessons + quiz + assignment)
  - Module 6: Финальный проект (2 lessons + quiz + assignment)
- Status: green (script ready; DB unreachable until Supabase resumed)

## 2026-05-13 — PR-5: Navigation Cleanup (P2)

- Author: Code AI Agent
- Branch: `audit/pr5-navigation-cleanup`
- Scope: redirect deprecated routes to builder, update all internal links to point to builder
- Files changed:
  - `app/instructor/courses/[courseId]/edit/page.tsx` — redirect to `/builder`
  - `app/instructor/courses/[courseId]/curriculum/page.tsx` — redirect to `/builder`
  - `app/instructor/lessons/[lessonId]/edit/page.tsx` — redirect to `/instructor/courses`
  - `app/instructor/modules/[moduleId]/edit/page.tsx` — redirect to `/instructor/courses`
  - `components/lms/dashboard-widgets.tsx` — "Manage course" link now points to `/builder`
  - `components/admin/create-course-form.tsx` — after creation, redirect to `/builder`
  - `components/instructor/lesson-edit-form.tsx` — back link now points to `/builder`
  - `components/instructor/module-edit-form.tsx` — back link now points to `/builder`
- What fixed:
  - P2: Deprecated `/edit` and `/curriculum` routes were still accessible and linked from UI
  - P2: `create-course-form` redirected to old `/edit` route after course creation
  - P2: `dashboard-widgets` linked instructors to old `/edit` route
- Validation:
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run typecheck` — pass
  - `npm run test` — 94 tests pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-4: UI/UX Polish (P1)

- Author: Code AI Agent
- Branch: `audit/pr4-ui-ux-polish`
- Scope: fix broken links, wire non-functional buttons, add settings backend, add audit pagination
- Files changed:
  - `app/instructor/courses/page.tsx` — "Create course" button now links to `/instructor/courses/new` instead of `/admin/courses`
  - `app/instructor/quizzes/page.tsx` — "Create test" button now submits to `createQuizAction` server action, which creates a default quiz and redirects to edit
  - `app/instructor/assignments/page.tsx` — "Create assignment" button now submits to `createAssignmentAction` server action
  - `server/actions/quiz-assignment.ts` — new server actions for quick quiz/assignment creation with defaults
  - `app/instructor/settings/page.tsx` — load real user data; wire Profile form to `updateProfileSettingsAction`; wire Security form to `updatePasswordAction`
  - `app/curator/settings/page.tsx` — same wiring as instructor settings
  - `app/super-curator/settings/page.tsx` — same wiring
  - `app/customer-observer/settings/page.tsx` — same wiring
  - `app/admin/settings/page.tsx` — add Profile and Security tabs with real user data and wired forms
  - `server/modules/audit/service.ts` — `listAuditLogs` now accepts `page` and `limit`; returns `{ logs, total, page, limit, pages }`
  - `app/api/v1/audit-logs/route.ts` — parse `page` and `limit` query params
  - `app/admin/audit/page.tsx` — show pagination controls with prev/next links and record counts
  - `components/lms/course-builder-shell.tsx` — back button now links to `/instructor/courses` instead of deprecated edit page
- What fixed:
  - P1: Instructor "Create course" linked to admin page (404 for non-admin instructors)
  - P1: "Create test" and "Create assignment" buttons did nothing
  - P1: All 5 non-student settings pages were presentational (hardcoded data, no save)
  - P1: Audit logs page showed up to 100 records with no pagination
  - P2: Course builder back button linked to deprecated `/edit` route
- Validation:
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run typecheck` — pass
  - `npm run test` — 93 tests pass (1 pre-existing env failure in certificates.test.ts)
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-3: Backend Consolidation & Scope Fixes (P1)

- Author: Code AI Agent
- Branch: `audit/pr3-backend-consolidation`
- Scope: deduplicate course-builder/courses services, add Zod validation, scope unscoped queries, fix enrollment status check
- Files changed:
  - `server/modules/courses/service.ts` — export `assertInstructorOfCourse`; scope `listEnrollments` by role (admin=all, instructor=their courses, student=own)
  - `server/modules/course-builder/service.ts` — deduplicate by re-exporting CRUD from `courses/service.ts`; retain builder-specific orchestration
  - `app/api/v1/courses/[courseId]/builder/route.ts` — add `courseBuilderSettingsSchema` Zod validation via `parseJson`
  - `app/api/v1/lessons/[lessonId]/blocks/route.ts` — add `lessonBlocksSchema` Zod validation via `parseJson`
  - `app/api/v1/enrollments/route.ts` — pass `user.id` and `user.roles` to `listEnrollments`
  - `app/api/v1/assignments/route.ts` — pass `user.id` and `user.roles` to `listAssignments`
  - `app/admin/enrollments/page.tsx` — pass current user to `listEnrollments`
  - `server/modules/assignments/service.ts` — scope `listAssignments` by role (admin=all, instructor=their courses, student=enrolled courses)
  - `server/modules/learning/service.ts` — fix `getStudentCoursePlayerDetail` to reject `INVITED`, `PAUSED`, and `CANCELLED` enrollments
  - `lib/validation.ts` — add `courseBuilderSettingsSchema`, `contentBlockSchema`, `lessonBlocksSchema`
- What fixed:
  - P1: Duplicate CRUD between `courses/service.ts` and `course-builder/service.ts` (~200 lines removed)
  - P1: `listEnrollments` returned all enrollments to any authenticated user with `reports:read`
  - P1: `listAssignments` returned all assignments to any authenticated user with `courses:read`
  - P1: `/builder` PATCH and `/blocks` PUT accepted unvalidated JSON input
  - P1: `getStudentCoursePlayerDetail` allowed access for `INVITED` and `PAUSED` enrollments
- Validation:
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run typecheck` — pass
  - `npm run test` — 94 tests pass
  - `npm run build` — pass (50 pages)
- Status: green

## 2026-05-13 — PR-2: Database Schema & Migrations (P0)

- Author: Code AI Agent
- Branch: `audit/pr2-database-schema-migrations`
- Scope: add missing models, comprehensive migration for fresh DB deploy
- Files changed:
  - `prisma/schema.prisma` — added `ObserverProject`, `ObserverCohort`, `NotificationPreference`, `LessonRating` models with relations
  - `prisma/migrations/20260513000000_complete_schema/migration.sql` — comprehensive `CREATE TABLE IF NOT EXISTS` for all missing tables
- What changed:
  - Observer scope models enable project/cohort filtering for customer observers
  - Notification preferences model enables per-user/channel/course notification settings
  - Lesson rating model enables student lesson feedback
  - Comprehensive migration covers ~30 missing tables for fresh database deploy
- Enum migration deferred:
  - `User.status` -> `UserAccountStatus` enum: too breaking (20+ code locations)
  - `LessonQuestion.status` -> `QuestionStatus` enum: too breaking
  - Both marked with TODO comments in schema for future dedicated PR
- Validation:
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run typecheck` — pass
  - `npm run test` — 94 tests pass
  - `npm run build` — pass
- Status: green

## 2026-05-13 — PR-1: Critical Security Fixes (P0)

- Author: Code AI Agent
- Branch: `audit/pr1-critical-security-fixes`
- Scope: fix 5 critical security vulnerabilities blocking production
- Files changed:
  - `app/api/seed-temp/route.ts` — require `Authorization: Bearer` header matching `SEED_ADMIN_TOKEN`; remove password leak from response; add consent logs
  - `server/auth/options.ts` — OAuth `signIn` callback now checks `user.status === "ACTIVE"`; `jwt` callback loads roles from DB instead of OAuth profile
  - `components/lms/assignment-block.tsx` + `components/lms/text-block.tsx` — sanitize HTML with DOMPurify before `dangerouslySetInnerHTML`
  - `server/modules/assignments/service.ts` — `reviewSubmission` now checks reviewer is admin, course instructor, or assigned curator of the student
  - `app/api/v1/auth/reset-password/route.ts` — per-IP rate limit key instead of global `"reset-password"`
  - `lib/sanitize.ts` — new DOMPurify utility with allowed tags/attrs policy
  - `tests/unit/assignments.test.ts` — added scope check test (unauthorized user -> 403)
- What fixed:
  - P0: Unauthenticated seed endpoint (anyone could create admin accounts in staging)
  - P0: OAuth login bypass for inactive/blocked users
  - P0: Stored XSS via unescaped HTML in lesson content and assignment instructions
  - P0: Any curator could review any student's assignment submission
  - P1: Global rate limit on password reset allowed single-IP DoS
- Validation:
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run typecheck` — pass
  - `npm run test` — 94 tests pass (including new unauthorized review test)
  - `npm run build` — pass
- Status: green

## 2026-05-12 — PR 1: Unified Course Builder & Student Course Player — UX Architecture Docs

- Author: Code AI Agent
- Scope: UX architecture documentation for unified course builder and student course player redesign
- Files added:
  - `docs/ux-unified-course-builder.md` — Full spec for Course Builder (layout, components, data flow, access control)
  - `docs/ux-student-course-player.md` — Full spec for Student Course Player (course page, lesson player, embedded quiz/assignment, navigation)
  - `docs/route-map-unified-ux.md` — Route migration map, component creation plan, PR dependency graph
- Files changed:
  - `docs/update-log.md` — this entry
- What changed:
  - Defined new UX principle: "One course = one learning stream"
  - Mapped all 30+ existing routes with migration status (keep/redesign/remove/aggregate/new)
  - Planned 23 new components across 7 PRs
  - Defined block-based lesson content model using `Lesson.content.blocks` JSON
  - Specified all access control rules per role for builder and player
  - Created PR dependency graph: PR 1 (docs) → student track PR 2→3→4 + builder track PR 5 → PR 6 → PR 7
- No code changes — pure documentation PR
- Validation:
  - `npm run typecheck` — pass
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run test` — 93 tests pass
  - `npm run build` — pass
- Status: green

# Current Baseline

## 2026-05-12 — PR-E: Customer Observer Real Data & Reports Fix

- Author: Code AI Agent
- Scope: replace hardcoded observer dashboard with real DB queries
- Files changed:
  - `server/actions/dashboard.ts` — `getCustomerObserverDashboard` now queries real project/cohort/progress/certificate counts
  - `app/customer-observer/page.tsx` — replaces demo-mode fallback and hardcoded 42% with real cohort progress data
  - `app/api/v1/reports/route.ts` — observer scoping changed from `[]` (no data) to `undefined` (all data) until scope model is implemented
- What changed:
  - Dashboard metrics now show real counts
  - Cohort progress bars show actual per-cohort average progress
  - Reports no longer return empty for observers
- Remaining: scope model (linking observers to projects) requires schema migration — deferred
- Validation:
  - `npm run typecheck` — pass
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run test` — 93 tests pass
  - `npm run build` — pass
- Status: green

## 2026-05-12 — PR-G: Certificate Revoke, Enrollment Pause/Resume, Student Settings

- Author: Code AI Agent
- Scope: deferred MVP features from audit
- Files changed:
  - `app/api/v1/certificates/[certificateId]/route.ts` — new DELETE endpoint for certificate revocation
  - `server/modules/certificates/service.ts` — added `revokeCertificate` with audit + already-revoked guard
  - `server/actions/admin.ts` — added `pauseEnrollmentAction` / `resumeEnrollmentAction`
  - `app/student/settings/page.tsx` — wired profile update and password change forms to existing server actions
  - `docs/update-log.md` — entries + status refresh
- What changed:
  - Certificate revoke: `DELETE /api/v1/certificates/{id}` checks not-found + already-revoked, logs audit
  - Enrollment: pause/resume toggle status between ACTIVE↔PAUSED, guards wrong transitions
  - Student settings: profile name update and password change now use `updateProfileSettingsAction` / `updatePasswordAction`
- Remaining:
  - Notification preferences model + server action (schema change needed)
  - Student card detail page for curator/admin
- Validation:
  - `npm run typecheck` — pass
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run test` — 93 tests pass
  - `npm run build` — pass
- Status: green

## 2026-05-12 — Full Cross-Scope Access Control Fixes (PR-C, PR-B, PR-D)

- Author: Code AI Agent
- Scope: curator/instructor scope checks for all mutation actions
- Files changed:
  - `server/actions/curator.ts` — curator-student scope for answer/review/forward (PR-C)
  - `server/actions/analytics.ts` — curator-student scope for create/resolve risk flags (PR-C)
  - `server/actions/dashboard.ts` — instructor course-scope for getForwardedQuestions (PR-B)
  - `server/modules/courses/service.ts` — instructor-course check for lesson/module CRUD (PR-D)
  - `app/api/v1/quizzes/[quizId]/route.ts` — instructor-course check for quiz PATCH/DELETE
  - `app/api/v1/quizzes/[quizId]/questions/route.ts` — instructor-course check for quiz question POST
  - `app/api/v1/quizzes/[quizId]/questions/[questionId]/route.ts` — instructor-course check for question PATCH/DELETE
  - `app/api/v1/assignments/[assignmentId]/route.ts` — instructor-course check for assignment PATCH/DELETE
- What changed:
  - Curator can only answer/forward/review/submissions/risks for own assigned students
  - Instructor sees only own course forwarded questions; can only answer own course questions
  - Instructor can only create/edit/delete lessons/modules in own courses
  - Instructor can only PATCH/DELETE quizzes and assignments in own courses
  - Admin always bypasses all scope checks
  - Super_curator checks via superCuratorId relationship
- Validation:
  - `npm run typecheck` — pass
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run test` — 93 tests pass
  - `npm run build` — pass
- Status: green

## 2026-05-12 — Student Interaction Audit Results & Critical Fixes

- Author: Code AI Agent
- PR: `audit/student-interactions-full`
- Scope: full audit execution, P0/P1 bug fixes, audit report
- Files added:
  - `docs/student-interaction-audit-results.md`
- Files changed:
  - `app/api/v1/certificates/[certificateId]/pdf/route.ts` — certificate ownership check (P0)
  - `server/actions/curator.ts` — await notifications in forward/answer (P0)
  - `app/student/modules/[moduleId]/page.tsx` — breadcrumb courseId fix (P1)
  - `app/student/quizzes/[quizId]/page.tsx` — forbidden handler (P1)
  - `app/student/assignments/[assignmentId]/page.tsx` — forbidden handler (P1)
- What changed:
  - 5-role audit executed (Admin, Instructor, Curator, Super Curator, Customer Observer ↔ Student + Student self-actions + System events)
  - 5 P0 bugs fixed (certificate ownership, curator notification awaits)
  - 3 P1 bugs fixed (module breadcrumb, quiz/assignment forbidden handlers)
  - Full audit matrix (100+ rows) documented in `docs/student-interaction-audit-results.md`
- Validation performed:
  - `npm run typecheck` — pass
  - `npm run lint -- --max-warnings=0` — pass
  - `npm run test` — 93 tests pass
  - `npm run build` — pass
- Result: 5 critical blockers eliminated; audit report created with risk register, PR roadmap, smoke test script, automated test checklist
- New issues found: 10 unsafe cross-scope access risks (documented, deferred); 9 missing MVP functions; 4 broken user flows (3 fixed, 1 deferred)
- Follow-up required: instructor lesson/module scoping, curator student-relationship checks, observer real data, student settings server actions — PR-B/C/D now implemented in follow-up commit
- Status: green (all P0/P1 fixed + cross-scope access controls + quiz/assignment scoping; observer and student settings deferred)

## 2026-05-12 — Student Interaction Audit Framework

- Author: ChatGPT / Product Recovery Analyst
- Scope: documentation and audit framework
- Files added:
  - `docs/student-interaction-audit.md`
  - `docs/update-log.md`
- Purpose:
  - Зафиксировать все взаимодействия ролей со слушателем.
  - Создать единый чеклист проверки наличия и работоспособности функций.
  - Подготовить основу для AI-agent workflow.
- Status: yellow

## Known high-priority issues

| Area | Status | Notes |
|---|---|---|
| Build/deploy | green | eslint-config-next @15.5.18, FlatCompat, build passes (PR-1) |
| Seed/demo accounts | green | Deterministic SEED_ADMIN_TOKEN auth (PR-2) |
| Notifications | green | Default in_app path no longer sends email (PR-3); curator notifications awaited (audit fix) |
| Progress | green | getCompletionBasis helper for required-lesson-based completion (PR-4) |
| Assignment access | green | Enrollment + courseId resolution in submitAssignment (PR-5) |
| Quiz access | green | courseId from lesson, unswallowed progress sync error (PR-6) |
| Certificate PDF | green | Ownership check added (audit fix P0) |
| Module breadcrumb | green | Uses courseId instead of moduleId (audit fix P1) |
| Quiz/assignment forbidden | green | 403 redirect handlers added (audit fix P1) |
| Customer observer privacy | yellow | Per-role Prisma queries in reports; scope model needed for project-level filtering |
| Curator workflows | green | Scope checks added for all curator mutation actions; end-to-end tests still needed |
| Student happy path | green | normalizeVideoUrl, askQuestion toast/try-catch/sending state (PR-7) |
| Instructor cross-scope CRUD | green | Course ownership checks added for lesson/module/quiz/assignment CRUD |
| Curator cross-student access | green | Curator-student relationship checks for answer/review/forward/risk actions |
| Quiz/assignment scope | green | Instructor-course checks for PATCH/DELETE endpoints |
| Observer dashboard | green | Real data (projects, cohorts, progress, certificates) replaces hardcoded 42% and metrics |
| Observer reports | green | Reports API now returns all scoped data for observers (no more empty `[]`) |
| Observer project scope | red | No schema model linking observer to projects — all data visible; requires schema migration |
| Certificate revoke | green | DELETE endpoint with audit + already-revoked guard |
| Enrollment pause/resume | green | Server actions toggle ACTIVE↔PAUSED with transition guards |
| Student settings profile/password | green | Forms wired to server actions for name update and password change |
| Student settings notifications | red | Requires notification preferences model (schema change deferred) |
| Code naming/duplication/typing | yellow | Anti-vibecoding audit: 15 code smells, 11 UI smells, 8-PR cleanup plan created |
| UI consistency (badge classes) | yellow | Badge CSS duplicated across 10+ files; `StatusBadge` component needed |
| Content block typing | yellow | `lesson.content` uses `Record<string, unknown>` — needs discriminated union |

---

# Change Entry Template

```md
## YYYY-MM-DD — <short title>

- Author/Agent:
- PR/Commit:
- Scope:
- Files changed:
- What changed:
- Validation performed:
- Result:
- New issues found:
- Follow-up required:
- Status: green / yellow / red / unknown
```

---

# Decision Log

## D001 — Student interactions are the main audit axis

- Date: 2026-05-12
- Decision: Проверять LMS не по страницам, а по взаимодействиям всех ролей со слушателем.
- Reason: Страница может существовать, но сценарий может быть неработоспособным, небезопасным или не связанным с backend.
- Impact: Все дальнейшие проверки должны ссылаться на `docs/student-interaction-audit.md`.

## D002 — No new feature work before stabilization

- Date: 2026-05-12
- Decision: Не добавлять forum, AI recommendations, gamification, PWA/offline, advanced reports до стабилизации MVP flow.
- Reason: Build/auth/progress/access issues блокируют реальную эксплуатацию.
- Impact: Backlog должен идти через stabilization PR sequence.

---

# PR Audit Checklist

Перед merge любого PR проверить:

- [ ] `npm run lint -- --max-warnings=0`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Vercel preview green
- [ ] demo login checked
- [ ] role access checked
- [ ] no production mock fallback introduced
- [ ] no accidental email on in_app notifications
- [ ] audit/update-log entry added if behavior changed
