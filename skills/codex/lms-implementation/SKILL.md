---
name: lms-implementation
description: Implement AI Strategic Academy features in Codex using Next.js, Prisma, REST Route Handlers, server modules, strict TypeScript, and project documentation updates. Use when adding or changing LMS runtime code.
---

# LMS Implementation

## Prerequisites
- [ ] Access to the codebase and development environment.
- [ ] Understanding of the Modular Monolith architecture.

## Context
Used for shipping small, typed, production-oriented LMS changes without breaking Clean Architecture boundaries.

## Definitions
- **Modular Monolith**: Architecture where business logic is separated into independent modules within a single codebase.
- **Server Modules**: Files in `server/modules/*` where core business logic resides.

## Logic (The "Claw")
1. Read `docs/implementation-plan.md`, `docs/specification.md`, and relevant server/UI files.
2. Implement business logic strictly in `server/modules/*`.
3. Ensure Route Handlers under `app/api/v1/*` remain thin.
4. Validate input with Zod and enforce RBAC server-side.
5. Add or update tests for changed behavior.

### Instructional Hints (Claws)
> **HINT:** Do NOT use Prisma Client in `app/**/page.tsx` or components. Use Services instead.
> **HINT:** Always use `ApiError` for typed exceptions in Server Actions.
> **HINT:** Do NOT introduce `any` without a documented reason.

## Post-conditions
- [ ] Business logic is isolated in server modules.
- [ ] API, schema, and documentation are synchronized.
- [ ] Tests for the new behavior are passing.

## Validation steps
1. Run `npm run verify`.
2. Check `docs/updates.md` for an update record.
3. Verify that the architecture boundary scan passes (no Prisma in UI).
