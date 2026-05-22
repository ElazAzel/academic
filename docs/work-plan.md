# Work Plan: Full Readiness for AI Strategic Academy

Date: 2026-05-22  
Input: `docs/full-project-audit.md` local+repo audit.  
Target: full roadmap readiness with release blockers isolated from later strategic expansion.

## Goal

Bring AI Strategic Academy to a state where the closed academy workflow is proven end to end:

- one student journey inside course, module, block and lesson context;
- strict role and data boundaries for all six roles;
- working authoring, learning, support, assessment, progress, reporting, notification and certificate flows;
- reliable local/CI/deploy/rollback/backup evidence;
- honest active documentation that matches code and tests.

`done` means UI, backend, access control, data updates, error/empty/unauthorized states, smoke/test evidence and updated docs all exist for the package.

## Priorities

| Priority | Meaning |
|---|---|
| P0 | Release or security blocker. Do first. |
| P1 | Core product completion required before platform readiness can be claimed. |
| P2 | UX/UI and visual quality required for a coherent academic product. |
| P3 | Infrastructure and operations hardening. |
| P4 | Strategic roadmap after core readiness is stable. |

## Phase Plan

| Phase | Objective | Exit condition |
|---|---|---|
| 1. Blockers | Fix release/security/core-flow proof blockers. | Quality gates green, demo mutation HTTP surface removed, disposable local scenario run works. |
| 2. Product completion | Close route/workflow/access/documentation gaps in core domains. | Required role scenarios pass with negative access coverage. |
| 3. UX/UI polish | Make the Russian-first course and operations UX coherent on desktop/mobile. | Student flow stays unified and role queues are efficient and visually consistent. |
| 4. Operations | Prove deployment, monitoring, backups, cron, secrets and rollback. | Staging/target-env readiness checklist has evidence. |
| 5. Strategic roadmap | Add advanced capabilities after truth and operations are stable. | Roadmap work does not reopen P0-P3 gates. |

## P0: Release and Security Blockers

| Package | Scope | Acceptance criteria | Tests/evidence | Ownership boundary |
|---|---|---|---|---|
| P0-01 Restore zero-warning lint | Remove SCORM explicit `any` and current lint warnings. | `npm run lint -- --max-warnings=0` passes without suppressing real type/safety issues. | Lint, typecheck, focused tests for touched SCORM/attendance/video paths. | Code quality only; avoid unrelated refactor. |
| P0-02 Remove demo certificate mutation route | Remove or hard-localize `/api/seed-certificate`. | No release HTTP route can issue demo enrollment/progress/certificates from a guessed URL plus secret. Demo seed path is a local seed command if still needed. | Build route inventory, route tests, seed docs. | Route/API surface change; no production data migration unless seed scripts are reorganized. |
| P0-03 Safe local scenario bootstrap | Make a disposable local DB/bootstrap path work without relying on external `.env` DB. | One documented command path starts dependencies, applies Prisma state and seeds demo users/data safely. Guard refuses accidental destructive seed against non-local DB unless explicitly approved by design. | Local bootstrap transcript, seed/e2e smoke. | Infra/scripts/env contract. |
| P0-04 Six-role smoke gate | Run required Browser/e2e scenarios after local bootstrap works. | Public pages, role redirects/403, all six cabinets and required flow checkpoints are recorded with pass/fail and screenshots/DOM evidence where useful. | `npm run test:e2e` or exact focused Playwright suite plus Browser notes. | Verification package; fix defects as separate work packages. |
| P0-05 Security negative-path matrix | Prove RBAC and guessed-ID denial for required flows. | Student/curator/instructor/observer cannot cross scope; media, certificates, reports/exports, quiz and assignment guessed IDs are denied. | Unit/integration/e2e tests with seeded users and explicit negative assertions. | Server guard/service/action boundaries. |

## P1: Core Product Completion

