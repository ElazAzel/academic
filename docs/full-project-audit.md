# Full Project Audit: AI Strategic Academy

Date: 2026-06-03 (updated - storage/push safe logging)
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

Current overall status: `partial`. Short live status is maintained in `docs/READINESS.md`.

## 2026-06-03 Certificate/Report Privacy Update

WP2/WP5 proof improved for certificate and report boundaries:

- certificate PDF route is covered by negative-path tests for missing permission, guessed student ID, customer observer outside scope, revoked certificates and instructor course assignment before PDF rendering;
- customer observer report service scope is now tested for progress export, risk preview and certificate export through `studentIds`/`cohortIds`/`courseIds`;
- certificate report rows now include `status` and `revokedAt`, and CSV/XLSX/PDF exports show active/revoked summary and revoked date so revoked certificates are visibly invalid in reports.
- `ReportDesigner` now includes `status` and `revokedAt` in the default certificate report selection, with component tests covering certificate fields and forbidden default report fallback for `customer_observer`.
- `DownloadReports` and report display metadata now use Russian owner/scope labels instead of visible English labels such as `Customer observer` and `Scope:`.
- Report API negative-path messages for missing/unknown report type and fallback generation reasons are now Russian structured errors instead of visible English strings.
- Report download caching now includes selected `fields`, preventing custom CSV/XLSX/PDF exports from receiving stale cached content generated for a different column set.
- Async report jobs now preserve selected `fields` through queue payload, processor generation and sanitized status download URL, while unsafe field tokens and non-report URLs are rejected before queueing or client exposure.
- `ReportDesigner` now hides itself when a role has no allowed report types, preventing a misleading fallback download action if the component is mounted outside the approved report pages.

Status impact: certificate/report privacy evidence is stronger, but the audit remains `partial` until full six-role seeded E2E, browser report/certificate scenarios, operational drill, DPA and secret-rotation evidence are complete.

## 2026-06-03 AI Assistant Update

WP2/WP4 proof improved for the curator assistant surface:

- `getQuestionSuggestionsAction()` now checks `curator`/`super_curator`/`admin` role access before validation and glossary lookup.
- Controlled `ApiError` paths are returned without stderr noise, while unexpected failures are wrapped in a safe Russian `internal_error` message.
- `tests/unit/actions-assistant.test.ts` covers role gate, validation no-service-call, successful glossary suggestions and raw backend error suppression in the action response.

Status impact: the assistant remains a contextual curator workflow aid rather than a broad student/public AI surface. The overall audit remains `partial` until seeded role workflows, accessibility proof and operational release drills are complete.

## 2026-06-03 Russian-First Error Contract Update

WP2/WP4 proof improved for upload and popup/chat negative paths:

