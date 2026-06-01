# AGENTS.md — AI Strategic Academy

## Commands

| Command | What it does | Caveat |
| --- | --- | --- |
| `npm run dev` | Starts Docker Postgres then `next dev` | Requires Docker running |
| `npm run test` | Vitest (node env, not jsdom) | Tests in `tests/**/*.test.{ts,tsx}` |
| `npm run test:e2e` | Guarded Playwright (Chromium + Pixel 7) | Needs seeded local/disposable DB; refuses remote DB unless `ALLOW_REMOTE_DATABASE_MUTATION=true` |
| `npm run test:watch` | Vitest watch mode | — |
| `npm run typecheck` | `tsc --noEmit` | — |
| `npm run build` | `clean-next-dev-types.mjs` → `prisma generate` → `next build` | Build order matters |
| `npm run verify` | lint → typecheck → test → build | Use before claiming green |
| `npm run verify:release` | Full gate + E2E | Needs staging env |
| `npm run lint` | ESLint (flat config) | Add `-- --max-warnings=0` to fail on warnings |
| `npm run db:seed` | Guarded — refuses remote DB host | Set `ALLOW_REMOTE_DATABASE_MUTATION=true` for remote |
| `npm run db:push` | Same remote guard as seed | — |
| `npm run users:provision` | Bulk create 4000 students, 50 curators, etc | Output in `var/credentials/` (gitignored) |

## Architecture

- **Next.js 16 App Router**, middleware in root `proxy.ts` (not in `src/`)
- **Prisma 7 + PostgreSQL 17** on Supabase, RLS disabled
- **Auth.js 4** credentials login, Argon2id hashing, self-registration disabled
- **shadcn/ui** + Tailwind CSS, M3 design tokens in tailwind.config.ts
- **Russian-only UI** — no English user-facing strings
- All server actions (`server/actions/`) must have Zod validation
- All route directories need `loading.tsx` and `metadata` export
- RBAC: `requirePermission()` / `requireRolePage()` in all server code
- Prisma Client is forbidden in `app/**/page.tsx` and `components/**`; page data
  belongs in `server/modules/**` or Server Actions. The guard lives in
  `tests/unit/release-hardening-readiness.test.ts`.

## Project structure

```text
app/            — App Router pages + API route handlers
server/actions/ — Server Actions (Zod)
server/modules/ — Business logic services
components/     — React components
lib/            — Prisma client, auth, utilities
prisma/         — Schema, migrations, seed.ts
proxy.ts        — Next.js middleware (route guard, CSRF, rate limit)
```

## Key quirks

- `services/` excluded from `tsconfig.json` — not compiled
- Sentry wraps `next.config.ts` via `withSentryConfig`
- VAPID keys must be in **both** `VAPID_PUBLIC_KEY` (server) and
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client) — same value
- CSP uses per-request nonce-based `script-src`; keep `'unsafe-inline'` only in
  `style-src`
- `var/` dir is gitignored (credentials output, temp files)
- `__dbcheck.mjs` in git history contained hardcoded Supabase password — do not
  commit secrets
- `docker-compose.yml` does **not** publish PostgreSQL port to host

## Docs (loaded by opencode.json)

- `AI.md` — project guide, conventions, roles
- `docs/SKILL.md` — tech stack, architecture, code quality rules
- `ai/roles/README.md` — agent role definitions
- `docs/updates.md` — changelog (update after each change)
- `docs/implementation-plan.md` — current status
- `docs/release.md` — release plan + verification runbook
- `docs/security-review.md` — security model + OWASP/WCAG audit
- `docs/ai-agent-instructions.md` — **AI Agent System Instructions** (must be
  updated after implementing major architectural or product features)

## Test quirks

- Vitest: `environment: "node"` (NOT jsdom — but jsdom is available as dev dep)
- Setup: `tests/setup.ts` imports `@testing-library/jest-dom/vitest`
- Playwright: `webServer` runs `npm run dev`, reuses existing server locally
- E2E requires seeded database and seeded test users; the command is guarded
  because the suite mutates seeded data
- Checking `tests/security-privacy.test.ts` for negative-path patterns
- Do not use Playwright `networkidle`; SSE keeps the network active, so use
  explicit locators after `domcontentloaded`.