| Package | Scope | Acceptance criteria | Tests/evidence | Notes |
|---|---|---|---|---|
| P1-01 Route truth decisions | Resolve `/consent`, `/student/modules/[moduleId]`, `/admin/invites` and extra compatibility pages. | Every active product route is either implemented, redirected compatibly, or documented as removed/deferred with reason. | Route inventory test and doc update. | Route/API contract package; keep public access list aligned with middleware. |
| P1-02 Course builder readiness | Unified course builder, publish readiness, module/block/lesson authoring, content/quiz/assignment embedding. | Instructor/admin can create course, structure curriculum, attach assessments/materials, preview readiness and publish with clear blockers. | Builder integration tests and Browser authoring smoke. | Use existing modular-monolith services and compatibility routes. |
| P1-03 Student journey | Dashboard continue-learning, course page, lesson player, content/materials, embedded quiz/assignment/question/rating/completion. | Student learns without leaving course context; sequential/open traversal, required/optional completion and progress/certificate state are coherent. | Seeded end-to-end student scenario and progress calculation tests. | Keep aggregator quiz/assignment pages secondary. |
| P1-04 Assessment workflow | Quiz attempts/results/history and assignment submission/review/revision. | Student can take quiz and submit assignment from lesson; curator/reviewer returns statuses and feedback; attempt/revision limits are visible. | Assessment service tests, Browser role smoke. | Validate all mutation input with Zod/typed DTOs. |
| P1-05 Curator support | Lesson question -> curator answer/forward -> instructor answer -> student visibility, risks and resolution. | Queues, notifications, assignment review and risk actions work inside role scope. | Curator/instructor/student scenario suite. | Verify curator-student assignment inside cohort. |
| P1-06 Super-curator operations | Distribution, workload, cohort risks, questions, reports. | Super-curator can manage operational scope without admin mutation power. | Scope tests and Browser smoke. | Explicitly separate admin-only actions. |
| P1-07 Observer transparency | Dashboard, reports, certificates and permitted exports. | Observer sees only allowed projects/cohorts/certificates/reports and cannot mutate learning data. | Observer read-only and export-scope tests. | Preserve no-global-fallback scope behavior. |
| P1-08 Certificates | Issue, download, verify, revoke and role visibility. | Certificate links student/course/enrollment where available; public verify is privacy-safe; revoked state is obvious. | Owner/non-owner/PDF/public verify tests. | Remove demo-only issuance paths. |
| P1-09 Notifications and audit | In-app default, explicit email channel, operational events and audit trail. | Default events never email accidentally; meaningful email only fires for explicit email channel; sensitive mutations have audit evidence. | Notification/audit tests and outbox smoke. | Include password/security events. |
| P1-10 Files and media privacy | Uploads, materials, signed URLs, lesson locks and storage policy. | Upload/download/media playback respect role, enrollment and lesson availability. | Signed URL/storage negative tests and storage-policy checklist. | S3/MinIO/Supabase deployment choice must be documented. |

## P2: UX/UI and Visual Completion

| Package | Scope | Acceptance criteria | Evidence |
|---|---|---|---|
| P2-01 Public/auth UX cleanup | Wire login legal links, consent decision, auth error/empty/success states, Russian copy. | Public entry feels intentional and legal/auth paths are navigable. | Desktop/mobile Browser smoke. |
| P2-02 Student course UX | Course card, progress, certificate state, module/block/lesson structure, lock states, next CTA, contents drawer. | Every student screen answers the next action and keeps learning context unified. | UX walkthrough screenshots and student scenario. |
| P2-03 Lesson player polish | Video/text/files, embedded assessment/support/rating/completion, prev/next and error states. | Lesson content and actions do not overlap or fragment on desktop/mobile. | Browser screenshots and responsive checks. |
| P2-04 Builder polish | Tree/editor/preview/publish flows, clear empty/error/readiness states. | Course authoring is fast and consistent without hidden critical actions. | Instructor UX walkthrough. |
| P2-05 Operational workspaces | Role dashboards, queues, tables, filters, badges and empty states for admin/curator/super-curator/instructor/observer. | Work surfaces are calm, dense enough for operations and scoped to role. | Role-specific UX review. |
| P2-06 Visual/accessibility pass | Typography, icon semantics, focus order, keyboard paths, status contrast, loading/error states. | No decorative clutter, no inaccessible action labels, no clipped text on tested breakpoints. | Accessibility lint/manual keyboard smoke. |