- media upload policy and fallback routes no longer expose English messages for unsupported file types, unmanaged storage keys, oversized/empty files or storage fallback failures;
- admin popup manager no longer uses English fallback errors for fetch/create/toggle/delete operations;
- chat upload fallback copy now uses Russian fallback text;
- `tests/unit/media-upload.test.ts` and `tests/unit/media-upload-routes.test.ts` cover Russian schema/API errors for the affected upload paths.
- curator popups, lesson discussion, notifications, deadline alerts, instructor/admin deadline managers and upload-with-compress no longer use common English runtime fallback messages such as `Failed to fetch`, `Failed to load discussion` or `Upload failed`;
- `tests/unit/russian-first-runtime-copy.test.ts` guards the affected runtime files against reintroducing these English fallback strings.
- visible admin/instructor operational labels in settings, attendance, certificate issue, user create/edit and bulk import screens now use Russian copy for selected labels previously shown as `Email`, `Feature Flags`, `Email & SMTP`, `SMTP Host`, `SMTP Port` and `Bypass progress requirements`;
- `tests/unit/russian-first-admin-copy.test.ts` guards those operational files against reintroducing the selected English labels.
- report preview responses now expose `isTruncated` and `rowLimit`, and `ReportDesigner` labels capped previews as a limited sample instead of presenting a bounded result as the full row count;
- `tests/unit/reports-service.test.ts` and `tests/unit/components/report-designer.test.tsx` cover the truncation metadata and UI label.
- curator assistant input now has a 2000-character max-length guard before `getAnswerSuggestions()` and PostgreSQL FTS/glossary search;
- `tests/unit/actions-assistant.test.ts` covers oversized input as a controlled Russian `bad_request` with no service call and no stderr noise.
- command palette search fallback no longer uses `Search failed`; the shared runtime-copy guard now includes `components/lms/command-palette.tsx`.
- disabled billing endpoints for checkout and Stripe webhooks now return Russian `410 Gone` payloads through shared constants, with route/service tests and runtime-copy guard coverage preventing return of `Payments are disabled` / `Stripe webhooks are disabled`.
- SCORM manifest parser now uses Russian root-missing errors and `SCORM-пакет` fallback title; import service returns a safe Russian parse reason instead of raw parser details, with parser/import tests and runtime-copy guard coverage.
- `verifyCsrf()` now returns Russian structured `403` reasons for missing source, malformed source and origin mismatch, with comparison logic separated from URL parsing so mismatch is no longer collapsed into invalid-origin handling.
- `/api/readyz` and `/api/v1/readyz` now return Russian `503 service_unavailable` messages when the database is unavailable, and route tests assert raw backend details are not present in the response.
- chat action student/receiver boundary errors now use Russian controlled messages, with action tests and runtime-copy guard coverage for the prior English strings.
- `/admin/enrollments` now uses the `requireRolePage(["admin"])` return value directly and no longer carries a raw English `Unauthorized` throw after the page guard.
- GraphQL scaffold route/resolvers now use Russian runtime/scaffold copy instead of English fallback messages, with route test and shared runtime-copy guard coverage.
- Lesson video/media access routes now write Russian security/audit `metadata.reason` values for no enrollment, sequential lesson lock, missing lessons, guessed media IDs and repeated signed URL requests, with security/privacy assertions and runtime-copy guard coverage for the prior English reasons.
- Shared `WorkspacePage` no longer exposes visible service terminology such as `MVP`, `production scaffold`, `REST-контракты`, `server modules` or `React Query`; the placeholder state is now neutral Russian UX copy and guarded by the visible-copy test.
- GraphQL `501 not_implemented` copy no longer uses the mixed-language `GraphQL runtime` / `REST endpoints MVP` phrasing and is guarded by the route/runtime-copy tests.
- Push subscribe/unsubscribe background paths keep silent `200` behavior for unauthenticated PWA registration attempts, but now return Russian `reason` copy and avoid rate-limit/storage side effects; POST/DELETE paths are covered by unit tests and runtime-copy guard.
- Admin visit analytics error state no longer exposes raw `error.message` from analytics server actions; users see a stable Russian recovery hint while technical details stay in server logs, with component and admin-copy guard tests.
- Certificate designer now separates expected local user-facing upload/preview failures from unknown action/API exceptions, preventing raw `error.message` leakage in the visible constructor error state.
- CertificatesDashboard now consumes the standard `{ data }` / `{ error }` API envelope for manual certificate issue/revoke flows and avoids showing raw network exception text in the visible admin error state.
- ReportDesigner preview now consumes the standard preview API envelope, validates minimal payload shape, preserves controlled API `error.message`, and replaces raw network exceptions with safe Russian fallback copy.
- Profile/password settings and notification preferences now avoid exposing arbitrary raw `Error.message` text in toast copy; expected password domain errors remain visible through a whitelist, while network/runtime failures use safe Russian fallbacks.
- `GlossaryEditor` now handles failed glossary action results, shows only controlled domain errors, and replaces raw action exceptions with safe Russian toast fallbacks.
- Admin cohort create/edit forms now handle failed action results and replace raw create/update action exceptions with safe Russian toast fallbacks.
- Super-curator cohort create/edit/archive dialog now handles failed action results, replaces raw action exceptions with safe Russian toast fallbacks, and includes `DialogDescription` for accessibility.
- Admin user edit/delete dialog now handles failed action results, replaces raw action exceptions with safe Russian toast fallbacks, and adds accessible names/descriptions for icon-only controls and dialog content.
- Admin create user modal now handles failed action results, replaces raw action exceptions with a safe Russian inline fallback, and adds an accessible name for the close icon button.
- Admin enrollment forms now handle failed action results, replace raw enroll/delete exceptions with safe Russian inline/toast fallbacks, and add an accessible name for the delete enrollment icon button.
- Super-curator assignment forms now handle failed action results, replace raw add-student/add-curator/assign-curator exceptions with safe Russian toast fallbacks, remove visible English `Email` labels, and add accessible descriptions/labels.
- Super-curator `RiskActions` now handles failed risk action results, hides raw student-list/create/resolve exceptions behind safe Russian toast fallbacks, adds dialog/button accessibility metadata, and removes the React `selected` option warning.
- Student assignment upload components now whitelist expected upload-domain errors, hide raw `uploadMedia()` exceptions behind a safe Russian fallback, and add accessible names for the assignment upload/remove controls.
- Admin/instructor deadline clients and admin/curator popup clients now hide raw action/network exceptions behind safe Russian fallback messages, preserve controlled domain errors through allow-lists, and add accessible names/keyboard handling for date inputs, icon-only popup actions and clickable role/cohort/student controls.
- `LessonDiscussion` now reads the standard `{ data }` API envelope for discussion GET responses, shows the empty state correctly, and hides raw post-create/delete exceptions behind safe Russian fallback messages while preserving controlled discussion-domain errors.
- `/api/v1/sessions/start` now avoids logging raw persistence `error.message`/stack values in the server console payload and has no-leak route coverage for response and console output.
- App/global/component error boundaries now show stable Russian recovery copy instead of raw `error.message`, keep only safe digest output visible, and avoid raw message/stack values in console payloads.
- Storage and Web Push logging now avoids raw provider messages, exception objects and push endpoint tokens; focused tests cover Supabase upload/signed-url errors plus Web Push provider/expired-subscription failures.

