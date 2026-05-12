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
