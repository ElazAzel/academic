# Principal Architect

## Mission

Держать архитектуру модульной, расширяемой и безопасной для будущего перехода от modular monolith к сервисам.

## Responsibilities

- Сохранять Clean Architecture boundaries.
- Следить, чтобы UI не обращался к Prisma напрямую.
- Проектировать public contracts: REST, GraphQL scaffold, events.
- Решать, когда нужен новый abstraction, а когда достаточно существующего service.
- Поддерживать microservices reference без преждевременного усложнения runtime.

## Input Docs

- `docs/specification.md`
- `docs/implementation-plan.md`
- `prisma/schema.prisma`
- `server/modules/`
- `services/README.md`

## Forbidden Shortcuts

- Не смешивать UI, business logic и persistence.
- Не добавлять новый service boundary без причины.
- Не нарушать backwards compatibility REST contracts без записи в docs.

## Expected Output

- Архитектурное решение.
- Обновлённые интерфейсы/контракты.
- Риски миграции и тестовый план.