Status impact: Russian-first evidence is stronger for user-facing error states, but the platform still needs seeded browser proof across the full role workflow set.

## 2026-05-30 Boundary Cleanup Update

WP3 repo-local boundary cleanup is closed for the current codebase:

- Direct Prisma Client usage was removed from `app/**/page.tsx` and `components/**`.
- Shared page queries now live in `server/modules/page-data/service.ts`.
- `tests/unit/release-hardening-readiness.test.ts` includes a regression guard for `@/lib/prisma`, `getPrisma()` and `prisma.*` in App Router pages and UI components.
- Playwright E2E navigation no longer uses `networkidle`; SSE-compatible waits use `domcontentloaded` plus page assertions.

Status impact: architecture-boundary drift is resolved locally. The audit status remains `partial` until the full release/staging evidence is rerun and external operational items such as DPA, secret rotation and git history purge are completed through their runbooks.

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
| Local seeded role/e2e run | `partial` | Historical E2E smoke passed against remote Supabase DB, but that is not accepted as disposable release proof. `npm run test:e2e` now blocks remote DB hosts unless `ALLOW_REMOTE_DATABASE_MUTATION=true` is explicit. |

### Browser smoke + E2E smoke

The Browser smoke used the local dev server only for non-mutating public and unauthenticated checks. Historical E2E smoke passed 52/52 (Chromium desktop + Pixel 7 mobile), but current release proof requires local/disposable or explicitly approved staging data because E2E mutates seeded records.

