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
- Follow-up required: instructor lesson/module scoping, curator student-relationship checks, observer real data, student settings server actions — all documented as separate PRs in audit report
- Status: green (all P0/P1 fixed, remaining issues documented in audit report)

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
| Customer observer privacy | yellow | Per-role Prisma queries in reports (PR-8); full scoping deferred to separate PR |
| Curator workflows | yellow | Notification awaits fixed; end-to-end tests and remaining scoping deferred |
| Student happy path | green | normalizeVideoUrl, askQuestion toast/try-catch/sending state (PR-7) |
| Instructor cross-scope CRUD | red | Any instructor can edit any lesson/module by ID — deferred to separate PR |
| Curator cross-student access | red | Can act on any student's question/submission/risk by ID — deferred |
| Observer hardcoded data | red | Dashboard shows hardcoded 42% — deferred |
| Student settings | red | No server actions for profile/password/notifications — deferred |

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
