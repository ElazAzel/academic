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
