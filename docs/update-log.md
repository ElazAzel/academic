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
| Build/deploy | red | Recent merged PR had failed Vercel deployment and must be revalidated |
| Seed/demo accounts | red | Seed-temp flow can be unsafe or inconvenient if not deterministic |
| Notifications | red | Default in_app path must not send email |
| Progress | yellow | Completion must be based on required lessons, not all lessons |
| Assignment access | red | Submission must verify active enrollment and lesson/course access |
| Quiz access | yellow | Must verify access by lesson/course and sync progress reliably |
| Customer observer privacy | unknown | Needs scoped report verification |
| Curator workflows | yellow | Requires end-to-end tests: question answer, assignment review, risk resolution |
| Student happy path | yellow | Needs full smoke test from login to lesson completion |

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
