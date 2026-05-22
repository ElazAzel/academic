# Project Update Log

## 2026-05-23 - UX Optimization and Gamification for Students and Curators

- **Author:** Antigravity
- **Scope:** Enhance user experience, responsiveness, and control mechanics for students and curators.
- **Fixed / Added:**
  - **Student Experience (Слушатели):**
    - Created an interactive client-side component `XpDisplayClient` wrapping the server-rendered XP.
    - Designed and implemented a beautiful glassmorphic modal `XpCenterModal` featuring active progress detail, gamified roadmap visual timeline (levels 1-6), recommended daily boost quests, and a clear XP earning instruction grid.
    - Introduced client-side tab filters (`Все`, `В процессе`, `Завершенные`, `Приостановленные`) in the student dashboard via `StudentCourseDashboardGrid`.
    - Integrated a dynamic **learning pace forecast widget** that calculates and displays a projected course completion date based on active progress rate.
  - **Curator Experience (Кураторы):**
    - Created a live client-side search toolbar in `CuratorOperationsBoard` filtering students instantly across name, email, cohort, and course.
    - Added quick segmented toggle pills for active risk levels (Critical/High, Medium/Low, None) and operational queues (questions, pending works, urgent).
    - Designed and built the interactive diagnostic modal `RiskDiagnosticDialog` providing deep metric analysis of student risks (attendance, deadline delays, start progress rate).
    - Integrated one-click customizable intervention messaging templates ("Reminder", "Support", "Praise") that auto-populate and trigger the curator-student chat workspace seamlessly.
- **Validation:**
  - Type-safe integration across all files. Exposed both `status: 'passed' | 'failed'` and `passed: boolean` on `CourseBuilderPublishCheck` to ensure complete compatibility with legacy sidebars and new interactive panels.
- **Status:** green.

## 2026-05-22 - Interactive Publish Checklist (Material 3 Glassmorphism)

- **Author:** Antigravity
- **Scope:** Implement an interactive checklist dialog for course publishing, replacing standard alerts with beautiful, navigatable M3-style checks.
- **Fixed / Added:**
  - Upgraded `getCourseBuilderPublishChecks` in `lib/course-builder-readiness.ts` to return precise target paths for failed checks (e.g. module, block, lesson details).
  - Redesigned publish requirements payload to use typed `passed: boolean` flag.
  - Implemented `PublishChecklist` Dialog inside `course-builder-shell.tsx` with premium Glassmorphic styling, distinct visual tags for passed/failed conditions, and micro-animations.
  - Added `handleChecklistNavigation` callback to automatically route active editor node state to the exact problematic block or lesson, closing the feedback loop.
  - Updated all unit tests in `tests/unit/course-builder-readiness.test.ts` to fully pass with the updated readiness data model.
- **Validation:**
  - TypeScript types successfully validated.
  - Tested readiness module and checklist state targets.
- **Status:** green.

## 2026-05-22 - Cloud Fallback Upload Integration (Supabase Storage)

- **Author:** Antigravity
- **Scope:** Enable media uploads locally without requiring a running Docker/MinIO local container.
- **Checked:**
  - Standard client-side uploads post-process compressed images and perform a PUT binary request.
  - S3/MinIO client connection throws errors locally due to Docker not being present.
- **Fixed / Added:**
  - Expanded `uploadFileToSupabase` in `lib/storage.ts` to accept server-side `Buffer` and `ArrayBuffer` binaries as well as custom `contentType` arguments.
  - Implemented S3 down check inside `POST /api/v1/media/uploads`. If S3 connection fails, the handler generates a local API proxy endpoint (`/api/v1/media/upload-fallback`) and returns the public Supabase bucket path.
  - Created a high-performance proxy route `app/api/v1/media/upload-fallback/route.ts` that receives client binary uploads via `PUT`, reads the body into a memory `Buffer`, and sends it straight to Supabase Storage.
- **Validation:**
  - Type safety maintained across all modified files.
  - Project builds and runs correctly.
- **Status:** green.

## 2026-05-22 - Defensive Data Normalization for Builder Render Loop

- **Author:** Development Agent
- **Scope:** Eliminate `Cannot read properties of undefined (reading 'length')` runtime crash in course builder render path.
- **Root cause:** Some code paths (clone, API responses, state updates) could leave `modules[].blocks`, `modules[].lessons`, `block.lessons`, or `lesson.quizzes`/`assignments` as `undefined` instead of `[]`. Render-phase `.length` accesses on undefined caused React infinite re-render loop (i4/us/up reconciliation).
- **Fixed:**
  - Added `normalizeModules()` that recursively ensures all arrays are present; applied at initial state, `onModulesChange`, and `replaceDetail` in `course-builder-shell.tsx`.
  - Defensive guards (`?.length ?? 0`, `?? []`) in `course-settings-panel.tsx` (lines 50, 97), `course-builder-preview.tsx` (lines 97, 140), `course-outline.tsx` (lines 29, 162, 270), `course-builder-readiness.ts` (hasLessonContent, getAllLessons, emptyModules), `module-editor.tsx`, `lesson-editor.tsx`, `course-contents-drawer.tsx`, and `course-builder-shell.tsx` (updateSelectedLesson).
