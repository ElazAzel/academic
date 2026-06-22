# Project Updates

## 2026-06-22 — P1 State Coverage (empty/loading/error states)

**Goal**: Eliminate empty catch blocks, add empty/loading/error states to data components.

### Changes
- **🔴 Critical — empty catch blocks fixed**:
  - `course-outline.tsx`: 7 empty `catch {}` → toast.error (rename, add, delete module/block/lesson); added `EmptyState` when no modules
  - `lesson-block-editor.tsx`: SCORM package fetch `.catch(() => {})` → sets null state
  - `curriculum-editor.tsx`: `handleDeleteModule`/`handleDeleteLesson` — added try/catch with toast.error
- **🟡 Empty states added**:
  - `dashboard-widgets.tsx`: `MetricGrid`, `CourseProgressGrid`, `CourseManageGrid`, `CuratorLoadTable` — each shows `EmptyState` when data is empty
  - `curriculum-editor.tsx`: shows dashed border placeholder when no modules
- **🟡 Loading states added**:
  - `deadline-alerts.tsx`: loading skeleton while fetching, error card on failure
  - `xp-center-modal.tsx`: error state (AlertCircle) when gamification data fails to load
- **🟡 Error states added**:
  - `notifications-list.tsx`: error card with "Не удалось загрузить уведомления"
  - `notification-preferences-form.tsx`: error card when preferences fail to load

### Validation
- `npm run verify` — lint 0 warnings ✅, typecheck ✅, 936/936 tests ✅, build ✅

## 2026-06-22 — Auth Optimization + Track A Completion

**Goal**: Optimize auth flow for remote Supabase latency and close Track A (operational readiness).

### Changes
- **Auth JWT optimization**: JWT callback in `server/auth/options.ts` now uses `authorize()` return data instead of redundant `prisma.user.findUnique` on first login. Saves ~1.4s per login.
- **Device session transaction**: Changed `server/modules/auth/device-sessions.ts` transaction isolation from `Serializable` to `ReadCommitted` with 10s timeout, reducing latency on remote Supabase pooler.
- **Auth test sync**: Updated `tests/unit/auth-options.test.ts` to expect `requires2fa` field in authorize return value.
- **Zero-warning lint**: Removed unused `eslint-disable` directives from `components/instructor/quiz-edit-form.tsx` and `components/ui/card.tsx`.
- **Development plan updated**: Marked A1 (CI cleanup), A2 (CSP verification), A3 (E2E smoke for 6 roles), B4 (Onboarding flow) as complete.

### Verification
- `npm run verify`: 936/936 tests pass, zero warnings lint, typecheck clean, production build OK.
- Auth login time improved: 5004ms → 3601ms (−28%) on remote Supabase.
- Git history cleaned: squashed duplicate commits, reworded to reflect actual content.

---

## 2026-06-18 — DevSecOps Security Gate Completion

**Goal**: Finish the new repository security pipeline so it produces actionable results and can pass on the current codebase.

### Changes
- **Dependency remediation**: Upgraded Vitest to 4.1.9, refreshed compatible transitive dependencies, and pinned `tmp` to the patched 0.2.7 release for Lighthouse CI.
- **Gateway manifest remediation**: Upgraded the independently managed `services/gateway-bff` Vitest dependency and added its lockfile, closing the remaining critical Dependabot alert outside the root package graph.
- **Secret scanning baseline**: Added a narrow Gitleaks allowlist for the documented `invalid_token_here` test fixture without excluding security skill directories from scanning.
- **Release contract sync**: Added all 15 installed cybersecurity skills to the machine-readable `technicalSkills` contract.
- **GitHub security settings**: Enabled repository vulnerability alerts and Dependency Graph so `dependency-review-action` can run on pull requests.
- **Kubernetes hardening**: Added non-root pod identities, RuntimeDefault seccomp, dropped capabilities, disabled privilege escalation/service-account token mounts, read-only root filesystems and explicit writable runtime volumes for the web and PostgreSQL workloads.
- **E2E rate-limit isolation**: Made the global proxy limiter honor `RATE_LIMIT_MAX_REQUESTS`/`RATE_LIMIT_WINDOW_SECONDS` and raised only the CI limit, preventing the 252-test Playwright suite from exhausting one shared-IP bucket while preserving the production default.

### Verification
- `npm audit --audit-level=high` passes with no high or critical findings; 11 moderate transitive findings remain outside the blocking threshold.
- Gitleaks 8.24.3 reports `no leaks found` for the security commit after applying the scoped allowlist.
- Vitest 4 targeted release-hardening test passes: 9/9.
- `npm run verify` passes: banned patterns, security skill allowlist, ESLint with zero warnings, typecheck, 936/936 tests, production build and spec validation.
- Clean `npm ci` succeeds, and the previously blocked GitHub `Dependency review` job passes after enabling Dependency Graph.
- Trivy 0.70.0 reports zero high/critical Kubernetes misconfigurations across all 10 manifests in `infra/k8s`.
- `services/gateway-bff` clean `npm ci` and Vitest 4 startup pass; its independent npm audit reports zero vulnerabilities.
- GitHub E2E baseline reached 251/252 before the shared-IP limiter regression; the failing quiz API boundary is covered by the configurable CI limit fix.