## P3: Infrastructure and Operations Hardening

| Package | Scope | Acceptance criteria | Evidence |
|---|---|---|---|
| P3-01 Env and secret contract | DB, Auth, storage, SMTP, push, Redis, Sentry, cron, seed guards. | `.env.example`, validation and runbooks explain required/optional envs and safe local defaults. | Config tests and docs. |
| P3-02 CI parity | Align local and CI checks. | CI runs the same release gates and fails on lint/type/test/build/e2e regressions. | Workflow run evidence. |
| P3-03 Deploy verification | Vercel/Kubernetes target truth, migrations, health/readiness, rollbacks. | One target-env deploy checklist has repeatable verification and rollback steps. | Deployment transcript/runbook. |
| P3-04 Observability | Logs, Sentry sourcemaps/errors, audit visibility, cron/outbox monitoring. | Operators can see failures for auth, media, notifications, reports and jobs. | Alert/dashboard/log examples. |
| P3-05 Backup and restore | Database/media backup, restore drill, retention and owner. | Restore evidence exists with date, target, verification and known limits. | Runbook plus drill record. |
| P3-06 Supabase exposure review | RLS, grants, Data API schemas, storage policies, breaking-change assumptions. | Production project policy inventory is recorded and private tables/files are not exposed accidentally. | SQL/dashboard evidence and docs. |

## P4: Strategic Roadmap

These packages are valuable only after P0-P3 gates are stable.

| Package | Direction | Guardrail |
|---|---|---|
| P4-01 Advanced analytics | Cohort comparisons, intervention outcomes, trend reporting. | Do not replace operational queues with decorative BI. |
| P4-02 Rich content/runtime expansion | Advanced SCORM/media/live-session capabilities if academy needs them. | Keep lesson completion and access rules deterministic. |
| P4-03 Communication expansion | Optional chat/forum/automation improvements. | Curator question flow remains the primary support path until proven. |
| P4-04 Integrations | External CRM/reporting/certificate/storage integrations. | Add only with explicit scope, audit and data-protection contract. |
| P4-05 Service extraction | Extract domains from modular monolith only when ownership/scaling evidence requires it. | Requires ADR, contracts and migration plan. |

## Contract-Changing Work Packages

Any route, API, schema or type-contract change starts here before implementation.

| Candidate | Contract impact | Migration note | Testing note |
|---|---|---|---|
| `/consent` route decision | Public route list and legal UX. | No DB migration unless consent persistence is required. | Middleware/public-route and Browser smoke. |
| `/student/modules/[moduleId]` compatibility | Student route compatibility and redirects. | No schema change expected. | Deep-link/back-navigation smoke. |
| `/admin/invites` route ownership | Admin invite workflow and route map. | Reuse existing invite data if present; do not invent migration before inventory. | Admin scope and invite access tests. |
| Seed certificate removal | HTTP route inventory and local seed contract. | Move demo mutation to script if still needed. | Build route inventory and seed regression test. |
| Builder route/service validation | Mutation DTOs/permissions/audit trail. | Avoid schema change until missing persisted state is proven. | Route/action/service access tests. |
| Media/storage policy hardening | Signed URL TTL and storage provider contract. | Provider-specific policy migration may be needed. | Owner/non-owner/locked lesson media tests. |

## Verification Checklist

Run after each meaningful package where applicable:

```sh
npm run lint -- --max-warnings=0
npm run typecheck
npm run test
npx prisma validate
npm run db:generate
npm run build
```

Run when local scenario environment is available and the package changes flows:

```sh
npm run db:push
npm run db:seed
npm run test:e2e
npx playwright test
```

If a command is blocked, record the exact blocker and do not mark the package `done`.

## Recommended Start Order

1. P0-01 restore lint.
2. P0-02 remove the demo certificate HTTP mutation path.
3. P0-03 make local disposable bootstrap safe and repeatable.
4. P0-04 and P0-05 run the six-role smoke and negative-path matrix.
5. Convert defects from that evidence into P1 route/product/security packages.

## Progress Log

| Date | Update | Status |
|---|---|---|
| 2026-05-22 | New active work plan created from local+repo audit. | `partial` |
