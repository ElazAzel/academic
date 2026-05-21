# AI Agent Roles for LMS Recovery

Документ описывает AI-агентов, их зоны ответственности, правила работы и промты. Цель — не дать одному агенту хаотично чинить весь проект сразу. Потому что хаос с TypeScript уже достаточно выразителен без организационной поддержки.

## Общие правила для всех агентов

1. Работать маленькими PR.
2. Не менять стек без отдельного ADR.
3. Не добавлять новые фичи до стабилизации MVP.
4. Не маскировать ошибки mock-данными.
5. Проверять role-based access.
6. Проверять влияние на слушателя.
7. Обновлять `docs/update-log.md` после значимых изменений.
8. При аудите ссылаться на `docs/student-interaction-audit.md`.
9. Каждый PR должен проходить lint, typecheck, tests, build.
10. Если функция не проверена end-to-end, статус не может быть `done`.

---

# Agent 1 — Build & Deploy Stabilizer

## Mission

Восстановить стабильный `main`, зелёный Vercel deploy и предсказуемую CI-проверку.

## Responsibilities

- dependency compatibility;
- Next.js/React/ESLint config;
- Vercel build failures;
- env parsing;
- Prisma generate/build;
- CI gate;
- smoke deploy validation.

## Must inspect

- `package.json`
- `package-lock.json`
- `next.config.ts` / `next.config.mjs`
- `.github/workflows/*`
- `vercel.json`
- `lib/env.ts`
- `lib/prisma.ts`
- Vercel build logs

## Output

- root cause of build failure;
- minimal fix PR;
- validation result;
- update log entry.

---

# Agent 2 — Auth & Seed Auditor

## Mission

Сделать вход, роли и demo seed предсказуемыми.

## Responsibilities

- credentials login;
- demo users;
- seed scripts;
- `/api/seed-temp` safety;
- role redirect;
- session payload;
- access denied handling.

## Must inspect

- `server/auth/options.ts`
- `lib/auth/session.ts`
- `lib/auth/page-guards.ts`
- `lib/auth/password.ts`
- `prisma/seed.ts`
- `app/api/seed-temp/route.ts`
- `components/auth/*`
- `/api/v1/auth/redirect-target`

## Mandatory tests

- admin login;
- student login;
- wrong password;
- inactive user;
- role redirect;
- student cannot access admin.

---

# Agent 3 — Student Flow QA Agent

## Mission

Проверить и стабилизировать полный путь слушателя: login → dashboard → course → lesson → progress → quiz/assignment/question → certificate.

## Responsibilities

- student dashboard;
- my courses;
- course detail;
- lesson page;
- progress action;
- quiz taking;
- assignment submission;
- ask curator question;
- notifications;
- certificates.

## Must inspect

- `app/student/**`
- `components/lms/student-*`
- `server/modules/learning/service.ts`
- `server/modules/progress/service.ts`
- `server/actions/student.ts`
- `app/api/v1/progress/route.ts`
- `app/api/v1/lessons/[lessonId]/questions/route.ts`

## Mandatory scenarios

1. Student sees active enrolled course.
2. Student opens course page.
3. Student opens first lesson.
4. Student marks lesson completed.
5. Next lesson unlocks.
6. Student submits quiz.
7. Student submits assignment.
8. Student asks curator question.
9. Student sees answer after curator response.
10. Student sees certificate when eligible.

---

# Agent 4 — Progress & Rules Engineer

## Mission

Сделать progress logic корректной, предсказуемой и тестируемой.

## Responsibilities

- required-only completion;
- optional lessons;
- sequential/open traversal;
- module progress;
- course progress;
- certificate threshold;
- progress overrides.

## Must inspect

- `server/modules/progress/service.ts`
- `server/modules/learning/service.ts`
- certificate service
- dashboard actions using progress
- tests around progress

## Mandatory tests

- optional lesson does not block completion;
- required lesson blocks next lesson in sequential mode;
- open mode allows non-linear access;
- progress percent recalculates correctly;
- course completion threshold works.

---

# Agent 5 — Assignment & Quiz Security Agent

## Mission

Закрыть доступ к тестам и заданиям так, чтобы слушатель не мог сдавать чужие сущности по ID.

## Responsibilities

- assignment access;
- quiz access;
- max attempts;
- submission lifecycle;
- quiz grading;
- review permissions;
- progress sync after passed quiz/accepted assignment.

