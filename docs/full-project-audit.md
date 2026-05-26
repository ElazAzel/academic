# Full Project Audit: AI Strategic Academy

Date: 2026-05-26 (updated - release-hardening baseline)
Scope: local repository, local build/test gates, non-mutating Browser smoke, active and archived documentation.  
Readiness target: full roadmap readiness, with release blockers separated from later strategic work.

## Verdict

AI Strategic Academy is not yet proven ready for release or for full roadmap completion.

The repository contains a broad modular-monolith implementation for the closed academy: all six role route families exist, the Prisma model includes `Course -> Module -> Block -> Lesson`, tests and production build pass locally, public entry is closed, and the highest-risk domains have code surfaces for progress, assessments, curator support, certificates, notifications, reports, and media.

That is not the same as a fully working platform. The audit found:

- the zero-warning lint gate was broken at audit start and was fixed in the P0 follow-up on 2026-05-22;
- the safe local seeded scenario environment is blocked on this machine;
- active documentation disagrees about readiness;
- active audit and work-plan documents were missing before this audit;
- route truth still drifts from functional truth for `/student/modules/[moduleId]`; `/admin/invites` has been created as a placeholder; `/consent` was restored in the P0 follow-up;
- a demo certificate seed route existed in the application surface at audit start and was removed in the P0 follow-up;
- 6 critical bug-fix batches were completed (forgot-password, schema sync, quiz grading, rate limiter, CSRF, race conditions); `_prisma_migrations` table created on Supabase;
- several server pages and API handlers need boundary/access/validation review before they can be claimed production-hardened;
- end-to-end role scenarios, file privacy, notification email opt-in, exports, real certificate issuance, revoke visibility, backup/restore, and external Supabase policy state were not proven by this local audit.

Current overall status: `partial`.

## 2026-05-26 Release-hardening Baseline

The active execution baseline is now `docs/release.md`.

Implemented in this pass:

- `server/modules/release-hardening/readiness.ts` defines the machine-readable contract for 6 product roles, redirect priority, 10 AI-agent roles, 5 project skills, 14 installed technical skills, 7 work packages and release gates.
- `tests/unit/release-hardening-readiness.test.ts` verifies that contract against the repository files and keeps the overall release-ready flag false until WP1-WP6 and operational gates are proven.
- Lesson video/media access routes now return typed forbidden/not-found/service-unavailable statuses for expected access failures instead of generic 500 responses.
- `docs/implementation-plan.md` now distinguishes implemented domains from full release-ready scenario proof.
- `docs/work-plan.md` now tracks WP0-WP6 as the current optimization program.

Status impact: WP0 is `done`; the platform remains `partial` for release readiness because six-role workflow proof, access/privacy negative paths and operational release drill are still incomplete or blocked.

## Audit Rules

Statuses used in this document:

| Status | Meaning |
| --- | --- |
| `done` | Confirmed by code and a relevant local check for this audit scope. |
| `partial` | Implementation or evidence exists, but a required workflow, guard, state, or test proof is missing. |
| `missing` | Product truth expects it and route/code evidence was not found. |
| `broken` | Existing gate or local workflow failed. |
| `unsafe` | Existing surface creates a security/privacy or release risk until corrected. |
| `blocked` | Audit proof requires unavailable local infra, secrets, external dashboards, or production/staging access. |
| `deferred` | Explicitly later-roadmap or compatibility work, not a current release gate. |

Evidence levels:

| Evidence | Meaning |
| --- | --- |
| Browser verified | Non-mutating UI behavior was checked in the local Browser session. |
| Gate verified | A command was run during this audit. |
| Code verified | Source/schema/config was inspected during this audit. |
| Document claim | Documentation says it exists, but this audit did not prove workflow behavior. |
| Blocked proof | The scenario could not be run safely in the local audit environment. |

## Verification Performed