---

## 2026-06-17 — GitHub Actions E2E Stability Fix

**Goal**: Keep CI on the local PostgreSQL service and clear the next blocking E2E failure after the database URL precedence fix.

### Changes
- **Playwright CI command**: `playwright.config.ts` now runs `npm run dev:next` in CI, avoiding the Windows-only PowerShell startup wrapper on Linux GitHub runners.
- **WCAG contrast**: Replaced low-contrast `text-emerald-600` status text/icons with `text-emerald-700` across UI surfaces covered by accessibility smoke tests.
- **E2E fixture compatibility**: Fixed the student-flow quiz fixture query to avoid a Prisma 7 runtime validation error from mixing `select` and `include` in one nested relation.

### Verification
- `npm run verify` passed: banned patterns, ESLint with `--max-warnings=0`, typecheck, 936 unit/integration tests, production build and spec validation.
- GitHub Actions confirmed local PostgreSQL `db:push`/`db:seed`, TypeScript, ESLint, unit/integration tests and accessibility smoke path; rerun pending for the student-flow fixture fix.

---

## 2026-06-17 — CI PostgreSQL URL Precedence Fix

**Goal**: Stop CI/deploy checks from accidentally connecting to a remote Supabase/PostgreSQL IPv6 endpoint when a local `DATABASE_URL` is explicitly provided.

### Changes
- **Prisma config precedence**: `prisma.config.ts` now prefers `DATABASE_URL` before `storage_POSTGRES_PRISMA_URL` and only uses non-pooling URLs as explicit migration overrides.
- **Runtime DB precedence**: `lib/prisma.ts` now prefers `DATABASE_URL` before `storage_POSTGRES_PRISMA_URL`, so CI/local overrides cannot be shadowed by storage aliases.
- **GitHub CI hardening**: `.github/workflows/ci.yml` now sets `DATABASE_URL`, `PRISMA_MIGRATION_DATABASE_URL`, `storage_POSTGRES_PRISMA_URL` and `storage_POSTGRES_URL_NON_POOLING` to the same local PostgreSQL service.

### Verification
- Precedence smoke passed: with local `DATABASE_URL` and remote storage alias present, Prisma config selects `localhost`.
- `npm run verify` passed with local PostgreSQL URL overrides for all DB aliases.
- Existing non-blocking warnings remain: legacy spec migration warnings, missing Sentry auth token and branding fallback logs when the local test database has no `app_settings` table during build-time metadata fallback.

---

## 2026-06-17 — Commercial and Tender Readiness Center

**Goal**: Make the platform easier to sell and evaluate for B2B academies, corporate training, quasi-government pilots and formal tender preparation without overstating production readiness.

### Changes
- **Admin Readiness Center**: Added `/admin/readiness` as an admin-only page with segment fit, buyer evidence pack, gov-readiness blockers and a tender roadmap.
- **Commercial Readiness Module**: Added `server/modules/commercial-readiness/service.ts` to keep B2B/government positioning data outside UI code and preserve the no-Prisma-in-pages rule.
- **Navigation**: Added "Готовность" to the admin sidebar so commercial/tender preparation is visible during demos and internal readiness reviews.
- **Tender Positioning**: Explicitly separates B2B pilot readiness from formal government production blockers: DPA, data residency, security evidence, operational drills, WCAG proof and legal/tender documentation.

### Verification
- `npm run verify` passed: banned patterns, ESLint with `--max-warnings=0`, typecheck, Vitest, production build and spec validation.
- Existing non-blocking warnings remain: legacy spec migration warnings and missing Sentry auth token for source map upload.

---

## 2026-06-17 — Integration of Strategic AI Repositories

**Goal**: Align the project with high-quality agentic workflows from `obra/superpower`, `ultraworkers/claw-code`, `anthtopics/skills`, `mattpocock/skills`, `github/spec-kit`, and `garretan/gstack`.

### Changes
- **Strategic Skills**: Refactored all skills in `skills/` to a strict, verifiable format inspired by Matt Pocock and Anthtopics. Added `Prerequisites`, `Context`, and `Post-conditions`.
- **Claw-code**: Integrated instructional hints ("Claws") into all `SKILL.md` files to guide agent logic.
- **Spec-Kit**: Implemented verifiable Markdown specifications. Added `docs/templates/SPEC_TEMPLATE.md` and `scripts/validate-specs.ts`. Refactored `visit-analytics-design.md` to the new standard.
- **GStack Architecture**: Established the "Golden Standard" multi-layered modular monolith in `docs/ARCHITECTURE_GUIDE.md`. Updated `docs/SKILL.md` and release hardening contracts to enforce this standard.
- **Superpowers Planning**: Enforced a stricter planning protocol in `AI.md` and `docs/PLANNING_PROTOCOL.md`, requiring `context`, `definitions`, and `constraints` for every task.
- **Automated Verification**: Integrated `npm run verify:specs` into the main `npm run verify` gate.

### Verification
- **Lint**: 0 warnings.
- **Typecheck**: Clean.
- **Specs**: `npm run verify:specs` passed for refactored documents.
- **Architecture**: No Prisma in UI (verified via `npm run verify`).

---