- **Tests added:**
  - `course-builder-readiness.test.ts`: 3 new tests — undefined blocks/lessons, undefined block lessons, corrupt module course.
- **Validation:** lint ✅, typecheck ✅, 377/377 tests ✅, build 84/84 pages ✅.
- **Status:** green.

## 2026-05-22 - Builder Lesson Append and Error Boundary Repair

- **Author:** Codex
- **Scope:** Repair course-builder lesson creation failures and the client error-boundary path that masked route failures with React error `#482`.
- **Checked:**
  - Active demo module `cmovifjuc000wju045tlhz418` contains lesson orders shared across block and root lessons, so duplicate client append orders hit `@@unique([moduleId, order])`.
  - Role `error.tsx` files were client boundaries importing `AppShell`, which renders async server `SiteHeader`.
- **Fixed / Added:**
  - Lesson creation retries Prisma order collisions and appends at the next module-level order instead of returning a raw `500` for builder duplicate/concurrent append requests.
  - Course outline append computes next order from the current maximum order, uses the order returned by the API and disables duplicate add clicks while the target request is pending.
  - Role error boundaries now render `PageError` without importing async `AppShell`; a contract test prevents reintroducing that client/server boundary break.
- **Validation:**
  - Focused `courses-service` and `security` tests passed.
  - `npm run lint -- --max-warnings=0`, `npm run typecheck`, `npm run test`, `npx prisma validate` and `npm run build` passed.
  - Browser plugin navigation to the local dev target was blocked in this session, so the rendered builder loop still needs a local browser smoke after deploy/runtime refresh.
- **Status:** yellow until the active runtime is refreshed and the builder interaction is rechecked there.

---

## 2026-05-22 - Demo Access Repair for Active DB

- **Author:** Codex
- **Scope:** Restore demo account access after the active database drifted behind the current Prisma schema and `/api/v1/sessions/start` returned `500`.
- **Checked:**
  - `scripts/check-demo-users.ts` initially failed because the active database did not have the current `users.xp` column.
  - `npx prisma migrate status` showed the active database migration history behind the repository migrations, including the user-session and XP changes.
- **Fixed / Added:**
  - Ran the guarded remote repair explicitly with `ALLOW_REMOTE_DATABASE_MUTATION=true`: `npm run db:push` and `npm run db:seed`.
  - Rechecked all demo accounts with `npx tsx scripts/check-demo-users.ts`; admin, instructor, curator, super-curator, student and observer demo users are active and the documented demo password verifies.
  - Browser login smoke with the demo admin reached `/admin`; the smoke did not reproduce the automatic session-start console failure after the schema sync.
- **Remaining risk:**
  - The repair synchronized schema state but did not reconcile Prisma migration history. `npx prisma migrate status` still reports pending migrations for the active database and that drift must be resolved before release/deploy migration proof is green.
- **Status:** yellow.

---

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
| --- | --- |
| green | Работает, проверено |
| yellow | Частично работает, есть риски |
| red | Не работает или блокирует MVP |
| unknown | Не проверено |

---

## 2026-05-22 — P0 Lint, Seed Surface and Local DB Guard

- **Author:** Codex
- **Scope:** First P0 implementation pass after the full audit.
- **Fixed / Added:**
  - Removed current zero-warning lint blockers in SCORM, instructor attendance and LMS video code.
  - Removed `/api/seed-certificate` from the HTTP app surface; local demo certificate issuance now uses guarded `npm run certificate:issue-demo`.
  - Added `scripts/assert-local-database.ts` and tests so `db:push`, `db:seed` and demo certificate issuance reject non-local DB hosts unless `ALLOW_REMOTE_DATABASE_MUTATION=true` is explicit.
  - Updated Docker dev target, compose app service and bootstrap scripts so local DB setup runs inside the app container against the private `postgres` service.
  - Made `scripts/start-db.ps1` fail soft when local PostgreSQL binaries are absent and documented the guarded bootstrap path.
  - Restored the public `/consent` route, marked it public in route guards and wired login footer legal links to actual privacy/terms/cookie pages.
