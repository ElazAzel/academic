# Release Plan & Verification

---

## 1. Release Hardening Plan

Дата актуализации: 2026-05-31
Статус: active execution baseline для доведения платформы до доказуемой release-ready готовности.

Итоговый краткий статус вынесен в `docs/READINESS.md`. Этот файл хранит подробный release-hardening baseline и runbook.

### Текущий статус 2026-05-31

Repo-local v1 boundary cleanup выполнен: прямой Prisma Client удален из `app/**/page.tsx` и `components/**`, данные для страниц вынесены в `server/modules/page-data/service.ts`, а `tests/unit/release-hardening-readiness.test.ts` теперь блокирует возврат `@/lib/prisma`, `getPrisma()` и `prisma.*` в UI-слой.

E2E-навигация больше не использует `networkidle`; проверки переведены на `domcontentloaded`, чтобы SSE-стрим уведомлений не удерживал сеть активной и не создавал ложные таймауты.

Последние repo-local gates по `docs/updates.md`: `npm run verify` проходит, включая banned-patterns, lint, typecheck, 466/466 tests и production build. Это подтверждает repo-local code health, но не закрывает release-ready статус.

Release-ready остаётся `partial`: WP1, WP2, WP4 и WP5 требуют сценарного proof, WP6 остаётся `blocked` до staging/production `verify:release`, backup/restore/rollback evidence, DPA и ротации скомпрометированного Supabase-пароля.

### Цель

AI Strategic Academy не должна считаться готовой только потому, что страницы рендерятся и базовые команды зелёные. Release-ready означает, что закрытая академия доказана сценарно: роли, доступы, учебный путь, кураторские операции, отчёты, сертификаты, уведомления и эксплуатационные процедуры работают в проверяемой среде.

Машинно-читаемый контракт плана находится в `server/modules/release-hardening/readiness.ts`. Его проверяет `tests/unit/release-hardening-readiness.test.ts`.

### Матрица ответственности

| Группа | Состав | Назначение |
| --- | --- | --- |
| Product roles | `admin`, `instructor`, `student`, `curator`, `super_curator`, `customer_observer` | Роли, для которых платформа должна доказать рабочие сценарии и границы доступа. |
| Redirect priority | `admin` → `super_curator` → `curator` → `instructor` → `customer_observer` → `student` | Приоритет кабинета для пользователя с несколькими ролями. |
| AI agent roles | `orchestrator`, `product-owner`, `principal-architect`, `backend-next-prisma`, `frontend-lms-ux`, `security-privacy`, `qa-release`, `devops-platform`, `data-analytics`, `technical-writer` | Рабочие перспективы для реализации, проверки и документации. |
| Project skills | `lms-domain-rules`, `lms-implementation`, `lms-qa-release`, `lms-orchestrator`, `multi-agent-review` | Обязательные локальные инструкции для LMS-домена, реализации, QA, orchestration и review. |
| Technical skills | 14 skills из `skills-lock.json` и `.agents/skills` | Next.js, React, shadcn, Supabase/Postgres, Vercel и UI-guidelines поддержка по необходимости. |

### Work Packages

| WP | Статус | Owners | Exit condition |
| --- | --- | --- | --- |
| WP0 Truth Sync и агентская диспетчеризация | `done` | Orchestrator, Technical Writer | Документы и typed contract синхронизированы; `done` требует evidence; unit-тест контракта зелёный. |
| WP1 Six-role Scenario Proof | `partial` | QA Release, Product Owner, Frontend LMS UX | Playwright доказывает осмысленные сценарии всех 6 ролей на seeded/disposable env. |
| WP2 Access, Privacy, Ownership Hardening | `partial` | Security Privacy, Backend Next Prisma | Негативные тесты покрывают role scope, ownership, guessed ID, observer read-only, media/report/certificate privacy. |
| WP3 Architecture Boundary Cleanup | `done` | Principal Architect, Backend Next Prisma | Прямой Prisma удален из `app/**/page.tsx` и `components/**`; boundary закреплен unit-guard и сканами. |
| WP4 Role Workspace UX Optimization | `partial` | Frontend LMS UX, Product Owner | Каждый кабинет отвечает "что делать дальше"; есть empty/error/loading и responsive/keyboard smoke. |
| WP5 Reporting, Analytics, Certificates, Notifications Proof | `partial` | Data Analytics, Security Privacy, QA Release | Exports scoped; revoked certificates invalid; notification channel rules доказаны тестами. |
| WP6 DevOps, Release, Backup, Observability | `blocked` | DevOps Platform, QA Release | `npm run verify:release` проходит в целевом окружении; backup/restore и rollback подтверждены. |

