# Журнал обновлений AI Strategic Academy

Правило: новые записи добавляются сверху. Старые записи не переписываются, кроме исправления явной опечатки. Каждая запись должна быть достаточно конкретной, чтобы следующий AI-агент или инженер понял, что изменилось и что проверено.

## 2026-05-07 — Подготовлена публикация проекта в GitHub

Автор/agent: Codex  
Тип изменения: repository operations / documentation  
Файлы/модули:

- `LICENSE`
- `.git/config`
- `docs/updates.md`
- `docs/implementation-plan.md`

Summary:

- Remote `Academic` переименован в стандартный `origin` для корректной работы git tooling и cloud task diff.
- Удалённая ветка `main` из `https://github.com/ElazAzel/academic` подтянута локально.
- Initial commit удалённого репозитория с `LICENSE` объединён с локальной историей через merge без force-push.
- Локальный проект опубликован в `origin/main`.

Проверки:

- `git status --short --branch` показал чистую ветку `main` перед операцией.
- `git fetch origin main` прошёл успешно.
- `git merge FETCH_HEAD --allow-unrelated-histories --no-edit` прошёл успешно и добавил `LICENSE`.
- `git push -u origin main` прошёл успешно, ветка `main` теперь отслеживает `origin/main`.

Риски:

- Истории локального проекта и удалённого initial commit были unrelated; решено через обычный merge, чтобы сохранить удалённый `LICENSE`.
- Дальнейшие push/fetch операции всё ещё зависят от доступной GitHub-аутентификации в локальном окружении.

Next steps:

- Использовать `origin/main` как upstream для дальнейших задач и cloud diff.
- При следующих изменениях продолжать обновлять этот журнал и план реализации.

## 2026-05-07 — Добавлены auth UI flow и публичная проверка сертификатов

Автор/agent: Codex  
Тип изменения: runtime / UI / API / documentation  
Файлы/модули:

- `components/auth/*`
- `app/forgot-password/page.tsx`
- `app/reset-password/page.tsx`
- `app/verify-email/page.tsx`
- `app/certificates/verify/[verificationCode]/page.tsx`
- `app/api/v1/certificates/verify/[verificationCode]/route.ts`
- `server/modules/certificates/service.ts`
- `docs/api/openapi.yaml`
- `docs/implementation-plan.md`

Summary:

- Подключена форма восстановления пароля к `/api/v1/auth/forgot-password`.
- Добавлены страницы сброса пароля и подтверждения email с поддержкой `?token=...`.
- Добавлена публичная страница проверки сертификата по verification code.
- Добавлен REST endpoint публичной проверки сертификата без раскрытия email и внутренних данных слушателя.
- OpenAPI и implementation plan обновлены под новый API/UI срез.

Проверки:

- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- `npm.cmd run test` прошёл успешно: 8 test files, 11 tests. В sandbox запуск упёрся в `spawn EPERM`, повторный escalated запуск прошёл.
- `npm.cmd run build` прошёл успешно, включая новые routes `/reset-password`, `/verify-email`, `/certificates/verify/[verificationCode]` и `/api/v1/certificates/verify/[verificationCode]`.

Риски:

- Email delivery остаётся scaffold: reset/verify tokens создаются, но production SMTP/provider ещё не подключён.
- Certificate template assets и финальный visual PDF остаются production-hardening.

Next steps:

- Подключить transactional email provider и шаблоны писем для reset/verify flows.
- Добавить public certificate verification smoke/e2e после подключения тестовой БД.

## 2026-05-07 — Добавлен agent-операционный слой документации

Автор/agent: Codex  
Тип изменения: documentation / AI operations  
Файлы/модули:

- `docs/implementation-plan.md`
- `docs/updates.md`
- `ai/roles/*`
- `skills/**/*/SKILL.md`

Summary:

- Создан план реализации проекта с доменным backlog, статусами и правилом обновления документации при каждом изменении.
- Создан журнал обновлений с шаблоном записи.
- Создана папка AI-ролей для распределения задач между специализированными агентами.
- Созданы переносимые skills для Codex и Antigravity в формате `SKILL.md`.

Проверки:

- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- Проверка `skills/**/*/SKILL.md` на наличие YAML frontmatter `name` и `description` прошла успешно.

Риски:

- Skills являются проектными инструкциями и не устанавливаются автоматически в глобальные каталоги Codex/Antigravity.
- При изменениях проекта агенты должны дисциплинированно обновлять этот журнал вручную.

Next steps:

- При следующем runtime/code изменении обновить эту запись или добавить новую сверху.
- Если skills начнут использоваться в конкретном IDE, при необходимости добавить symlink/copy instructions под выбранный toolchain.

## 2026-05-07 — Bootstrap проекта LMS

Автор/agent: Codex  
Тип изменения: repository bootstrap / architecture / runtime scaffold  
Файлы/модули:

- `app/`, `components/`, `server/`, `lib/`, `prisma/`, `tests/`
- `docs/`, `infra/`, `services/`, `.github/workflows/ci.yml`
- `Dockerfile`, `docker-compose.yml`, `.env.example`, `package.json`

Summary:

- Создан runnable Next.js modular monolith для закрытой LMS AI Strategic Academy.
- Добавлены REST endpoints, GraphQL schema scaffold, Prisma schema, seed data, tests, Docker/Compose/K8s/CI templates.
- Добавлены роли academy-ru-closed: admin, instructor, student, curator, super_curator, customer_observer.

Проверки:

- `npm.cmd run db:generate` прошёл успешно.
- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- `npm.cmd run test` прошёл успешно: 8 test files, 11 tests.
- `npm.cmd run build` прошёл успешно.

Риски:

- `.npmrc` использует `legacy-peer-deps=true`, потому что NextAuth stable `4.24.x` не объявляет peer support для Next `16`.
- Docker runtime не проверен локально из-за отсутствия Docker CLI.
- Production email, push, backup, storage upload signing и advanced reporting остаются в `docs/todo.md`.

Next steps:

- Подключить реальную PostgreSQL среду и выполнить миграции/seed.
- Пройти auth flow end-to-end на dev server.
- Начать MVP hardening по `docs/implementation-plan.md`.

## Шаблон записи

```markdown
## YYYY-MM-DD — Краткое название изменения

Автор/agent:
Тип изменения:
Файлы/модули:

- `path/or/module`

Summary:

- Что изменилось.

Проверки:

- Какая команда или ручной сценарий выполнены.

Риски:

- Что может сломаться или требует внимания.

Next steps:

- Что сделать дальше.
```
