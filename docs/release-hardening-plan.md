# Release Hardening Plan

Дата актуализации: 2026-05-26
Статус: active execution baseline для доведения платформы до доказуемой release-ready готовности.

## Цель

AI Strategic Academy не должна считаться готовой только потому, что страницы рендерятся и базовые команды зелёные. Release-ready означает, что закрытая академия доказана сценарно: роли, доступы, учебный путь, кураторские операции, отчёты, сертификаты, уведомления и эксплуатационные процедуры работают в проверяемой среде.

Машинно-читаемый контракт плана находится в `server/modules/release-hardening/readiness.ts`. Его проверяет `tests/unit/release-hardening-readiness.test.ts`.

## Матрица ответственности

| Группа | Состав | Назначение |
| --- | --- | --- |
| Product roles | `admin`, `instructor`, `student`, `curator`, `super_curator`, `customer_observer` | Роли, для которых платформа должна доказать рабочие сценарии и границы доступа. |
| Redirect priority | `admin` → `super_curator` → `curator` → `instructor` → `customer_observer` → `student` | Приоритет кабинета для пользователя с несколькими ролями. |
| AI agent roles | `orchestrator`, `product-owner`, `principal-architect`, `backend-next-prisma`, `frontend-lms-ux`, `security-privacy`, `qa-release`, `devops-platform`, `data-analytics`, `technical-writer` | Рабочие перспективы для реализации, проверки и документации. |
| Project skills | `lms-domain-rules`, `lms-implementation`, `lms-qa-release`, `lms-orchestrator`, `multi-agent-review` | Обязательные локальные инструкции для LMS-домена, реализации, QA, orchestration и review. |
| Technical skills | 14 skills из `skills-lock.json` и `.agents/skills` | Next.js, React, shadcn, Supabase/Postgres, Vercel и UI-guidelines поддержка по необходимости. |

## Work Packages

| WP | Статус | Owners | Exit condition |
| --- | --- | --- | --- |
| WP0 Truth Sync и агентская диспетчеризация | `done` | Orchestrator, Technical Writer | Документы и typed contract синхронизированы; `done` требует evidence; unit-тест контракта зелёный. |
| WP1 Six-role Scenario Proof | `partial` | QA Release, Product Owner, Frontend LMS UX | Playwright доказывает осмысленные сценарии всех 6 ролей на seeded/disposable env. |
| WP2 Access, Privacy, Ownership Hardening | `partial` | Security Privacy, Backend Next Prisma | Негативные тесты покрывают role scope, ownership, guessed ID, observer read-only, media/report/certificate privacy. |
| WP3 Architecture Boundary Cleanup | `partial` | Principal Architect, Backend Next Prisma | Критичные UI routes получают typed DTO из server modules/actions; direct Prisma в UI не расширяется. |
| WP4 Role Workspace UX Optimization | `partial` | Frontend LMS UX, Product Owner | Каждый кабинет отвечает “что делать дальше”; есть empty/error/loading и responsive/keyboard smoke. |
| WP5 Reporting, Analytics, Certificates, Notifications Proof | `partial` | Data Analytics, Security Privacy, QA Release | Exports scoped; revoked certificates invalid; notification channel rules доказаны тестами. |
| WP6 DevOps, Release, Backup, Observability | `blocked` | DevOps Platform, QA Release | `npm run verify:release` проходит в целевом окружении; backup/restore и rollback подтверждены. |

## Release Gates

| Gate | Статус | Команда / доказательство |
| --- | --- | --- |
| Zero-warning lint | `done` | `npm run lint -- --max-warnings=0` |
| TypeScript check | `done` | `npm run typecheck` |
| Unit/integration tests | `done` | `npm run test` |
| Production build | `done` | `npm run build` |
| Six-role workflow E2E | `partial` | `npm run test:e2e`, но только если сценарии проверяют действия, а не только route rendering |
| Access/privacy negative paths | `partial` | unit/integration/e2e coverage для ownership и role scope |
| Operational release drill | `blocked` | `npm run verify:release` в целевом окружении плюс backup/restore/rollback evidence |

## Правило статусов

- `done` разрешён только при наличии code/test/browser/gate/docs/ops evidence, которое проверяет именно заявленное поведение.
- Route rendering, наличие страницы или зелёный build не доказывают рабочий продуктовый сценарий.
- `implementation-plan.md` может фиксировать реализованные домены, но итоговая release-ready оценка берётся из этого плана, `full-project-audit.md` и контракта `release-hardening/readiness.ts`.
- Любое изменение поведения обновляет `docs/updates.md`; существенное изменение статуса обновляет также `docs/work-plan.md` и этот документ.

## Следующая реализация

1. Закрыть WP1: расширить Playwright сценарии так, чтобы они доказывали действия по всем 6 ролям на seeded/disposable env.
2. Закрыть WP2: добавить недостающие negative-path тесты по guessed IDs, observer scope, media/report/certificate privacy.
3. Начать WP3 с инвентаря прямого Prisma в `app/**` и `components/**`, затем выносить критичные queries в server modules/actions.