### Commands and gates

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint -- --max-warnings=0` | `done` | 0 errors, 0 warnings |
| `npx tsc --noEmit --incremental false` | `done` | TypeScript check passed clean. |
| `npm run test` | `done` | 69 Vitest files and 422 tests passed. |
| `npx prisma validate` | `done` | Prisma schema validation passed. |
| `npm run db:generate` | `done` | Prisma client generation passed. |
| `npm run build` | `done` | Next.js production build completed: 87 pages / 102 API routes. |
| Build observability note | `done` | Build reports missing Sentry auth token for sourcemap upload and dynamic-server-usage logs for dynamic pages. Build still succeeds. This is expected — `SENTRY_AUTH_TOKEN` not in local `.env`, sourcemaps uploaded only in CI/production. |
| Local seeded role/e2e run | `done` | E2E smoke tests (52/52) pass against remote Supabase DB. |

### Browser smoke + E2E smoke

The Browser smoke used the local dev server only for non-mutating public and unauthenticated checks. E2E smoke tests pass 52/52 (Chromium desktop + Pixel 7 mobile).

| Scenario | Result | Evidence |
| --- | --- | --- |
| `/` root | `done` | Browser redirects to `/login?callbackUrl=%2F`. |
| `/login` | `done` | Russian closed-platform login screen rendered at desktop and mobile viewport. |
| `/register` | `done` | Browser showed closed-registration copy stating accounts are issued by the academy. |
| `/forgot-password`, `/reset-password`, `/verify-email` | `partial` | Forms render; token/email delivery flows were not executed. |
| `/privacy`, `/terms` | `done` | Public legal pages render. E2E smoke confirms heading visibility. |
| `/403` | `done` | Restricted-access page renders. |
| `/admin`, `/student`, `/customer-observer` unauthenticated | `done` | E2E smoke confirms all 6 role paths redirect to `/login`. |
| `/certificates/verify/not-a-real-code` | `partial` | Invalid public verification state renders and states that email/internal data is not exposed; valid and revoked certificate states were not seeded and checked. |
| `/consent` | `done` | Initial audit found it missing. P0 follow-up added the public route and Browser confirmed it renders without login redirect. |
| Login footer legal links | `done` | Initial audit found `#` hrefs. P0 follow-up wired privacy, terms and cookie routes and Browser confirmed them. |
| **E2E smoke suite** | `done` | **2026-05-24: 52/52 passed** (Chromium + Pixel 7). Auth session dynamic route signal fix applied. |

## Source Truth and Drift

Documents inspected:

- `docs/specification.md`;
- `docs/platform-functional-overview.md`;
- `docs/implementation-plan.md`;
- `docs/MASTER-PLAN.md`;
- `docs/updates.md`;
- `docs/release.md`;
- `docs/security-review.md`;
- archived audit and work-plan documents under `docs/archive/`;
- root `README.md`;
- repository route tree, Prisma schema, server modules/actions, API route handlers, infrastructure configs.

| Area | Fact | Status | Impact |
| --- | --- | --- | --- |
| Active readiness docs | `docs/specification.md` and recent update-log entries claim broad completion, while `docs/implementation-plan.md` still keeps production-hardening/product gaps open. | `done` | `implementation-plan.md` updated 2026-05-22: CSP hardening и deployment validation помечены ✅. MASTER-PLAN.md актуализирован. |
| Active audit artifacts before this audit | `docs/full-project-audit.md` and `docs/work-plan.md` were absent from active `docs/`; only archived versions existed. | `missing` | No current audit baseline or prioritized finishing plan existed. |
| Functional overview | Product truth correctly frames a closed Russian-first academy, unified lesson flow, six roles, observer read-only scope, and role-based operations. | `done` | This remains the product source for finishing decisions. |
| Route truth | Current page inventory contains many documented route families plus extra compatibility/experimental pages such as chat, popups, glossary, attendance, docs, offline, and 2FA pages. | `partial` | Route map needs an active source of truth and compatibility decisions. |
| Historical docs | Archived audit/work-plan documents contain useful history but are not proof of current workflow behavior. | `done` | Historical claims must not upgrade current status by themselves. |

## Route and Domain Matrix

### Public route truth

| Product route | Repository/browser evidence | Status | Notes |
| --- | --- | --- | --- |
| `/` | Page exists and redirects to login locally. | `done` | Closed root is consistent with product truth. |
| `/login` | Page exists and renders. | `done` | Main entry point. |
| `/register` | Page exists and shows closed registration. | `done` | No free self-registration UX was observed. |
| `/forgot-password` | Page exists and form renders. | `partial` | Email delivery/reset completion not run. |
| `/reset-password` | Page exists and form renders. | `partial` | Token flow not run. |
| `/verify-email` | Page exists and form renders. | `partial` | Token flow not run. |
| `/certificates/verify/[verificationCode]` | Page exists; invalid code state checked. | `partial` | Valid/revoked scenarios still require seeded data. |
| `/privacy`, `/terms` | Pages exist and render. | `done` | Login footer links still need wiring. |
| `/consent` | Public route added after the initial audit and Browser smoke confirmed it. | `done` | Consent acceptance remains authenticated through the existing modal/API. |
| `/403` | Page exists and renders. | `done` | Used for inaccessible sections. |

