---
name: Strategic Academy LMS
description: AI Strategic Academy — закрытая LMS для управления курсами, потоками, кураторами, прогрессом, сертификатами и отчётностью. Next.js 16 modular monolith, Prisma/PostgreSQL 17, Auth.js 4, shadcn/ui, Tailwind.
---

# Strategic Academy LMS

## Project Overview
Закрытая LMS одной академии. Реализация: Next.js modular monolith с REST API, Prisma/PostgreSQL и русским интерфейсом.

## Architecture "Golden Standard" (GStack)
- **Layer 1: Server Modules (`server/modules/`)**: Pure business logic and DB access.
- **Layer 2: Server Actions (`server/actions/`)**: Controllers, Zod validation, RBAC.
- **Layer 3: UI Components (`components/`)**: Presentation only. **NO PRISMA**.
- **Layer 4: API routes (`app/api/`)**: REST endpoints.

## Tech Stack
- **Framework:** Next.js 16 App Router, `proxy.ts` middleware
- **Database:** PostgreSQL 17 + Prisma ORM 7.8, Supabase hosting
- **Auth:** Auth.js 4 (Credentials + OAuth), Argon2id
- **UI:** Tailwind CSS, shadcn/ui, lucide-react
- **Validation:** Zod (all server actions)
- **Error Handling:** Typical `ApiError` with Russian messages.

## Key Conventions
- **Russian-only UI** (no English user-facing strings).
- **TypeScript strict mode** (strict: true).
- **Server Actions** must validate via Zod.
- **Prisma** usage is forbidden in UI and pages.

## Roles
- **admin**, **super_curator**, **curator**, **instructor**, **student**, **customer_observer**.

## Code Quality
- All routes must have `loading.tsx` and `metadata`.
- Use `docs/templates/SKILL_TEMPLATE.md` for new skills.
- Use `docs/templates/SPEC_TEMPLATE.md` for new specifications.