### Release Gates

| Gate | Статус | Команда / доказательство |
| --- | --- | --- |
| Zero-warning lint | `done` | `npm run lint -- --max-warnings=0` |
| TypeScript check | `done` | `npm run typecheck` |
| Unit/integration tests | `done` | `npm run test` |
| Production build | `done` | `npm run build` |
| Six-role workflow E2E | `partial` | `npm run test:e2e`, но только если сценарии проверяют действия, а не только route rendering |
| Access/privacy negative paths | `partial` | unit/integration/e2e coverage для ownership и role scope; signed lesson media URL negative tests; popup management scoped by creator for curators and admin-only toggle/delete |
| Operational release drill | `blocked` | `npm run verify:release` в целевом окружении плюс backup/restore/rollback evidence |

### Правило статусов

- `done` разрешён только при наличии code/test/browser/gate/docs/ops evidence, которое проверяет именно заявленное поведение.
- Route rendering, наличие страницы или зелёный build не доказывают рабочий продуктовый сценарий.
- `implementation-plan.md` может фиксировать реализованные домены, но итоговая release-ready оценка берётся из этого плана, `full-project-audit.md` и контракта `release-hardening/readiness.ts`.
- Любое изменение поведения обновляет `docs/updates.md`; существенное изменение статуса обновляет также `docs/work-plan.md` и этот документ.

### Следующая реализация

1. Закрыть WP1: расширить Playwright сценарии так, чтобы они доказывали действия по всем 6 ролям на seeded/disposable env.
2. Закрыть WP2: добавить недостающие negative-path тесты по guessed IDs, observer scope, media/report/certificate privacy.
3. Продолжать WP3 только как regression guard: новые страницы и компоненты должны использовать server modules/actions, а direct Prisma в UI блокируется unit-тестом.

---

## 2. Release Verification Runbook

Date: 2026-05-24

This runbook is the release gate for AI Strategic Academy. A release is not green until the full command succeeds on a prepared environment.

### Command

```bash
npm run verify:release
```

The command runs:

- `npm run lint -- --max-warnings=0`
- `npm run typecheck`
- `npm run test`
- `npx prisma validate`
- `npm run db:generate`
- `npm run build`
- `npm run test:e2e`

### Required Environment

- `DATABASE_URL` points to the release/staging database.
- Migrations are applied with `npm run db:migrate`.
- Test users exist via `npm run users:create`.
- Demo credentials are verified via `npm run users:check-demo`.
- Demo learning data exists via `npm run course:create-demo`.
- Required auth, storage, SMTP, and app URL env vars are configured.
- Playwright browsers are installed for the runner.
- `npm run test:e2e` refuses remote database hosts by default because the suite mutates seeded data; set `ALLOW_REMOTE_DATABASE_MUTATION=true` only for an intentional staging release run.

### E2E Scope

The release E2E gate must cover:

- public pages and closed registration;
- login smoke for admin, instructor, student, curator, super curator, customer observer;
- role boundary redirects to `/403` or `/login`;
- student dashboard, my courses, and settings smoke.

If E2E cannot run locally because the database or browser runtime is unavailable, the static gate may still be run with `npm run verify`, but the release remains blocked until `npm run verify:release` passes in a disposable/local DB or explicitly approved staging environment.

### Historical Static Gate (2026-05-24)

Эта таблица фиксирует исторический зелёный repo-local/static gate. Она не повышает текущий release-ready статус, пока WP1-WP6 из раздела выше не закрыты evidence.

| Step | Result | Notes |
|------|--------|-------|
| `lint --max-warnings=0` | ✅ Pass | 0 errors, 0 warnings |
| `typecheck` | ✅ Pass | tsc --noEmit clean |
| `test` | ✅ Pass | 422 теста, 69 файлов — всё зелёное |
| `prisma validate` | ✅ Pass | Schema valid |
| `db:generate` | ✅ Pass | Prisma Client generated |
| `build` | ✅ Build | Next.js 16 production build successful (87 pages) |
| `test:e2e` | ✅ Pass | 52/52 smoke-тестов (Chromium + Pixel 7) |

**Исторический вывод:** repo-local/static gate был зелёный, v1.0.0 мог быть выпущен как кодовая итерация. **Текущий release-ready статус см. `docs/READINESS.md`: `partial`.**

### Rollback Rule

For schema or access-control changes, prepare a database backup before release. If the release fails smoke checks after deploy, roll back the app version first; roll back database changes only from the matching backup/runbook for that migration.