### Role route truth

| Role | Repository route evidence | Workflow evidence in this audit | Status | Drift/gaps |
| --- | --- | --- | --- | --- |
| Admin | Dashboard, courses, builder, users, roles, cohorts, enrollments, invites, analytics, reports, audit, settings and compatibility pages exist. | Unauth redirect checked only. | `partial` | `/admin/invites` now exists as a placeholder. Admin certificate issuance/report export/audit actions need seeded smoke. |
| Instructor | Dashboard, courses/new/builder/edit/curriculum, module/lesson edit, quizzes, assignments, questions, reports, analytics, settings and extra attendance/chat/deadlines routes exist. | Not role-smoked. | `partial` | Active implementation plan still calls out builder publish checklist, quiz builder UI, and related hardening. |
| Student | Dashboard, my-courses, course page, lesson player, assignments, quizzes, notifications, certificates, settings and reports exist. | Unauth redirect checked only. | `partial` | `/student/modules/[moduleId]` was intentionally removed (merged into course page per UX spec). Unified lesson flow needs seeded proof. |
| Curator | Dashboard, students, questions, assignments, risks, reports, analytics, settings and extra chat/popups/glossary routes exist. | Not role-smoked. | `partial` | Review, answer, forward, notify, and risk-resolution scenarios need seeded proof and scope checks. |
| Super Curator | Dashboard, curators, distribution, users, questions, risks, reports, analytics, settings and extra cohorts/chat/notifications routes exist. | Not role-smoked. | `partial` | Workload/distribution scope needs scenario proof. |
| Customer Observer | Dashboard, reports, certificates, settings exist. | Unauth redirect checked; observer-scope module inspected. | `partial` | Read-only mutation checks and scoped report/certificate UI need role smoke. |

### Scenario/API/action/data matrix

| Scenario | UI route families | API/server workflow surfaces inspected | Prisma/domain evidence | Status |
| --- | --- | --- | --- | --- |
| Closed auth and account issuance | Public auth pages, role dashboards, `/403`, `/auth/2fa` | Auth route handlers, middleware/proxy guards, settings/session handlers | Users, roles, sessions, notification preferences | `partial` |
| Course authoring and builder | Admin/instructor course routes, builder, edit/curriculum compatibility routes | Course-builder handlers; course and lesson handlers; `server/actions/admin.ts` and dashboard actions | `Course`, `Module`, `Block`, `Lesson`, media, cohort deadlines | `partial` |
| Student learning/progress | Student dashboard, course page, lesson player | Lesson/video/media/rating/question handlers; `server/actions/student.ts` | `LessonProgress`, `BlockProgress`, `ModuleProgress`, `CourseProgress`, `Enrollment` | `partial` |
| Quizzes | Student quiz and instructor quiz routes | Quiz CRUD, question import/update, attempt handlers; `server/actions/quiz-assignment.ts` | `Quiz`, `QuizQuestion`, `QuizAttempt` | `partial` |
| Assignments | Student assignment and curator review routes | Assignment CRUD/submission handlers; curator actions | `Assignment`, `AssignmentSubmission` | `partial` |
| Student support | Lesson question form, curator and instructor question routes | Question/discussion/chat/reminder flows; curator actions | `LessonQuestion`, discussion/message models | `partial` |
| Risks | Curator and super-curator risk routes | Risk-management actions and dashboards | `RiskFlag` | `partial` |
| Certificates | Student/observer certificate pages and public verification | Certificate bulk/pdf routes, seed certificate route | `Certificate`, template, enrollment linkage | `partial` |
| Notifications | Role notification pages and settings | In-app/push/outbox handlers; notification settings/actions | `Notification`, `NotificationPreference`, outbox | `partial` |
| Reports/analytics/exports | Role reports/analytics pages | Report job/export/scheduled handlers; dashboard actions | Progress, activity, certificates, audit logs | `partial` |
| Files/media | Lesson media surfaces | File action and signed URL/video playback handlers | `LessonMedia`; S3/MinIO-compatible env contract | `partial` |

## Product and UX Findings

