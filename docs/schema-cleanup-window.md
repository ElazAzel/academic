# M-PR-10 Schema Cleanup Window

## Scope

M-PR-10 covers only the planned cleanup of string statuses into Prisma/PostgreSQL enums:

- `users.status` -> `UserAccountStatus`
- `lesson_questions.status` -> `QuestionStatus`

It must not be mixed with UX work, feature work, broad schema redesign, or performance indexes.

## Current Repository State

Repository schema is already enum-based:

- `prisma/schema.prisma` defines `UserAccountStatus` with `ACTIVE`, `INACTIVE`, `BLOCKED`, `DELETED`.
- `prisma/schema.prisma` defines `QuestionStatus` with `OPEN`, `ANSWERED`, `FORWARDED`, `CLOSED`.
- `prisma/migrations/20260514000000_migrate_status_enums/migration.sql` creates both enum types and normalizes legacy text values while changing column types.
- Runtime code uses Prisma enum constants for `LessonQuestion.status` queries and mutations.

## Production Preflight Finding

Read-only preflight command:

```bash
npx tsx scripts/schema-cleanup-preflight.ts
```

Observed on the connected database during M-PR-10 implementation:

- `lesson_questions.status` is already `USER-DEFINED` with `udt_name = QuestionStatus`.
- `users.status` is already `USER-DEFINED` with `udt_name = UserAccountStatus`.
- Existing status values are normalized:
  - `users`: `active`
  - `lesson_questions`: `answered`, `open`
- `_prisma_migrations` is absent.

This means the production database appears to have the target enum shape, but Prisma migration history is not recorded. Do not run `prisma migrate deploy` blindly against this database, because Prisma may try to apply old baseline migrations to already-existing tables.

## Downtime Runbook

1. Announce a short maintenance window and stop write traffic.
2. Create a verified database backup before any migration-history or schema action.
3. Record the exact deployed commit, environment, and database URL alias.
4. Run:

```bash
npm run db:generate
npx prisma validate
npx prisma migrate status
npx tsx scripts/schema-cleanup-preflight.ts
```

5. If preflight shows `users.status` or `lesson_questions.status` are still `text`/`varchar`:
   - confirm status distributions contain only expected legacy values;
   - confirm `_prisma_migrations` contains the previous migrations;
   - run `npx prisma migrate deploy`;
   - rerun preflight.

6. If preflight shows enum columns but `_prisma_migrations` is absent or incomplete:
   - do not run `migrate deploy`;
   - run a schema diff against the deployed schema and stop if unexpected drift appears;
   - mark already-applied migrations as applied in Prisma history, one by one:

```bash
npx prisma migrate resolve --applied 20260507000000_init
npx prisma migrate resolve --applied 20260512000000_add_block_model
npx prisma migrate resolve --applied 20260513000000_add_profile_fields
npx prisma migrate resolve --applied 20260513000000_complete_schema
npx prisma migrate resolve --applied 20260514000000_migrate_status_enums
npx prisma migrate resolve --applied 20260516000000_chat_popups_learning_paths
```

7. Rerun:

```bash
npx prisma migrate status
npx tsx scripts/schema-cleanup-preflight.ts
```

8. Deploy the app build after migration status is clean.
9. Run smoke checks:
   - admin user list renders and account status badges are correct;
   - inactive/blocked/deleted users cannot authenticate;
   - student can ask a lesson question;
   - curator can answer a question;
   - curator can forward a question to instructor;
   - instructor can answer a forwarded question;
   - reports and super-curator queues still show open/forwarded/answered questions.

## Rollback

Primary rollback is restore from the verified backup created at the start of the window.

If the application deploy fails but the enum schema is valid, redeploy the previous application build first; the enum labels are the same logical string values. If data or schema drift is detected, restore the backup and rerun preflight before reopening write traffic.

Do not attempt an ad-hoc enum-to-string rollback in production without a tested SQL script and a fresh backup.

## Acceptance

- `User.status` and `LessonQuestion.status` are enum-backed in Prisma schema.
- Production preflight shows both columns as PostgreSQL enum types.
- Migration history is reconciled before future `prisma migrate deploy` runs.
- Auth, user status, question ask/answer/forward, curator queues, instructor forwarded questions, and reports smoke checks pass.
- Rollback path is backup-based and documented.
