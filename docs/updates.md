# Project Updates

## 2026-06-18 — DevSecOps Security Gate Completion

**Goal**: Finish the new repository security pipeline so it produces actionable results and can pass on the current codebase.

### Changes
- **Dependency remediation**: Upgraded Vitest to 4.1.9, refreshed compatible transitive dependencies, and pinned `tmp` to the patched 0.2.7 release for Lighthouse CI.
- **Gateway manifest remediation**: Upgraded the independently managed `services/gateway-bff` Vitest dependency and added its lockfile, closing the remaining critical Dependabot alert outside the root package graph.
- **Secret scanning baseline**: Added a narrow Gitleaks allowlist for the documented `invalid_token_here` test fixture without excluding security skill directories from scanning.
- **Release contract sync**: Added all 15 installed cybersecurity skills to the machine-readable `technicalSkills` contract.
- **GitHub security settings**: Enabled repository vulnerability alerts and Dependency Graph so `dependency-review-action` can run on pull requests.
- **Kubernetes hardening**: Added non-root pod identities, RuntimeDefault seccomp, dropped capabilities, disabled privilege escalation/service-account token mounts, read-only root filesystems and explicit writable runtime volumes for the web and PostgreSQL workloads.

### Verification
- `npm audit --audit-level=high` passes with no high or critical findings; 11 moderate transitive findings remain outside the blocking threshold.
- Gitleaks 8.24.3 reports `no leaks found` for the security commit after applying the scoped allowlist.
- Vitest 4 targeted release-hardening test passes: 9/9.
- `npm run verify` passes: banned patterns, security skill allowlist, ESLint with zero warnings, typecheck, 936/936 tests, production build and spec validation.
- Clean `npm ci` succeeds, and the previously blocked GitHub `Dependency review` job passes after enabling Dependency Graph.
- Trivy 0.70.0 reports zero high/critical Kubernetes misconfigurations across all 10 manifests in `infra/k8s`.
- `services/gateway-bff` clean `npm ci` and Vitest 4 startup pass; its independent npm audit reports zero vulnerabilities.

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