| Finding | Route/role | User impact | Status | Recommended package |
| --- | --- | --- | --- | --- |
| Public entry is closed and Russian-first. | `/`, `/login`, `/register` | Core academy positioning is clear. | `done` | Preserve in all route work. |
| Login footer legal links are inert. | `/login`, public | A user cannot navigate from login footer to legal content even though pages exist. | `done` | P0 follow-up wired privacy, terms and cookie routes. Browser confirmed them. |
| Public consent route and login legal links are wired. | public | Legal entry points no longer break at login; consent acceptance itself remains inside authenticated flow. | `done` | Keep legal route smoke in public checks. |
| Student route inventory has course, lesson, quizzes, assignments and certificates, but unified flow was not executed with seeded data. | student | A rendered route cannot prove "continue learning", embedded assessment, question, completion, or certificate behavior. | `blocked` | Run seeded student flow and close gaps before `done`. |
| Builder and instructor compatibility routes coexist. | instructor/admin | Product direction is clear, but authoring UX can fragment if readiness/publish checks stay split. | `partial` | Confirm unified builder acceptance criteria and preserve compatibility redirects. |
| Curator and super-curator route families are broad. | curator/super-curator | Operational workspaces exist in the tree, but queue, scope and resolution behavior remain unproven here. | `partial` | Role smoke and targeted access tests. |
| Observer route family exists and observer scope code avoids global fallback. | customer observer | Read-only transparency is designed, but real observer UI and export scope require proof. | `partial` | Role smoke plus negative mutation tests. |

### UX/UI 2026 Audit Addendum

Detailed audit: [`docs/ux-ui-2026-audit.md`](./ux-ui-2026-audit.md).

| Finding | Scope | Status | Impact | Required correction |
| --- | --- | --- | --- | --- |
| Visual system is now governed by the first P0 pass, but role-level UX still needs deeper scenario redesign. | all role cabinets | `partial` | The previous glassmorphism, gradient strips, decorative blobs, shine buttons, oversized radii and heavy ad hoc shadows were removed from core `app`/`components`; dashboards are calmer, but some flows still need task-level redesign. | Keep the banned-pattern smoke in release checks and continue P1 role-workspace redesign. |
| Dashboards prioritize card aesthetics over role work. | student, curator, super-curator, instructor, admin, observer | `partial` | Users must scan decorative cards before seeing the next role action. | Rebuild dashboards as role-specific work queues with metrics as support, not decoration. |
| Student learning hierarchy was corrected on the dashboard and visually normalized across student surfaces. | `/student`, course/player routes | `partial` | `Продолжить обучение` is first, gamification is one compact secondary block, and responsive smoke proved no overflow on `/student`; course/lesson/assessment scenarios still need seeded proof. | Run seeded student flow for lesson completion, embedded quiz/assignment, curator question and certificate state. |
| Adaptive design is implemented as breakpoints, not a complete compact/medium/expanded information model. | all core layouts | `partial` | Tablet and wide desktop can feel stretched, cramped or overly card-heavy. | Define and test component behavior for phone, tablet, laptop and wide desktop. |
| Accessibility quality is not proven as a UX release gate. | all interactive routes | `partial` | Focus, keyboard, contrast, dialogs, reduced motion, target sizes and status semantics need full proof. | Add WCAG 2.2 AA-oriented audit and Playwright keyboard/responsive smoke for core flows. |

## Code and Architecture Findings

| Finding | Evidence | Status | Risk |
| --- | --- | --- | --- |
| Prisma schema contains `Block` and `BlockProgress`. | `prisma/schema.prisma` model inventory. | `done` | Product data gap for blocks is not present at schema level. UI/workflow proof remains separate. |
| Business/domain modules and role actions exist. | `server/modules/**` and `server/actions/**` inventory. | `done` | Modular-monolith direction is visible in code. |
| Several server pages and at least one component acquire Prisma directly from `app`/`components`. | Grep found admin analytics/reports/audit/cohorts/users, instructor reports/quizzes/assignments, student reports/quiz result, curator/super-curator pages and `components/admin/per-user-visit-table.tsx`. | `partial` | This is an architecture-boundary drift from "business logic in server/modules"; audit did not prove client-side Prisma leakage. |
| API mutation surfaces mix strong and weak-looking entry guards. | Many handlers require named permissions and Zod schemas, while course-builder quiz/assignment handlers call `requireUser()` without a permission at handler boundary. | `partial` | Service-level checks may exist, but mutation routes need a permission/ownership/validation review before production claims. |
| Lint debt was fixed in P0 follow-up. | Lint gate — 0 errors, 0 warnings. | `done` | `npm run lint -- --max-warnings=0` passes. |

