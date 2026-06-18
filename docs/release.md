# Release Plan & Verification

---

## 1. Release Hardening Plan

Дата актуализации: 2026-06-04
Статус: active execution baseline для доведения платформы до доказуемой release-ready готовности.

Итоговый краткий статус вынесен в `docs/READINESS.md`. Этот файл хранит подробный release-hardening baseline и runbook.

### Текущий статус 2026-06-04

Repo-local v1 boundary cleanup выполнен: прямой Prisma Client удален из `app/**/page.tsx` и `components/**`, данные для страниц вынесены в `server/modules/page-data/service.ts`, а `tests/unit/release-hardening-readiness.test.ts` теперь блокирует возврат `@/lib/prisma`, `getPrisma()` и `prisma.*` в UI-слой.

E2E-навигация больше не использует `networkidle`; проверки переведены на `domcontentloaded`, чтобы SSE-стрим уведомлений не удерживал сеть активной и не создавал ложные таймауты.

Последние repo-local gates по `docs/updates.md`: `npm run verify` проходит, включая banned-patterns, lint 0 warnings, typecheck, 858/858 Vitest tests и production build. Это подтверждает repo-local code health, но не закрывает release-ready статус.

Последний закрытый слой: white-label runtime finalization. Публичные metadata, offline/global error surfaces, PWA manifest/service worker, 2FA issuer, SMTP fallback, support email, admin/register/consent copy, отчеты и сертификаты используют единый `BRANDING`; динамический `/manifest.webmanifest` получает `NEXT_PUBLIC_BRAND_*`, а runtime guard запрещает legacy brand literals вне `lib/branding.ts`. Предыдущие слои закрыли login failure accessibility, guarded authenticated e2e boundary, public auth keyboard proof, runtime provider boundary, white-label branding baseline, attendance actions, super-curator actions, glossary actions, risk-management actions, student quiz/assignment actions и quiz result clients.

WP2/WP4 дополнительно усилены customer observer read-only guard: `tests/unit/customer-observer-readonly.test.ts` проверяет точный RBAC роли `customer_observer`, desktop/mobile навигацию только внутри `/customer-observer`, отсутствие админских certificate mutation surfaces, прямых mutating API calls и cross-role links в observer route-tree. `/customer-observer/settings` оставлен как self-service зона аккаунта и отдельно проверяется на отсутствие system app settings/build actions.

WP4/white-label дополнительно усилены admin-managed brand customization: `/admin/settings` получил вкладку `Бренд`, настройки сохраняются в `app_settings`, а runtime branding управляет root metadata, viewport theme color, `/manifest.webmanifest`, CSS variables, login/header/PWA install surfaces, support email на `/forgot-password` и disabled reset APIs. CSP/report boundary обновлён для чистого browser smoke после динамического брендинга.

Release-ready остаётся `partial`: WP1, WP2, WP4 и WP5 требуют сценарного proof, WP6 остаётся `blocked` до staging/production `verify:release`, backup/restore/rollback evidence, DPA и ротации скомпрометированного Supabase-пароля.

### Цель

AI Strategic Academy не должна считаться готовой только потому, что страницы рендерятся и базовые команды зелёные. Release-ready означает, что закрытая академия доказана сценарно: роли, доступы, учебный путь, кураторские операции, отчёты, сертификаты, уведомления и эксплуатационные процедуры работают в проверяемой среде.

Машинно-читаемый контракт плана находится в `server/modules/release-hardening/readiness.ts`. Его проверяет `tests/unit/release-hardening-readiness.test.ts`.

### Матрица ответственности

| Группа | Состав | Назначение |
| --- | --- | --- |
| Product roles | `admin`, `instructor`, `student`, `curator`, `super_curator`, `customer_observer` | Роли, для которых платформа должна доказать рабочие сценарии и границы доступа. |
| Redirect priority | `admin` → `super_curator` → `curator` → `instructor` → `customer_observer` → `student` | Приоритет кабинета для пользователя с несколькими ролями. |
| AI agent roles | `orchestrator`, `product-owner`, `principal-architect`, `backend-next-prisma`, `frontend-lms-ux`, `security-privacy`, `qa-release`, `devops-platform`, `data-analytics`, `technical-writer` | Рабочие перспективы для реализации, проверки и документации. |
| Project skills | `lms-domain-rules`, `lms-implementation`, `lms-qa-release`, `lms-orchestrator`, `multi-agent-review` | Обязательные локальные инструкции для LMS-домена, реализации, QA, orchestration и review. |
| Technical skills | 14 skills из `skills-lock.json` и `.agents/skills` | Next.js, React, shadcn, Supabase/Postgres, Vercel и UI-guidelines поддержка по необходимости. |

### Work Packages