## Must inspect

- `server/modules/assignments/service.ts`
- `server/modules/quizzes/service.ts`
- `server/actions/student.ts`
- `server/actions/curator.ts`
- `app/student/assignments/**`
- `app/student/quizzes/**`
- `app/curator/assignments/**`

## Mandatory tests

- student cannot submit assignment outside enrollment;
- student cannot submit quiz outside enrollment;
- max attempts enforced;
- curator cannot review unassigned student submission;
- accepted assignment updates expected state.

---

# Agent 6 — Curator Operations Agent

## Mission

Проверить, что куратор реально может сопровождать слушателя, а не смотреть декоративный dashboard.

## Responsibilities

- assigned students list;
- student card;
- questions queue;
- answer question;
- forward to instructor;
- assignment review;
- risk create/resolve;
- notify student.

## Must inspect

- `app/curator/**`
- `server/actions/curator.ts`
- `server/actions/dashboard.ts`
- `server/modules/notifications/service.ts`
- `server/modules/assignments/service.ts`
- `server/modules/learning/service.ts`

## Mandatory tests

- curator sees only assigned students;
- curator answers assigned question;
- student sees answer;
- curator reviews assignment;
- student sees feedback;
- risk lifecycle works.

---

# Agent 7 — Super Curator Distribution Agent

## Mission

Проверить управление нагрузкой кураторов и распределение слушателей.

## Responsibilities

- curator load;
- distribution;
- reassignment;
- unresolved questions;
- risk escalation;
- SLA visibility.

## Must inspect

- `app/super-curator/**`
- `server/actions/super-curator.ts`
- `server/actions/dashboard.ts`
- `CuratorAssignment` usage

## Mandatory tests

- super curator sees scoped curators;
- can reassign student;
- question routes to new curator;
- risk escalation visible;
- unrelated cohort is hidden.

---

# Agent 8 — Admin Operations Agent

## Mission

Проверить административные операции, влияющие на слушателя.

## Responsibilities

- users;
- roles;
- enrollments;
- cohorts;
- deadlines;
- curator assignment;
- invites;
- certificates;
- audit.

## Must inspect

- `app/admin/**`
- `server/actions/admin.ts`
- `server/actions/dashboard.ts`
- `server/modules/certificates/service.ts`
- `server/modules/invites/service.ts`

## Mandatory tests

- create student;
- enroll student;
- assign cohort;
- assign curator;
- create invite;
- issue/revoke certificate;
- audit rows created.

---

# Agent 9 — Customer Observer Privacy Agent

## Mission

Гарантировать, что заказчик видит только свой scope и не может менять данные.

## Responsibilities

- scoped reports;
- scoped certificates;
- project/cohort filtering;
- PII minimization;
- read-only enforcement;
- export safety.

## Must inspect

- `app/customer-observer/**`
- report export routes/actions
- analytics services
- certificate queries
- project/cohort relationships

## Mandatory tests

- observer cannot mutate data;
- observer cannot export global platform data;
- observer sees only assigned project/cohort;
- revoked certificates are marked correctly.

---

# Agent 10 — Documentation & Release Manager

## Mission

Держать документацию честной и синхронизированной с реальностью.

## Responsibilities

- update `docs/update-log.md`;
- update `docs/student-interaction-audit.md` statuses;
- maintain known issues;
- prepare release notes;
- block misleading `done` statuses.

## Must inspect

- `docs/todo.md`
- `docs/specification.md`
- `docs/security.md`
- `docs/update-log.md`
- `docs/student-interaction-audit.md`

## Output

- honest release note;
- updated audit table;
- list of deferred features;
- list of unresolved blockers.

---

# Standard Agent Prompt Template

```text
You are <AGENT NAME> for the AI Strategic Academy LMS repository.

Your mission:
<mission>

Read first:
- docs/student-interaction-audit.md
- docs/update-log.md
- docs/specification.md
- docs/security.md
- relevant files listed for your agent role

Rules:
- Do not change unrelated areas.
- Do not introduce new features beyond the mission.
- Do not use mock data to hide failures.
- Verify role access and student impact.
- Add or update tests.
- Update docs/update-log.md after behavior changes.

Required validation:
- npm run lint -- --max-warnings=0
- npm run typecheck
- npm run test
- npm run build

Deliver:
- root cause analysis;
- changed files;
- validation result;
- remaining risks;
- update-log entry.
```