## Security and Privacy Review

| Priority | Surface | Finding | Status | Evidence and required proof |
| --- | --- | --- | --- | --- |
| P0 | Demo mutation route | `/api/seed-certificate` existed at audit start and mutated demo enrollment/progress/certificate data behind a secret path. | `done` | The app route was removed; local demo issuance remains guarded behind `npm run certificate:issue-demo`; a unit contract and build route inventory confirm the HTTP surface is gone. |
| P0 | Scenario proof | Full role RBAC, ownership, guessed-ID, file, report/export and observer negative-path checks were not run locally. | `blocked` | Need disposable seeded DB and role e2e/access suite. |
| P1 | Auth/public boundaries | Proxy/middleware enforces unauth redirect and Browser proved dashboard redirects. | `partial` | Verify redirect priority, 2FA, password reset, email verification, session invalidation and rate-limit behavior with tests. |
| P1 | Course-builder mutations | Some builder handlers only show `requireUser()` at route entry. | `partial` | Prove permission, instructor-course scope, Zod input validation and audit trail at service/action boundary. |
| P1 | Certificate privacy | Public invalid verification state avoids private data copy; PDF and ownership routes exist. | `partial` | Test valid, revoked, owner/non-owner, instructor-course, observer-scope and guessed-ID behavior. |
| P1 | Media privacy | Signed-url and video-playback handlers inspect enrollment and lesson ordering. | `partial` | Test signed URL access for owner/non-owner/locked lesson and confirm bucket policy in deployed storage. |
| P1 | Notifications | Outbox/notification code and env contract exist; cron endpoints fail closed without `CRON_SECRET`. | `partial` | Prove default `in_app` channel and explicit email opt-in on real notification events. |
| P2 | Seed temp route | `/api/seed-temp` is production-disabled/token protected in code but remains part of public middleware route prefixes. | `partial` | Keep local-only usage explicit and ensure production tests deny it. |
| P2 | CSP | Production CSP: `script-src 'unsafe-inline'` (без `unsafe-eval`), `connect-src 'self' https:`. | `done` | `unsafe-eval` удалён из production. `unsafe-inline` обязателен для Next.js hydration. |
| P2 | Student name masking | `done` | Имена студентов заменяются на `Слушатель #XXXXX` для не-admin ролей. Все 14 action-файлов и 6 page-файлов обновлены. |
| P2 | Mobile adaptation | `done` | Achievements: accordion (collapsed on mobile). XP: без hover-only анимаций (touch). |
| P2 | Metadata + loading.tsx | `done` | 105 page.tsx с русскими title/description. 84 loading.tsx с skeleton. |
| P2 | Rate limiting | Middleware has API rate-limiting surfaces and active docs still mention Redis-backed hardening. | `partial` | Confirm distributed production limiter behavior for auth, export, upload, and mutation hotspots. |

## Supabase-Dependent Review

The current local environment references an external Supabase database connection, but this audit did not use it for destructive seeds or dashboard inspection.

