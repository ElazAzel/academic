# Полный аудит платформы — AI Strategic Academy

**Дата:** 2026-05-17
**Статус:** актуализировано после legacy PR-1..PR-12 и M-PR-01..M-PR-05
**Область:** продуктовые сценарии, роли, маршруты, backend/API, доступ, безопасность, тесты, схема, документация

---

## 1. Executive Summary

| Критерий | Текущее состояние |
|---|---|
| Product scope | Закрытая академическая платформа, не marketplace и не публичный каталог |
| Auth/access | Закрытый вход, self-registration отключён, role redirect работает |
| Observer privacy | Green: observer видит только явно scoped project/cohort data; без scope приватные данные не возвращаются |
| Certificates | Green: student видит свои, admin видит все, observer видит scoped, bulk download scoped, PDF owner/instructor/admin |
| Notifications | Green базовый контракт: default `in_app`, email только при `email` / `email_and_in_app`; preferences service подключён |
| Chat | Green для текущего MVP: участники scoped, куратор отвечает закреплённому слушателю, имена отображаются по роли |
| Release gate | Green: `npm run verify:release` и `docs/release-verification.md` зафиксированы |
| E2E | Yellow: Playwright smoke готов, но полный release-run требует подготовленную БД и demo seed |
| Schema cleanup | Deferred: enum migration (`UserAccountStatus`, `QuestionStatus`) вынесена в M-PR-10 |
| MVP UX | Green/yellow: M-PR-04 удерживает dashboard/course/lesson/quiz/assignment/question/rating в lesson context; остаётся расширить browser smoke |

**Итог:** старые P0/P1 по production privacy и базовым access-control закрыты. Текущий фокус больше не “починить утечки”, а довести production MVP: release verification, единый student learning flow, curator/super-curator operations, reports/analytics, notification/audit completion, затем schema/performance hardening.

---

## 2. Закрытые Риски, Которые Больше Не Считать Открытыми

| Ранее открытый риск | Текущий статус | Источник |
|---|---|---|
| Observer видел глобальные certificates/reports/dashboard | Закрыто | `server/modules/observer/scope.ts`, `app/api/v1/reports/route.ts`, `app/api/v1/certificates/*`, `server/actions/dashboard/observer.ts` |
| Observer без scope получал global fallback | Закрыто: пустой scope возвращает пустые приватные наборы | `getObserverScope`, `getScopedStudentIdsForObserver` |
| Bulk certificates раскрывал чужие ids | Закрыто: observer bulk фильтруется по scoped student ids | `app/api/v1/certificates/bulk/route.ts` |
| Certificate PDF без полной проверки доступа | Закрыто: owner/admin/instructor-of-course | `app/api/v1/certificates/[certificateId]/pdf/route.ts` |
| Certificate revoke отсутствовал | Закрыто: DELETE endpoint + audit + already-revoked guard | `app/api/v1/certificates/[certificateId]/route.ts`, `server/modules/certificates/service.ts` |
| Enrollment pause/resume отсутствовали | Закрыто: server actions ACTIVE ↔ PAUSED с transition guards | `server/actions/admin.ts` |
| NotificationPreference был только моделью | Закрыто: service/actions/API/settings pages подключены | `server/modules/notifications/preferences.ts`, `server/actions/settings.ts`, `app/api/v1/notification-preferences/route.ts` |
| LessonRating был только UI-компонентом | Закрыто: POST rating route есть | `app/api/v1/lessons/[lessonId]/rating/route.ts` |
| Upload MIME был не ограничен | Закрыто: allowlist + max size | `app/api/v1/media/uploads/route.ts`, `lib/constants.ts` |
| Admin settings были декоративными | Закрыто: AppSetting service/actions/settings UI подключены | `server/modules/admin/settings.ts`, `server/actions/settings.ts`, `app/admin/settings/page.tsx` |
| Chat показывал странные номера и ломал curator reply | Закрыто: role-based display names, scoped receiver, lesson context | `server/actions/chat.ts`, `app/curator/chat/chat-list.tsx` |
| Service worker мог кешировать приватные кабинеты и отдавать `503` на navigation fallback | Закрыто в M-PR-03: приватные navigation pages больше не кешируются; offline fallback возвращает offline UI | `public/sw.js` |

---

## 3. Текущее Состояние По Ролям

| Роль | Статус | Что работает | Что дальше |
|---|---|---|---|
| Admin | Green | users, roles, courses, cohorts, enrollments, invites, audit, settings, certificates issue/revoke | Reports/analytics v1 и release runbooks |
| Instructor | Green/yellow | own courses, builder direction, quiz/assignment CRUD scoped, analytics, forwarded questions scoped | Unified builder modernization в M-PR-07 |
| Student | Green/yellow | dashboard continue-learning, my courses, course/lesson access, embedded quiz/assignment/question/rating, certificates | Playwright happy path on prepared DB |
| Curator | Green/yellow | assigned students, questions, assignment review, risks, scoped chat, operational student cards with next actions | Browser smoke on prepared curator data; deeper operations continue through M-PR-06/M-PR-08 |
| Super Curator | Yellow | curator dashboard, distribution, questions, reports scope | workload/risk/reassignment operations в M-PR-06 |
| Customer Observer | Green/yellow | scoped dashboard, reports, certificates, read-only constraints | Reports/analytics v1 с owner/export tests в M-PR-08 |

