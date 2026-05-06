---
name: lms-implementation
description: Implement AI Strategic Academy features in Codex using Next.js, Prisma, REST Route Handlers, server modules, strict TypeScript, and project documentation updates. Use when adding or changing LMS runtime code.
---

# LMS Implementation

## Goal

Ship small, typed, production-oriented LMS changes without breaking Clean Architecture boundaries.

## Workflow

1. Read `docs/implementation-plan.md`, `docs/specification.md`, and relevant server/UI files.
2. Put business logic in `server/modules/*`.
3. Keep Route Handlers thin under `app/api/v1/*`.
4. Use Prisma only in repositories/services, not React components.
5. Validate input with Zod and enforce RBAC server-side.
6. Add or update tests for changed behavior.
7. Run `npm.cmd run lint`, `npm.cmd run typecheck`, and relevant tests.
8. Update `docs/updates.md`; update `docs/implementation-plan.md` if status changed.

## Guardrails

- Do not commit secrets or real provider keys.
- Do not weaken auth, consent, audit, or payment verification.
- Do not introduce `any` unless there is a documented unavoidable reason.
- Do not replace REST implementation with GraphQL; GraphQL is scaffolded only.

## Output Checklist

- Files changed are scoped.
- API/schema/docs are synchronized.
- Checks are reported.
- Remaining TODOs are explicit.

