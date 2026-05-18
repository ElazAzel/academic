# Release Verification Runbook

Date: 2026-05-18

This runbook is the release gate for AI Strategic Academy. A release is not green until the full command succeeds on a prepared environment.

## Command

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

## Required Environment

- `DATABASE_URL` points to the release/staging database.
- Migrations are applied with `npm run db:migrate`.
- Test users exist via `npm run users:create`.
- Demo credentials are verified via `npm run users:check-demo`.
- Demo learning data exists via `npm run course:create-demo`.
- Required auth, storage, SMTP, and app URL env vars are configured.
- Playwright browsers are installed for the runner.

## E2E Scope

The release E2E gate must cover:

- public pages and closed registration;
- login smoke for admin, instructor, student, curator, super curator, customer observer;
- role boundary redirects to `/403` or `/login`;
- student dashboard, my courses, and settings smoke.

If E2E cannot run locally because the database or browser runtime is unavailable, the static gate may still be run with `npm run verify`, but the release remains blocked until `npm run verify:release` passes in staging.

## Rollback Rule

For schema or access-control changes, prepare a database backup before release. If the release fails smoke checks after deploy, roll back the app version first; roll back database changes only from the matching backup/runbook for that migration.