| WP | Статус | Owners | Exit condition |
| --- | --- | --- | --- |
| WP0 Truth Sync и агентская диспетчеризация | `done` | Orchestrator, Technical Writer | Документы и typed contract синхронизированы; `done` требует evidence; unit-тест контракта зелёный. |
| WP1 Six-role Scenario Proof | `partial` | QA Release, Product Owner, Frontend LMS UX | Playwright доказывает осмысленные сценарии всех 6 ролей на seeded/disposable env. |
| WP2 Access, Privacy, Ownership Hardening | `partial` | Security Privacy, Backend Next Prisma | Негативные тесты покрывают role scope, ownership, guessed ID, observer read-only, media/report/certificate privacy. |
| WP3 Architecture Boundary Cleanup | `done` | Principal Architect, Backend Next Prisma | Прямой Prisma удален из `app/**/page.tsx` и `components/**`; boundary закреплен unit-guard и сканами. |
| WP4 Role Workspace UX Optimization | `partial` | Frontend LMS UX, Product Owner | Каждый кабинет отвечает "что делать дальше"; есть empty/error/loading и responsive/keyboard smoke. |
| WP5 Reporting, Analytics, Certificates, Notifications Proof | `partial` | Data Analytics, Security Privacy, QA Release | Certificate/report exports scoped; revoked certificates visibly invalid in CSV/XLSX/PDF; notification channel rules доказаны тестами, но сценарный proof ещё не полный. |
| WP6 DevOps, Release, Backup, Observability | `blocked` | DevOps Platform, QA Release | `npm run verify:release` проходит в целевом окружении; backup/restore и rollback подтверждены. |

### Release Gates

| Gate | Статус | Команда / доказательство |
| --- | --- | --- |
| Zero-warning lint | `done` | `npm run lint -- --max-warnings=0` |
| TypeScript check | `done` | `npm run typecheck` |
| Unit/integration tests | `done` | `npm run test` |
| Production build | `done` | `npm run build` |
| Six-role workflow E2E | `partial` | `npm run test:e2e`, но только если сценарии проверяют действия, а не только route rendering |
| Access/privacy negative paths | `partial` | unit/integration/e2e coverage для ownership и role scope; discussion post delete now binds `postId` to the requested `lessonId`, assignment list scope covers both course-level and lesson-level assignments through enrollment/instructor ownership; course list API now uses `listCoursesForActor()`/`courseReadWhereForActor()` and published-only student/customer observer filtering, leaderboard is no longer a global XP list for every `courses:read` actor and is scoped by active cohort/course/instructor assignment/curator assignment/observer project; lesson visibility logging resolves lesson course and checks `assertLearningContentAccess()` before `logVisibilityChange()`, invalid payload does not read lesson/log; academy search is actor-scoped through `courseReadWhereForActor()` and no longer searches globally across all courses/lessons, course detail uses shared `assertCourseReadAccess()` instead of broad elevated role shortcut, assignment detail GET checks course read scope, lesson content is separated via `assertLearningContentAccess()` from observer/reporting course scope, attendance actions use `assertCourseAnalyticsAccess()` and deny students with only `courses:read`, quiz question import is course-scoped for source questions, lesson-level quiz question create/update/delete verify instructor course ownership and bind `questionId` to URL `quizId`, assignment PATCH/DELETE fail closed without course context and use shared instructor scope, SCORM runtime access is separated from broad course-read scope and denies `customer_observer` access to learning SCORM content, launch-start checks runtime access before `createScormLaunch()` and returns structured `not_found`, SCORM package/import routes verify instructor course scope before import/read/delete and missing import file returns structured `bad_request`, outbox notification/report processors no longer persist raw exception messages into failed event state and use safe Russian failure messages, SCORM serve proxy requires authenticated `courses:read`, verifies course scope before storage access, rejects unsafe paths, avoids raw storage error leakage, and uses private/no-store cache for launch HTML, SCORM launch/CMI endpoints cover Zod validation for launch update/CMI values, structured `bad_request` for missing CMI name, and no service call on invalid CMI payload, certificate designer preview covers invalid JSON/non-object payload validation and no PDF generation on invalid body, lesson discussion delete covers `courses:read` gate, Zod `postId` validation, and no service call on invalid payload, reports download/preview/job rate-limit covers structured `too_many_requests` before generation/outbox enqueue and unsupported format returns Russian `bad_request`, users export API covers auth error passthrough, admin/super-curator-only gate, no raw DB error response, and CSV formula/quote escaping, admin actions wrap unexpected mutation errors without raw backend details and bulk import users returns safe per-row errors, curator/analytics actions preserve controlled `ApiError` without stderr-noise and wrap unexpected errors, chat/quiz-assignment actions also suppress controlled-error stderr and wrap unexpected create/read/upload errors, cron endpoints cover fail-closed `CRON_SECRET`, structured unauthorized/service_unavailable errors, and no raw processor error response, push subscribe/unsubscribe covers structured rate-limit, Zod validation for unsubscribe payloads, and user-scoped endpoint deactivation, xAPI statements POST covers JWT/API-key boundary, Zod validation for single/batch payloads, and empty `204 No Content` success responses, visit session heartbeat/end payloads have Zod validation and avoid touching session/device state on invalid payloads, course-builder inline mutations require course write and have Zod validation negative-path tests, redirect-target role priority and inactive-user fallback are unit-tested, public auth reset endpoints are tested as `410 gone`, email verification has token-scoped hashed rate-limit and Zod validation, 2FA login/setup-disable/status routes have Zod validation, per-user rate-limit and structured error tests, revoked device-session heartbeat returns 403 and client redirects to `/login?reason=device-limit`, signed lesson media URL включая managed-storage no-public-fallback boundary и реальную передачу managed `storageKey` из upload-ticket, public certificate verify valid/revoked/no-private-payload, certificate revoke route requires `certificates:issue`, security notification persistence despite disabled preferences, reports API/preview/async job/status, certificate read RBAC/list/PDF/bulk route gates, certificate designer preview, certificate PDF observer scope, report job status owner/safe-download URL, chat upload negative tests, assignment upload raw-error suppression, user settings toast error suppression, notification preference mutation raw-error suppression, glossary action result/raw-error suppression, admin cohort form action result/raw-error suppression, super-curator cohort dialog action result/raw-error suppression, admin user edit/delete action result/raw-error suppression, admin create-user modal action result/raw-error suppression, admin enrollment action result/raw-error suppression, super-curator assignment action result/raw-error suppression, super-curator risk action result/raw-error suppression, and super-curator server action read/mutation raw-error suppression for cohorts, curators, students, distribution, risks, and reports; popup management scoped by creator for curators, admin-only diagnostics/toggle/delete/cohort selector, and course-owned cohort deadline reads |
| Operational release drill | `blocked` | `npm run verify:release` в целевом окружении плюс backup/restore/rollback evidence |

