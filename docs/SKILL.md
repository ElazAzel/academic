---
name: Strategic Academy LMS
description: AI Strategic Academy — закрытая LMS для управления курсами, потоками, кураторами, прогрессом, сертификатами и отчётностью. Next.js 16 modular monolith, Prisma/PostgreSQL 17, Auth.js 4, shadcn/ui, Tailwind.
---

# Strategic Academy LMS

## Project Overview
Закрытая LMS одной академии. Реализация: Next.js modular monolith с REST API, Prisma/PostgreSQL и русским интерфейсом.

## Tech Stack
- **Framework:** Next.js 16 App Router, `proxy.ts` middleware
- **Database:** PostgreSQL 17 + Prisma ORM 7.8, Supabase hosting
- **Auth:** Auth.js 4 (Credentials + OAuth), Argon2id
- **UI:** Tailwind CSS, shadcn/ui, lucide-react
- **Testing:** Vitest (unit), Playwright (E2E)
- **Validation:** Zod (all server actions)
- **State:** React hooks, no external state library
- **Styling:** Tailwind utility classes, CSS variables for theming

## Key Conventions
- **Russian-only UI** (no English user-facing strings)
- **TypeScript strict mode** (strict: true)
- **Server Actions** in `server/actions/` with Zod validation
- **Business logic** in `server/modules/`
- **Prisma** as sole DB access layer (RLS disabled)
- **Functional** patterns over classes
- **Loading states** via `loading.tsx` per route dir
- **Metadata** via `export const metadata` per page

## Roles
- **admin**: Full access, settings, audit, roles
- **super_curator**: Curator distribution, cohort risks
- **curator**: Assignment review, questions, risks
- **instructor**: Course/lesson/quiz/assignment management
- **student**: Learning, progress, tests, certificates
- **customer_observer**: Read-only project/cohort reports

## Architecture
```
app/               # Next.js App Router pages
  api/             # Route Handlers (REST)
components/        # React components (client)
lib/               # Shared utilities, auth, prisma client
prisma/            # Schema, migrations, seed
server/
  actions/         # Server Actions (Zod-validated)
  modules/         # Business logic services
```

## Key Code Quality Rules
- Functional & modular code, minimal comments
- Prefer declarative over imperative
- Proper type system usage
- No English strings in user-facing code
- All server actions must have Zod validation
- All routes must have loading.tsx and metadata
