# Release Readiness — AI Strategic Academy

Дата актуализации: 2026-06-01

Этот документ — единая рабочая матрица готовности платформы. Он не заменяет подробные планы, а фиксирует текущую операционную правду: что уже доказано, что только реализовано в коде, и что блокирует production-ready статус.

## Статус

**Текущий итог:** `partial`

Платформа имеет широкий реализованный функционал и зелёный repo-local gate по последним итерациям, но production-ready статус не закрыт до сценарного proof по ролям, negative-path security proof и operational drill в целевом окружении.

## Источники статуса

| Документ | Роль |
|---|---|
| `docs/FULL-OPTIMIZATION-GOAL.md` | Долгосрочная цель полной оптимизации и доказанной работоспособности |
| `docs/READINESS.md` | Краткая матрица текущей готовности |
| `docs/release.md` | Release-hardening baseline и runbook |
| `docs/work-plan.md` | Рабочие пакеты WP0-WP6 и исторические задачи |
| `docs/full-project-audit.md` | Аудит рисков, дрейфов и доказательств |
| `docs/todo.md` | Ближайшие ручные и внешние задачи |
| `docs/updates.md` | Хронологический журнал изменений |

Если документы расходятся, приоритет такой:

1. Код и фактически выполненные проверки.
2. `docs/updates.md` для свежих событий.
3. `docs/FULL-OPTIMIZATION-GOAL.md` для верхнеуровневого Definition of Done.
4. `docs/READINESS.md` для итогового статуса.
5. `docs/release.md` и `docs/work-plan.md` для деталей.
6. Архивные документы только как исторический контекст.

## Release Work Packages

| WP | Название | Статус | Что считается выходом |
|---|---|---|---|
| WP0 | Truth Sync и агентская диспетчеризация | `done` | Роли, gates и baseline синхронизированы; контракт проверяется unit-тестом |
| WP1 | Six-role Scenario Proof | `partial` | Playwright доказывает осмысленные сценарии всех 6 ролей на seeded/disposable env |
| WP2 | Access, Privacy, Ownership Hardening | `partial` | Negative-path tests покрывают role scope, ownership, guessed IDs, observer read-only, media/report/certificate privacy |
| WP3 | Architecture Boundary Cleanup | `done` | Прямой Prisma удалён из `app/**/page.tsx` и `components/**`; guard закреплён unit-тестом |
| WP4 | Role Workspace UX Optimization | `partial` | Каждый кабинет отвечает на вопрос "что делать дальше"; есть empty/error/loading/responsive/keyboard proof |
| WP5 | Reporting, Analytics, Certificates, Notifications Proof | `partial` | Exports scoped; revoked certificates invalid; notification channel rules доказаны |
| WP6 | DevOps, Release, Backup, Observability | `blocked` | `verify:release` в целевом окружении, health checks, backup/restore, rollback, secrets и observability evidence записаны |

## Gates

| Gate | Текущий статус | Примечание |
|---|---|---|
| Banned patterns | `done` | Включён в `npm run verify` |
| Zero-warning lint | `done` | Последние записи `updates.md` фиксируют 0 errors / 0 warnings |
| TypeScript | `done` | Последние repo-local проверки зелёные |
| Unit/integration tests | `done` | Последний `npm run verify`: 508/508 Vitest tests |
| Production build | `done` | Последний `npm run verify`: production build зелёный |
| E2E smoke | `partial` | Smoke есть, но full six-role workflow proof ещё не закрыт |
| Accessibility smoke | `partial` | Axe smoke есть; full WCAG/keyboard proof не закрыт |
| Security negative paths | `partial` | Часть media/access tests закрыта; reports API/preview/async job/status, certificate designer preview, certificate PDF observer scope, report job status owner/safe-download URL, chat upload errors, course-builder inline mutations, popup diagnostics/targeting, cohort targeting и cohort deadline reads дополнительно ограничены server-side; весь observer/report/certificate/privacy scope ещё не доказан |
| Operational drill | `blocked` | Требует staging/production env, backup/restore/rollback evidence |

## Открытые блокеры

| Блокер | Приоритет | Где зафиксирован | Следующее действие |
|---|---|---|---|
| DPA с Vercel и Supabase не подписаны | P1 | `docs/todo.md`, `docs/legal/third-party-services-register.md` | Принять/подписать DPA до реальных production данных |
| Supabase password скомпрометирован в git history | P1 | `docs/security-review.md` | Ротация пароля вручную в Supabase Dashboard; обновить env |
| Full E2E по всем ролям | P2 | `docs/release.md`, `docs/work-plan.md` | Поднять local/disposable DB или подтверждённый staging (`ALLOW_REMOTE_DATABASE_MUTATION=true`) и расширить Playwright сценарии с действиями, а не только route smoke |
| SMTP production wiring | P2 | `docs/todo.md`, `docs/updates.md` | Настроить реальные SMTP env и delivery smoke |
| Full WCAG/keyboard proof | P2 | `docs/ux-ui-2026-audit.md` | Добавить keyboard/responsive paths для core workflows |
| Backup/restore/rollback drill | P1 | `docs/release.md`, `docs/backup-restore-runbook.md` | Провести staging drill и записать evidence |

## Правило статусов

`done` означает, что есть релевантное доказательство: code/test/browser/gate/docs/ops. Рендер страницы, зелёный build или наличие route сами по себе не закрывают продуктовый сценарий.

Для крупных изменений обновляются:

- `docs/updates.md`;
- `docs/READINESS.md`, если меняется статус gates/WP/blockers;
- `docs/release.md` или `docs/work-plan.md`, если меняется release baseline;
- `docs/ai-agent-instructions.md`, если меняется архитектурная или продуктовая правда.
