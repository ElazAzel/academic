# AI Strategic Academy — Project Guide

## Project Structure

- `ai/roles/` — AI role definitions (orchestrator, backend, frontend, etc.)
- `.agents/skills/supabase/` — Supabase skill (MCP, CLI, RLS, auth)
- `.agents/skills/supabase-postgres-best-practices/` — Postgres optimization rules
- `docs/` — Specification, implementation plan, updates, todo
- `server/actions/` — Server actions (Next.js server functions)
- `server/modules/` — Business logic modules
- `app/` — Next.js App Router pages
- `components/` — React components
- `lib/` — Shared utilities, auth, prisma client
- `prisma/` — Schema, migrations, seed

## Workflow

1. Read the relevant role from `ai/roles/` before starting a task
2. Read the system instructions in
   [ai-agent-instructions.md](file:///c:/Users/i.azelkhanov/Documents/Strategic%20Academy/docs/ai-agent-instructions.md)
   to understand current constraints
3. Check `docs/implementation-plan.md` for current status
4. Update `docs/updates.md` after each change
5. Update `docs/ai-agent-instructions.md` if any major architectural/product
   changes are made
6. Follow the role's input docs and forbidden shortcuts

## Key Conventions

- Russian-only UI (no English user-facing strings)
- Next.js 16 App Router, `proxy.ts` for middleware
- Prisma ORM with PostgreSQL on Supabase
- TypeScript strict mode, Zod validation
- Tests: Vitest (unit), Playwright (E2E)
- Roles: admin, super_curator, curator, instructor, student, customer_observer