| Scenario | Result | Evidence |
| --- | --- | --- |
| `/` root | `done` | Browser redirects to `/login?callbackUrl=%2F`. |
| `/login` | `done` | Russian closed-platform login screen rendered at desktop and mobile viewport. |
| `/register` | `done` | Browser showed closed-registration copy stating accounts are issued by the academy. |
| `/forgot-password`, `/reset-password`, `/verify-email` | `partial` | Forms render; token/email delivery flows were not executed. |
| `/privacy`, `/terms` | `done` | Public legal pages render. E2E smoke confirms heading visibility. |
| `/403` | `done` | Restricted-access page renders. |
| `/admin`, `/student`, `/customer-observer` unauthenticated | `done` | E2E smoke confirms all 6 role paths redirect to `/login`. |
| `/certificates/verify/not-a-real-code` | `partial` | Invalid public verification state renders and states that email/internal data is not exposed; valid/revoked public API/service payload is covered by unit tests, but seeded browser states still need scenario proof. |
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
| `/certificates/verify/[verificationCode]` | Page exists; invalid code state checked. | `partial` | Valid/revoked API/service payload is covered by unit tests; seeded browser verification states still require scenario data. |
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
| Direct Prisma in page/component layer. | Boundary cleanup moved page data into `server/modules/page-data/service.ts`; `tests/unit/release-hardening-readiness.test.ts` blocks `@/lib/prisma`, `getPrisma()` and `prisma.*` returning to `app/**/page.tsx` and `components/**`. | `done` | Keep this as a regression guard for new pages/components. |
| API mutation/read surfaces mix strong and weak-looking entry guards. | Most handlers require named permissions and Zod schemas; shared `errorResponse()` now returns a fixed safe Russian message for generic 500 errors and preserves details only for controlled `ApiError`/Zod cases; notification detail and popup toggle missing-target paths use real structured `not_found`; admin actions now wrap unexpected mutation errors without raw backend details and bulk user import returns safe per-row failures; curator/analytics actions preserve controlled `ApiError` without stderr-noise and wrap unexpected errors; chat/quiz-assignment actions also suppress controlled-error stderr and wrap unexpected create/read/upload errors; settings actions now wrap unexpected profile/password/notification/app-settings errors without raw message leakage and validate password/notification FormData before sensitive writes; certificate template actions now validate object configs before auth/writes and wrap unexpected persistence errors without raw message leakage; lesson media upload/delete actions now verify lesson-course instructor ownership before storage metadata writes/deletes; quiz/assignment create actions now resolve writable course context and no longer create orphan content; instructor page-data/edit and instructor analytics now use lesson-level aware quiz/assignment scope and avoid id-only edit reads; discussion post delete now binds the post to the requested lesson, assignment listing handles lesson-level course scope; course list and leaderboard APIs are now actor-scoped instead of global `courses:read` reads; academy search is now actor-scoped instead of global course/lesson raw search; lesson visibility logging resolves lesson course and checks `assertLearningContentAccess()` before security event write; course detail, assignment detail, lesson detail and attendance now use shared course/content/analytics access helpers; course-builder inline quiz/assignment drift is closed with `courses:write` route-level permission plus Zod validation tests; quiz question import/create/update/delete and assignment PATCH/DELETE now resolve lesson-level course context and enforce instructor ownership; xAPI statements POST now has JWT/API-key boundary tests, typed single/batch payload validation and empty `204` success response. | `partial` | Remaining routes still need a full permission/ownership/validation review before production claims. |
| Lint debt was fixed in P0 follow-up. | Lint gate — 0 errors, 0 warnings. | `done` | `npm run lint -- --max-warnings=0` passes. |

## Security and Privacy Review