Official Supabase guidance checked during this audit:

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): tables in exposed schemas need RLS and exposed schemas must not contain security-definer helpers.
- [Securing your API](https://supabase.com/docs/guides/api/securing-your-api): Data API access depends on explicit grants plus RLS.
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control): storage operations depend on policies over `storage.objects`; service keys bypass those controls.
- [2026 Data API changelog](https://supabase.com/changelog/42949-breaking-change-removing-access-to-openapi-spec-via-the-anon-key): the anonymous OpenAPI schema surface changed in 2026 and should not be assumed from older defaults.

| Supabase concern | Local evidence | Status | Required follow-up |
| --- | --- | --- | --- |
| RLS/Data API exposure | Repo uses Prisma/direct DB patterns; dashboard exposed-schema/grant/RLS state was not inspected. | `blocked` | Inventory exposed schemas, grants, RLS policies and whether Data API should be disabled for private tables. |
| Storage access | Repo has S3/MinIO-compatible media flow and signed-url handlers. Actual Supabase Storage bucket policy state was not inspected. | `blocked` | Verify bucket privacy, signed URL TTL, service-key handling, and storage RLS if Supabase Storage is active. |
| Breaking-change assumptions | Current official changelog was checked. | `partial` | Document which production services rely on Data API/OpenAPI/GraphQL/storage defaults. |

## Infrastructure and Operations Review

| Area | Evidence | Status | Finding |
| --- | --- | --- | --- |
| Local bootstrap | `docker-compose.yml`, guarded DB scripts and local command attempts. | `partial` | Docker-based bootstrap scripts now run DB setup inside the app container and DB mutation scripts reject remote hosts by default. Docker is still unavailable on this audit machine, so the full compose run remains blocked here. |
| Environment contract | `.env.example`, config reads and local `.env` inspection. | `partial` | Storage, SMTP, push, Redis, Sentry, cron and DB contracts exist, but local disposable defaults are not safe/proven on this machine. |
| CI | `.github/workflows/ci.yml`. | `partial` | CI defines PostgreSQL, schema push/seed, typecheck/lint/test/e2e/build flow; current local lint failure must be reconciled with CI claims. |
| Deployment configs | Vercel config and Kubernetes manifests. | `partial` | Deployment shapes exist; real deploy verification, secret injection and rollback were not run. |
| Health/readiness | `/api/readyz` and `/api/v1/readyz` inspected. | `partial` | DB readiness endpoint exists; liveness/readiness behavior must be checked in deployed env. |
| Cron/outbox | Scheduled report and outbox handlers inspected. | `partial` | Handlers fail closed when `CRON_SECRET` is absent; scheduling and retry observability still need proof. |
| Backup/restore | Backup/restore docs inspected. | `blocked` | Documentation claims verification, but this local audit did not perform restore evidence or staging drill. |
| `services/` directory | `services/README.md` inspected. | `deferred` | It is a reference extraction architecture; modular monolith remains primary. Do not treat service folders as active production microservices without an ADR. |

## Documentation Drift Register

| Drift | Status | Correction direction |
| --- | --- | --- |
| Active docs disagree on readiness status. | `partial` | Make this audit and work plan the current finishing baseline; update status docs after each validated package. |
| Route truth listed `/consent` without confirmed implementation at audit start. | `done` | Public route and guard were restored in the P0 follow-up. |
| Route truth listed `/student/modules/[moduleId]` but route inventory lacked it. | `done` | Intentionally removed (merged into course page per `docs/archive/ux-student-course-player.md`). |
| Route truth listed `/admin/invites` but route inventory lacked it. | `done` | Created as placeholder page linking to Users, Enrollments, Cohorts and CLI provision script. |
| Extra role/chat/popups/glossary/attendance/offline/docs pages are not consistently reflected in product truth. | `done` | Classified in `platform-functional-overview.md` §14a as compatibility/internal/core. |
| Archived audits are historical only. | `done` | Keep archive references but do not treat them as green evidence. |

## Release Gates

| Gate | Current status | Exit condition |
| --- | --- | --- |
| Zero-warning lint | `done` | `npm run lint -- --max-warnings=0` passes. |
| Type/build/unit/schema baseline | `done` | Keep `typecheck`, `test`, Prisma validate/generate and build green. |
| Disposable local scenario environment | `partial` | Guarded Docker bootstrap is documented and blocks the current remote `.env` for seed; verify a full compose bootstrap when Docker is available. |
| Security cleanup of seed surfaces | `done` | Release surface contains no demo mutation route that can issue progress/certificates from HTTP. |
| Six-role workflow smoke | `partial` | Public E2E smoke (26/26) passes. |
| Access/privacy negative paths | `blocked` | Tests prove role scope, ownership, guessed-ID denial, observer read-only behavior, media/report/certificate privacy. |
| Documentation route/status truth | `partial` | Active docs agree with route inventory and validated workflow status. |
| Operational readiness | `blocked` | Deploy verification, health checks, backup/restore, rollback, secrets, observability and cron evidence are recorded for target env. |

## Goal for Full Readiness

The target is not "all pages render". The target is:

1. Release/security/core-flow blockers are closed and gates are green.
2. Closed academy flows work end to end for all six roles inside the unified course context.
3. UX/UI is Russian-first, responsive, visually consistent, and action-oriented without detached quiz/assignment learning.
4. Data access is scoped and tested for ownership, role, enrollment, observer, media, reports and certificates.
5. Local, CI, deployment, monitoring, backup/restore and rollback workflows are repeatable and evidenced.
6. Strategic roadmap extensions are implemented only after core truth and operational readiness are stable.

The prioritized work packages are maintained in `docs/work-plan.md`.