---

## 4. Security And Privacy Baseline

| Контроль | Статус |
|---|---|
| Unauthenticated role cabinets | Redirect to `/login` |
| Forbidden role access | Redirect/error to `/403` or guarded route denial |
| Student data ownership | Scoped by current user/enrollment |
| Instructor course ownership | Enforced on course/module/lesson/quiz/assignment mutations |
| Curator-student relationship | Enforced on answer/review/forward/risk/chat actions |
| Super-curator operational scope | Enforced for reports/questions/distribution baseline; needs v1 UX hardening |
| Customer observer read-only | Enforced by RBAC and no mutation UI |
| Customer observer private data scope | Explicit project/cohort scope only; no scope means no private data |
| Certificate public verify | Public verification by code without role cabinet access |
| Default notification channel | `in_app` |
| Email notification | Only explicit `email` or `email_and_in_app` |
| Service worker privacy | Authenticated navigation pages are not stored for offline replay |

---

## 5. Product/UX Baseline

The product direction remains:

```text
Course → Module → Block → Lesson → Content / Test / Assignment / Question / Rating / Completion
```

Current state after M-PR-04:

- Course, Module, Block, Lesson exist in product/schema direction.
- Student dashboard and course pages are usable.
- Standalone quiz/assignment pages exist and are allowed as aggregators.
- Dashboard continue-learning uses the next available lesson from the learning service.
- Lesson player renders attached quizzes/assignments even for legacy lessons without explicit content blocks.
- Rating, curator question, and completion content blocks are preserved by parsing and rendered in lesson context.
- Standalone quiz/assignment pages and aggregators now prefer returning to the originating lesson/course context.
- Curator screens now expose next-action student cards with progress, deadlines, questions, assignments, risks, latest lesson context, and quick chat.

M-PR-05 and M-PR-06 should focus on role workflow quality, not on new product categories.

---

## 6. Release Verification

Required release gate:

```bash
npm run verify:release
```

The command covers:

- `npm run lint -- --max-warnings=0`
- `npm run typecheck`
- `npm run test`
- `npx prisma validate`
- `npm run db:generate`
- `npm run build`
- `npm run test:e2e`

Known limitation:

- Full `verify:release` requires a prepared database with `npm run users:create` and `npm run course:create-demo`.
- Local non-E2E verification can pass, but production release remains blocked until Playwright role smoke passes on prepared staging/production-like data.

---

## 7. Current Open Risks

| Priority | Risk | Why It Matters | Planned Package |
|---|---|---|---|
| P1 | Super-curator workload/risk operations need safer v1 UX | Load distribution and escalation must be scoped and actionable | M-PR-06 |
| P2 | Reports/analytics need owner/scope/export discipline | Reports must support management decisions without data leakage | M-PR-08 |
| P2 | Notification/audit coverage is incomplete for all core events | Enrollment, curator assignment, assignment review, certificate events need consistent records | M-PR-09 |
| P3 | Status strings still need enum cleanup | Schema cleanup should happen in a separate downtime window | M-PR-10 |
| P3 | Heavy dashboards/reports/chats need bounded query review | Production scale requires pagination/indexes/no unbounded queries | M-PR-11 |
| P3 | Final production runbooks and rollback need rehearsal | Release candidate needs clear deploy/migration/rollback instructions | M-PR-12 |

---

## 8. Documentation State

| Document | Status |
|---|---|
| `docs/specification.md` | Product baseline |
| `docs/platform-functional-overview.md` | Functional product truth, no stack details |
| `docs/work-plan.md` | Current modernization execution map |
| `docs/update-log.md` | Current change log and decision record |
| `docs/release-verification.md` | Release gate runbook |
| `docs/student-interaction-audit-results.md` | Historical audit snapshot; use with `update-log` for current status |
| `docs/ux-student-course-player.md` | Student course player direction |
| `docs/ux-unified-course-builder.md` | Builder modernization direction |
| `docs/route-map-unified-ux.md` | Route direction and compatibility map |

Rule going forward: if an old audit table says a risk is open but `docs/update-log.md` and code show it closed, treat the old table as historical and update this audit/work-plan first.

---

## 9. Recommended Next Step

Continue with **M-PR-06: Super Curator Operations v1**:

- expose workload, risk, question, and reassignment actions by curator/cohort;
- keep reassignment/escalation actions scoped by super-curator responsibility;
- reuse the M-PR-05 operational pattern so every row answers “what should I do next?”.