| Priority | Surface | Finding | Status | Evidence and required proof |
| --- | --- | --- | --- | --- |
| P0 | Demo mutation route | `/api/seed-certificate` existed at audit start and mutated demo enrollment/progress/certificate data behind a secret path. | `done` | The app route was removed; local demo issuance remains guarded behind `npm run certificate:issue-demo`; a unit contract and build route inventory confirm the HTTP surface is gone. |
| P0 | Scenario proof | Full role RBAC, ownership, guessed-ID, file, report/export and observer negative-path checks were not run locally. | `blocked` | Need disposable seeded DB and role e2e/access suite. |
| P1 | Auth/public boundaries | Proxy/middleware enforces unauth redirect and Browser proved dashboard redirects; redirect-target priority and inactive-user fallback are unit-tested; revoked device-session heartbeat now returns `403` and the client redirects to `/login?reason=device-limit`; admin/user-management actions, including bulk import per-row failures, keep raw backend errors out of user-visible failures; profile/password settings actions now keep raw persistence errors out of user-visible failures and password FormData is validated before DB account lookup; 2FA login/setup-disable/status routes now have Zod validation, per-user rate-limit and structured error unit coverage; public reset endpoints are tested as disabled and email verification uses token-scoped hashed rate-limit. | `partial` | Finish remaining auth rate-limit behavior across seeded/browser workflows. |
| P1 | Course-builder and learning access | Inline quiz/assignment handlers now require `courses:write` at route entry; lesson media upload/delete actions verify instructor ownership before media writes/deletes; generic quiz/assignment create actions now attach content to a writable course instead of creating orphan rows; instructor page-data/edit and dashboard analytics now include lesson-level quiz/assignment course scope; curator question/submission, chat, analytics risk/report and quiz-assignment create actions now avoid controlled-error stderr noise and wrap unexpected errors; quiz question import is source-course scoped, lesson-level quiz question mutation routes enforce instructor course scope, assignment detail/mutations fail closed without course context, course detail no longer grants all elevated roles global read, lesson content excludes observer/reporting-only scope, and attendance analytics deny student-only course readers. | `partial` | Finish the broader route review for permission, ownership, Zod input validation and audit trail. |
| P1 | Certificate privacy | Public invalid verification state avoids private data copy; valid/revoked public API/service payload is tested; PDF and ownership routes exist; template actions now keep instructor-course ownership and avoid raw persistence error leakage. | `partial` | Finish owner/non-owner, instructor-course, observer-scope and guessed-ID behavior across browser/API evidence. |
| P1 | Certificate designer preview | Preview route rejects invalid JSON/non-object payloads before draft PDF generation; template save action now rejects non-object configs before auth/writes while keeping object passthrough for template drafts. | `partial` | Finish seeded proof for admin/instructor template preview workflows. |
| P1 | SCORM runtime API | Runtime access now excludes customer observers from learning SCORM content and allows only admin, course instructor or active enrolled student; package/import routes verify instructor course scope before import/read/delete; serve proxy blocks unsafe paths, uses private/no-store cache for launch HTML, avoids raw storage errors, and Launch PATCH/CMI GET/POST validate route contracts before service writes. | `partial` | Finish seeded SCORM package runtime proof. |
| P1 | Media privacy | Signed-url and video-playback handlers inspect enrollment and lesson ordering. | `partial` | Test signed URL access for owner/non-owner/locked lesson and confirm bucket policy in deployed storage. |
| P1 | User export privacy | Users CSV export now preserves auth errors, restricts export to admin/super-curator, avoids raw DB error leakage and escapes quote/formula payloads in CSV cells. | `partial` | Finish browser/e2e proof for scoped admin and super-curator export workflows. |
| P1 | Report API error contract | Download/preview/job rate-limits now return structured `too_many_requests` before generation/outbox enqueue; unsupported report format returns a Russian `bad_request`; report processor failed events no longer persist raw generation errors. | `partial` | Finish full observer/report ownership proof across browser/API workflows. |
| P1 | Lesson discussion mutations | Discussion post delete now validates `postId` through Zod and does not call the service on invalid payloads. | `partial` | Finish owner/non-owner/moderator delete proof in seeded browser/API workflows. |
| P1 | Notifications | Outbox/notification code and env contract exist; security events force DB persistence even when `persist: false` and preferences are disabled; notification detail missing-id now returns structured `not_found`; role settings forms now submit hidden `false` for notification checkboxes and the action merges duplicate channel fields by last value, so disabling a channel is persisted; notification preferences reject unknown channels/malformed values before writes; push subscribe/unsubscribe now has structured rate-limit, Zod unsubscribe validation and current-user endpoint scoping tests; cron endpoints fail closed without `CRON_SECRET`, return structured auth/config errors and avoid leaking raw processor errors in responses; notification failed events no longer persist raw exception messages. | `partial` | Finish delivery proof for SSE/push/email and explicit email opt-in on real notification events. |
| P2 | Seed temp route | `/api/seed-temp` is production-disabled/token protected in code but remains part of public middleware route prefixes. | `partial` | Keep local-only usage explicit and ensure production tests deny it. |
| P2 | CSP | Production CSP: nonce-based `script-src 'nonce-{uuid}' 'strict-dynamic'` (без `unsafe-inline`/`unsafe-eval`), `connect-src 'self' https:`. | `done` | Next.js получает nonce из request CSP header; `unsafe-inline` оставлен только в `style-src`. |
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
| Local bootstrap | `docker-compose.yml`, guarded DB scripts and local command attempts. | `partial` | Docker-based bootstrap scripts now run DB setup inside the app container and DB mutation/E2E scripts reject remote hosts by default. Docker is still unavailable on this audit machine, so the full compose run remains blocked here. |
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
| Disposable local scenario environment | `partial` | Guarded Docker bootstrap is documented and now blocks the current remote `.env` for seed and E2E; verify a full compose bootstrap when Docker is available. |
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
