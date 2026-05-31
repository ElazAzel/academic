# Full Optimization Goal — AI Strategic Academy

Дата создания: 2026-05-31
Статус: `active`

## Цель

Довести AI Strategic Academy до состояния полной оптимизации и доказанной работоспособности всего функционала платформы.

Это означает не "все страницы открываются" и не "локальный build зелёный", а проверенное состояние, где каждый основной продуктовый сценарий работает end-to-end для своей роли, защищён negative-path тестами, устойчив к ошибочным/пустым состояниям, доступен на desktop/mobile и подтверждён release/ops evidence.

## Границы цели

В scope входят:

- все 6 ролей: admin, instructor, student, curator, super_curator, customer_observer;
- закрытая auth-модель, device-session limit, RBAC и redirect priority;
- course builder, модули, блоки, уроки, sequential unlock;
- lesson player: материалы, видео, тест, задание, вопрос куратору, рейтинг, завершение;
- XP, achievements, streak, leaderboard и уведомления о значимых учебных событиях;
- вопросы, чат, кураторская очередь, проверка заданий, escalation к преподавателю;
- риски, дедлайны, workload/SLA кураторов и super-curator распределение;
- отчёты, аналитика, exports CSV/XLSX/PDF, scoped visibility;
- сертификаты: идемпотентная выдача, отзыв, PDF, публичная проверка;
- in-app/SSE/push/email notification rules;
- media/files/storage privacy и signed URL boundaries;
- accessibility, responsive behavior, Russian-first UI, empty/error/loading states;
- release, backup/restore, rollback, observability, secrets, legal/DPA blockers.

Вне scope до закрытия release-ready:

- извлечение микросервисов без сработавших scale triggers;
- новые AI/ML-фичи, если они не закрывают текущий release blocker;
- косметические редизайны без сценарного UX/evidence эффекта.

## Definition of Done

Цель считается выполненной только когда все пункты ниже доказаны текущим состоянием:

| Область | Требование | Evidence |
|---|---|---|
| Release readiness | `docs/READINESS.md` итоговый статус `done` | WP1-WP6 закрыты evidence |
| Code health | Banned patterns, lint, typecheck, unit/integration tests, build зелёные | `npm run verify` |
| Scenario proof | Все 6 ролей проходят смысловые сценарии, а не только route smoke | Playwright full suite на seeded/disposable env |
| Access/privacy | Ownership, guessed IDs, observer read-only, media/report/certificate boundaries доказаны | Negative unit/integration/e2e tests |
| Student flow | Курс -> модуль -> блок -> урок -> тест/задание/вопрос/рейтинг/завершение работает как единый путь | E2E student flow + data assertions |
| Staff operations | Curator, super-curator, instructor, admin dashboards дают next actions и рабочие очереди | Role workspace smoke + UX acceptance |
| Reports/certificates | Scoped exports, idempotent issue, revoke, public verify, PDF download доказаны | Tests + browser/API proof |
| Notifications | Security notifications ignore prefs; обычные каналы уважают настройки; SSE/push/email paths проверены | Unit/integration + delivery smoke |
| Accessibility/responsive | Core workflows keyboard-reachable, axe critical/serious clean, no mobile overflow | Playwright accessibility/responsive suite |
| Performance | Heavy dashboards/reports bounded, no known N+1 regressions, build/runtime budgets контролируются | Targeted perf checks + query audit |
| Ops | Staging/prod release drill, backup/restore, rollback, health/readiness, monitoring evidence записаны | `npm run verify:release` + runbook evidence |
| Legal/security | DPA и secret rotation закрыты; secrets не присутствуют в current tree | Legal register + secret scan |

Если хотя бы один пункт имеет только косвенное evidence, статус цели остаётся `active`.

## Рабочие фазы

### Phase A — Truth & Gates

Цель: убрать дрейф статусов и сделать проверку завершения машинно/операционно понятной.

- держать `docs/READINESS.md` как краткий статус;
- сохранять `docs/release.md` как runbook;
- поддерживать `docs/work-plan.md` как рабочие пакеты;
- обновлять `docs/updates.md` после каждой итерации;
- не повышать статус на основании одного build/render smoke.

### Phase B — Six-role Functional Proof

Цель: доказать работу всех ролей.

- admin: пользователи, роли, когорты, enrollments, certificates, audit, reports;
- instructor: course builder, publish checks, quizzes, assignments, forwarded questions, analytics;
- student: continue learning, lesson player, quiz, assignment, question, XP, certificate;
- curator: questions, assignment review, risks, notes, notifications;
- super_curator: curator load, distribution, cohort risks, SLA;
- customer_observer: scoped read-only reports/certificates без mutation affordances.

### Phase C — Security, Privacy, Ownership

Цель: доказать отказ в доступе там, где доступ не должен быть возможен.

- guessed IDs;
- foreign enrollment/course/lesson/media/certificate/report IDs;
- observer without scope returns empty, not global fallback;
- curator/instructor scope boundaries;
- revoked certificates and certificate PDFs;
- upload/download signed URL TTL and ownership.

### Phase D — UX, Accessibility, Responsive

Цель: каждый core workflow usable на desktop/mobile и keyboard.

- student learning-first hierarchy;
- role dashboards as work queues;
- empty/error/loading states;
- WCAG 2.1/2.2 AA-oriented checks;
- no horizontal overflow;
- dialogs/drawers/focus traps verified.

### Phase E — Performance & Architecture Optimization

Цель: убрать технические bottlenecks без преждевременной service extraction.

- N+1 audit and fixes;
- bounded queries/pagination/virtualization;
- server/client component audit;
- bundle analysis;
- cache/dedup where safe;
- dependency hygiene.

### Phase F — Ops & Release

Цель: production readiness can survive deploy and rollback.

- staging `verify:release`;
- backup/restore drill;
- rollback drill;
- health/readiness checks;
- observability/Sentry evidence;
- SMTP production smoke;
- DPA and secret rotation evidence.

## Метрика прогресса

Текущий progress не считается процентом страниц. Он считается по закрытию evidence:

```text
Progress = closed evidence items / required evidence items
```

Текущий baseline берётся из `docs/READINESS.md`.

## Правило остановки

Нельзя считать цель выполненной, пока:

- `docs/READINESS.md` не переведён в `done`;
- `npm run verify` не зелёный;
- `npm run verify:release` не зелёный в целевом окружении;
- все explicit blockers из `docs/READINESS.md` не закрыты;
- `docs/updates.md` не содержит финальную запись с evidence.
