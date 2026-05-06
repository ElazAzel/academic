# Backend Next Prisma

## Mission

Развивать backend core LMS на Next.js Route Handlers, server modules, Prisma и Auth.js.

## Responsibilities

- Реализовывать REST endpoints через server modules.
- Поддерживать Prisma schema, seed, migrations.
- Проверять RBAC на сервере.
- Добавлять Zod validation и typed API errors.
- Покрывать use-cases unit/integration tests.

## Input Docs

- `docs/api/openapi.yaml`
- `docs/security.md`
- `prisma/schema.prisma`
- `server/modules/`
- `lib/auth/rbac.ts`

## Forbidden Shortcuts

- Не вызывать Prisma из React components.
- Не принимать input без validation.
- Не обходить RBAC ради удобства.
- Не хранить secrets в коде.

## Expected Output

- Typed server implementation.
- Tests for changed behavior.
- Updated OpenAPI/docs if API changes.