### Правило статусов

- `done` разрешён только при наличии code/test/browser/gate/docs/ops evidence, которое проверяет именно заявленное поведение.
- Route rendering, наличие страницы или зелёный build не доказывают рабочий продуктовый сценарий.
- `implementation-plan.md` может фиксировать реализованные домены, но итоговая release-ready оценка берётся из этого плана, `full-project-audit.md` и контракта `release-hardening/readiness.ts`.
- Любое изменение поведения обновляет `docs/updates.md`; существенное изменение статуса обновляет также `docs/work-plan.md` и этот документ.

### Следующая реализация

1. Закрыть WP1: расширить Playwright сценарии так, чтобы они доказывали действия по всем 6 ролям на seeded/disposable env.
2. Закрыть WP2: добавить недостающие negative-path тесты по guessed IDs, observer scope, media/report/certificate privacy.
3. Продолжать WP3 только как regression guard: новые страницы и компоненты должны использовать server modules/actions, а direct Prisma в UI блокируется unit-тестом.

---

## 2. Release Verification Runbook

Date: 2026-06-18

This runbook is the release gate for AI Strategic Academy. A release is not green until the full command succeeds on a prepared environment.

### Command

```bash
npm run verify:release
```

The command runs:

- `npm run verify:security`
- `npm run lint -- --max-warnings=0`
- `npm run typecheck`
- `npm run test`
- `npx prisma validate`
- `npm run db:generate`
- `npm run build`
- `npm run test:e2e`

### Required Environment

- `DATABASE_URL` points to the release/staging database.
- Migrations are applied with `npm run db:migrate`.
- Test users exist via `npm run users:create`.
- Demo credentials are verified via `npm run users:check-demo`.
- Demo learning data exists via `npm run course:create-demo`.
- Required auth, storage, SMTP, and app URL env vars are configured.
- Playwright browsers are installed for the runner.
- `npm run test:e2e` refuses remote database hosts by default because the suite mutates seeded data; set `ALLOW_REMOTE_DATABASE_MUTATION=true` only for an intentional staging release run.

### E2E Scope

The release E2E gate must cover:

- public pages and closed registration;
- login smoke for admin, instructor, student, curator, super curator, customer observer;
- role boundary redirects to `/403` or `/login`;
- student dashboard, my courses, and settings smoke.

If E2E cannot run locally because the database or browser runtime is unavailable, the static gate may still be run with `npm run verify`, but the release remains blocked until `npm run verify:release` passes in a disposable/local DB or explicitly approved staging environment.

### Historical Static Gate (2026-05-24)

Эта таблица фиксирует исторический зелёный repo-local/static gate. Она не повышает текущий release-ready статус, пока WP1-WP6 из раздела выше не закрыты evidence.

| Step | Result | Notes |
|------|--------|-------|
| `lint --max-warnings=0` | ✅ Pass | 0 errors, 0 warnings |
| `typecheck` | ✅ Pass | tsc --noEmit clean |
| `test` | ✅ Pass | 422 теста, 69 файлов — всё зелёное |
| `prisma validate` | ✅ Pass | Schema valid |
| `db:generate` | ✅ Pass | Prisma Client generated |
| `build` | ✅ Build | Next.js 16 production build successful (87 pages) |
| `test:e2e` | ✅ Pass | 52/52 smoke-тестов (Chromium + Pixel 7) |

**Исторический вывод:** repo-local/static gate был зелёный, v1.0.0 мог быть выпущен как кодовая итерация. **Текущий release-ready статус см. `docs/READINESS.md`: `partial`.**

### Rollback Rule

For schema or access-control changes, prepare a database backup before release. If the release fails smoke checks after deploy, roll back the app version first; roll back database changes only from the matching backup/runbook for that migration.