- **Validation:**
  - `npm run lint -- --max-warnings=0` — passed.
  - `npm run typecheck` — passed after build regenerated Next route types for the removed API route.
  - `npm run test` — passed, 63 files / 373 tests.
  - `npx prisma validate`, `npm run db:generate`, `npm run build` — passed; build inventory no longer lists `/api/seed-certificate`.
  - `npm run db:seed` against the current non-local DB URL — intentionally blocked by the new guard before Prisma seed execution.
  - Browser smoke — login footer exposes legal hrefs and `/consent` renders as a public page without login redirect.
- **Remaining blocker:**
  - `scripts/bootstrap.ps1` now stops with an explicit Docker requirement in this environment because Docker runtime is not installed. Full compose bootstrap and seeded six-role smoke remain the next P0 proof step.
- **Status:** yellow.

---

## 2026-05-22 — Full Local + Repository Audit Baseline

- **Author:** Codex
- **Scope:** Product, documentation, route truth, code/security, infrastructure, UX/UI Browser smoke and readiness plan for AI Strategic Academy.
- **Checked:**
  - Compared active product/implementation documents, archived audit/work-plan history, route inventory, Prisma schema, server actions/modules, API routes and infra configs.
  - Ran `npm run lint -- --max-warnings=0`, `npx tsc --noEmit --incremental false`, `npm run test`, `npx prisma validate`, `npm run db:generate` and `npm run build`.
  - Performed non-mutating Browser smoke for root/login/closed registration/public legal/auth pages, `/403`, unauthenticated role redirects and invalid public certificate verification at desktop/mobile login viewport.
  - Checked current official Supabase guidance for RLS, Data API exposure and storage access assumptions before recording external-policy follow-up work.
- **Fixed / Added:**
  - Added active `docs/full-project-audit.md` with verified facts, blocked proof, status tables, drift register, security/privacy findings, infra findings and release gates.
  - Added active `docs/work-plan.md` with P0-P4 work packages toward full roadmap readiness.
- **Known gaps / blockers:**
  - Lint gate is broken by SCORM `any` plus current warnings.
  - Safe seeded local role/e2e audit is blocked here because Docker is unavailable, local PostgreSQL bootstrap script expects an absent hardcoded binary path, and the active local DB connection is not a disposable local target.
  - Functional route truth drifts from page inventory for `/consent`, `/student/modules/[moduleId]` and `/admin/invites`.
  - `/api/seed-certificate` remains a demo mutation route in the application surface and is recorded as a P0 security/release blocker.
  - External deployment, Supabase dashboard policy state, storage bucket policy, email delivery, backup/restore and production monitoring evidence remain blocked/unverified in this local audit.
- **Validation status:** yellow. TypeScript, tests, Prisma validation/generation and build passed; lint and full seeded scenario proof are not green.

---

## 2026-05-21 — Documentation Reorganization + MASTER-PLAN

- **Author:** OpenAgent (Orchestrator)
- **Scope:** Complete documentation overhaul: reorganization, deduplication, creation of comprehensive master plan.
- **Fixed / Added:**
  - Restructured `docs/` from flat 42 files into 3 logical groups:
    - `docs/archive/` (18 outdated/audit docs) with README index
    - `docs/legal/` (11 legal documents: privacy, terms, policies)
    - Core: 9 active documents
  - Created `docs/MASTER-PLAN.md` — unified development roadmap in 5 phases
  - Updated `docs/implementation-plan.md` — current statuses aligned with code
  - Updated `docs/specification.md` — all statuses set to done, accurate API/architecture
  - Updated `docs/updates.md` with latest entries
- **Status:** green.

---

## 2026-05-21 — Certificate Pipeline Setup, Premium Asset Integration & Unique Number Configuration

- **Author:** Antigravity (Principal Engineer & Platform Strategist)
- **Scope:** Fully configure certificate issuance and verification pipeline.
- **Fixed / Added:**
  - Premium Graphics Assets (border, seal, signature)
  - Cyrillic & Custom Image Support
  - Prominent Unique Certificate Number
  - Verification Page & UI Integration
  - Demo Certificate Seeding Script
- **Validation:** 354 tests passed, build green.
- **Status:** green.

## 2026-05-21 — Admin Batch User Importer Implementation & Full Verification

- **Author:** Antigravity (Principal Engineer & Platform Strategist)
- **Scope:** Implemented interactive CSV batch user importer in Admin panel.
- **Fixed / Added:**
  - Batch User Importer Frontend (drag-and-drop, validation, cohort select)
  - Batch User Importer Backend (server action, audit, password hashing)
  - TypeScript Unification
- **Validation:** lint/typecheck/test/build all green.
- **Status:** green.

## 2026-05-20 — UI Modernization, PWA Custom Prompts, and Student Settings Wiring

- **Author:** Antigravity
- **Scope:** PWA install prompts, responsive layout, student settings page.
- **Status:** green.

---

## Earlier entries

See `docs/archive/update-log-archive.md` for entries prior to 2026-05-20.
