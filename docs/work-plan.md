# Work Plan — AI Strategic Academy LMS

**Date:** 2026-05-16
**Status:** Legacy stabilization PR-1 through PR-12 complete; 90-day modernization execution started

---

## 90-Day Modernization Execution

| PR | Priority | Title | Status | Acceptance Criteria |
|---|---|---|---|---|
| M-PR-01 | P0 | Production Scope & Privacy Gate | green | Customer observer has no global certificate/report/dashboard fallback; admin keeps global access; student sees own data |
| M-PR-02 | P0 | Release Verification Gate | green | `npm run verify:release` and `docs/release-verification.md` cover lint, typecheck, tests, build, Prisma validate/generate, Playwright role smoke |
| M-PR-03 | P1 | Documentation Reconciliation | pending | `full-project-audit`, `work-plan`, `update-log` match current code and open risks |
| M-PR-04 | P1 | Student Learning Flow Polish | pending | Main learning flow stays inside course/lesson context |
| M-PR-05 | P1 | Curator Operations v1 | pending | Curator sees next actions across assigned students, questions, assignments, risks, and chat |
| M-PR-06 | P1 | Super Curator Operations v1 | pending | Super curator manages workload and distribution within scope |
| M-PR-07 | P2 | Course Builder Modernization | pending | Course can be built and published from unified builder |
| M-PR-08 | P2 | Reports & Analytics v1 | pending | Role-scoped reports support progress, risks, assignments, certificates, workload |
| M-PR-09 | P2 | Notification & Audit Completion | pending | Core events create expected in-app notifications and audit records |
| M-PR-10 | P3 | Schema Cleanup Window | pending | String statuses migrated to enums with backup/downtime runbook |
| M-PR-11 | P3 | Performance & Scale Pass | pending | Heavy dashboards/reports/chats have bounded queries and indexes |
| M-PR-12 | P3 | Production Readiness Release | pending | Release candidate has full verification and rollback plan |

---

## Priority System

| Priority | Meaning |
|---|---|
| P0 | Blocks build / security / core access |
| P1 | Blocks MVP user flow |
| P2 | Important for beta |
| P3 | Improvement |
| P4 | Later roadmap |

---

## Roadmap by PR

| PR | Priority | Title | Scope | Key Files | Acceptance Criteria |
|---|---|---|---|---|---|
| PR-1 | P0 | Critical Security Fixes | seed-temp auth, OAuth status, XSS, reviewSubmission scope, rate limit | `app/api/seed-temp`, `server/auth/options`, `components/lms/*-block`, `server/modules/assignments/service`, `app/api/v1/auth/reset-password` | All security vulnerabilities closed; lint/typecheck/test/build pass |
| PR-2 | P0 | Database Schema & Migrations | Observer scope models, notification prefs, lesson rating, comprehensive migration | `prisma/schema.prisma`, `prisma/migrations/20260513000000_complete_schema` | Prisma generate succeeds; all missing tables in migration; build passes |
| PR-3 | P1 | Backend Consolidation | Merge course-builder/courses duplication, Zod validation, scope listEnrollments/listAssignments, fix enrollment status check | `server/modules/courses/service.ts`, `server/modules/course-builder/service.ts`, API routes | No duplication; Zod on all write routes; scoped queries; build/test pass |
| PR-4 | P1 | UI/UX Polish | Fix broken links, wire settings, add pagination | `app/instructor/courses/page.tsx`, settings pages, `app/admin/audit/page.tsx` | All instructor buttons functional; settings save works; audit paginated |
| PR-5 | P2 | Navigation Cleanup | Redirects from old routes to builder, sidebar update | `app/instructor/courses/[id]/curriculum`, `components/layout/navigation.ts` | Old routes redirect; sidebar points to builder; no 404s |
| PR-6 | P2 | E2E Tests | Playwright smoke tests for roles, scope boundaries, student happy path | `tests/e2e/*.spec.ts` | All 6 roles login smoke; scope boundary tests; happy path green |
| PR-7 | P1 | Observer Scope Wiring | Wire ObserverProject/ObserverCohort scope into reports, dashboards, certificates | `server/modules/observer/scope.ts`, `app/api/v1/reports`, `server/actions/dashboard.ts` | Observers see only explicitly scoped data; observers without scope see no private data |
| PR-8 | P2 | Notification Preferences | Wire NotificationPreference model to all 5 settings pages | `server/modules/notifications/preferences.ts`, `server/actions/settings.ts`, settings pages | All settings pages save/load notification prefs; lint/typecheck/test/build pass |
| PR-9 | P2 | Lesson Rating API | POST `/api/v1/lessons/[id]/rating` endpoint, wire to existing component | `app/api/v1/lessons/[lessonId]/rating/route.ts`, `components/lms/lesson-rating.tsx` | Rating component now works; POST creates/updates LessonRating; lint/typecheck/test/build pass |
| PR-10 | P2 | Upload Hardening | Content-type allowlist, max file size validation | `app/api/v1/media/uploads/route.ts` | Allowlist: jpeg, png, gif, webp, pdf, mp4, webm, mpeg, zip (100MB max); lint/typecheck/test/build pass |
| PR-11 | P2 | Certificate PDF Access Check | Add instructor access validation | `app/api/v1/certificates/[certificateId]/pdf/route.ts` | Now checks owner/instructor/admin; lint/typecheck/test/build pass |
| PR-12 | P2 | Admin Settings Wiring | Wire AppSetting to feature flags, SMTP, certificates tabs | `server/modules/admin/settings.ts`, `app/admin/settings/page.tsx` | All admin tabs save/load settings; lint/typecheck/test/build pass |

---

## 7-Day Stabilization Plan

| Day | Task |
|---|---|
| Day 1 | PR-3: Backend consolidation + Zod validation |
| Day 2 | PR-4: UI/UX polish (settings, buttons, pagination) |
| Day 3 | PR-5: Navigation cleanup + redirects |
| Day 4 | PR-6: E2E tests (smoke + scope) |
| Day 5 | Bug fixes from E2E findings |
| Day 6 | Observer scope wiring (service + API) |
| Day 7 | Final validation: lint, typecheck, test, build, manual smoke |

---

## 30-Day MVP Plan

| Week | Focus |
|---|---|
| Week 1 | PR-3 + PR-4 + PR-5 + PR-6 (stabilization) |
| Week 2 | Observer scope wiring + notification preferences service |
| Week 3 | Lesson rating feature + admin settings wiring |
| Week 4 | Performance optimization + caching + final E2E suite |

---

## Later Roadmap (post-MVP)

| Feature | Priority |
|---|---|
| Enum migration (UserAccountStatus, QuestionStatus) | P3 |
| Real-time notifications (WebSocket/SSE) | P3 |
| Advanced analytics dashboard | P4 |
| SCORM/xAPI import | P4 |
| Mobile app (PWA) | P4 |
| AI recommendations | P4 |
| Forum / discussion | P4 |

---

## Do Not Do Yet

- ❌ Full UI redesign / cosmetic changes
- ❌ New stack or framework
- ❌ Forum, AI, PWA, gamification, chat
- ❌ Schema migration for enum drift (too breaking for now)
- ❌ Stripe billing reactivation
- ❌ Advanced video hosting/subtitles
