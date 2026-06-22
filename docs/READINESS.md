# Release Readiness — AI Strategic Academy

Дата актуализации: 2026-06-22

Этот документ — единая рабочая матрица готовности платформы. Он не заменяет подробные планы, а фиксирует текущую операционную правду: что уже доказано, что только реализовано в коде, и что блокирует production-ready статус.

## Статус

**Текущий итог:** `release-candidate`

Последний закрытый слой: Commercial Product readiness. Tracks A (operational readiness) и B (commercial features) полностью закрыты: CI clean, CSP correct, E2E smoke для 6 ролей, SMTP production wiring, Weekly/Final Cohort Reports, Observer Productivity Score, Onboarding Flow с batch CSV import. Security negative-path tests покрывают все критические сценарии. Осталось: backup/restore drill (требует staging env) и подписанные DPA.

## Последнее evidence 2026-06-22

- Full verify: 936/936 Vitest tests, ESLint 0 warnings, TypeScript clean, production build OK.
- Auth optimization: JWT callback skips redundant DB query (−1.4s), device session transaction relaxed to ReadCommitted (−28% latency on remote Supabase).
- Track A (operational readiness) fully closed: A1 (CI zero warnings), A2 (CSP correct), A3 (E2E smoke for 6 roles), A4 (SMTP production wiring).
- Track B (commercial features) fully closed: B1 (Weekly Cohort Report), B2 (Final Cohort Report), B3 (Observer Productivity Score), B4 (Onboarding Flow with batch CSV import).
- Security negative paths (C2): certificate access hardening, gated lesson/video access, sequential lock enforcement, media signed URL privacy, customer observer strict gating, instructor course scope boundaries — all covered in unit tests.
- Git history cleaned: squashed duplicate commits, force-pushed clean linear history.

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
| WP1 | Six-role Scenario Proof | `done` | E2E smoke tests для всех 6 ролей (admin, student, curator, instructor, super_curator, observer) — route smoke + negative paths + analytics |
| WP2 | Access, Privacy, Ownership Hardening | `done` | Security negative-path unit tests: certificate access, gated lesson/video, sequential lock, media privacy, observer gating, instructor scope, RBAC |
| WP3 | Architecture Boundary Cleanup | `done` | Прямой Prisma удалён из `app/**/page.tsx` и `components/**`; guard закреплён unit-тестом |
| WP4 | Role Workspace UX Optimization | `done` | Каждый кабинет отвечает на вопрос "что делать дальше"; empty/error/loading/responsive/keyboard proof |
| WP5 | Reporting, Analytics, Certificates, Notifications Proof | `done` | Weekly/Final reports, Score distribution, CSV/XLSX/PDF exports, revoked certificates invalid, notification channels |
| WP6 | DevOps, Release, Backup, Observability | `partial` | CI clean (0 warnings, 936 tests, build OK), backup/restore drill требует staging env |

## Gates

| Gate | Текущий статус | Примечание |
|---|---|---|
| Banned patterns | `done` | Включён в `npm run verify` |
| Zero-warning lint | `done` | 0 errors, 0 warnings (2026-06-22) |
| TypeScript | `done` | clean typecheck (2026-06-22) |
| Unit/integration tests | `done` | 936/936 Vitest tests (2026-06-22) |
| Production build | `done` | production build OK (2026-06-22) |
| E2E smoke | `done` | Route smoke + negative paths для всех 6 ролей |
| Accessibility smoke | `done` | Axe smoke + keyboard proof для публичных и авторизованных страниц |
| Security negative paths | `done` | Certificate access, gated lesson/video, sequential lock, media privacy, observer gating, instructor scope, RBAC — все unit tests |
| Operational drill | `partial` | Требует staging/production env для backup/restore/rollback drill |

## Открытые блокеры

| Блокер | Приоритет | Где зафиксирован | Следующее действие |
|---|---|---|---|
| DPA с Vercel и Supabase не подписаны | P1 | `docs/todo.md`, `docs/legal/third-party-services-register.md` | Принять/подписать DPA до реальных production данных |
| Supabase password скомпрометирован в git history | P1 | `docs/security-review.md` | Ротация пароля вручную в Supabase Dashboard; обновить env |
| Full WCAG/keyboard proof | P2 | `docs/ux-ui-2026-audit.md` | Добавить keyboard/responsive paths для core workflows |
| Backup/restore/rollback drill | P1 | `docs/release.md`, `docs/backup-restore-runbook.md` | Провести staging drill и записать evidence |

## Правило статусов

`done` означает, что есть релевантное доказательство: code/test/browser/gate/docs/ops. Рендер страницы, зелёный build или наличие route сами по себе не закрывают продуктовый сценарий.

Для крупных изменений обновляются:

- `docs/updates.md`;
- `docs/READINESS.md`, если меняется статус gates/WP/blockers;
- `docs/release.md` или `docs/work-plan.md`, если меняется release baseline;
- `docs/ai-agent-instructions.md`, если меняется архитектурная или продуктовая правда.
