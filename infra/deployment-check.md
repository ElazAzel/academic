# Deployment Validation Checklist

> AI Strategic Academy — pre-flight checks for production deployment

## Environment Variables

Check all required env vars are set in the target environment:

### Required
- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` — Auth.js signing secret
- [ ] `NEXTAUTH_URL` — Public deployment URL
- [ ] `APP_URL` — Application public URL

### Optional but Recommended
- [ ] `FEATURE_EMAIL_NOTIFICATIONS=true` — Enable email sending
- [ ] `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` — SMTP credentials
- [ ] `EMAIL_FROM` — Sender email address
- [ ] `FEATURE_PUSH_NOTIFICATIONS` — Enable push notifications
- [ ] `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_PROJECT_ID` — Firebase credentials
- [ ] `REDIS_URL` — Redis for rate limiting
- [ ] `SENTRY_DSN` — Error monitoring
- [ ] `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET_NAME` — S3 uploads

## Build Verification

- [ ] `npm run lint` — 0 errors, 0 warnings
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run test` — all tests pass
- [ ] `npm run build` — successful
- [ ] Check bundle size: `next build` output shows no oversized chunks

## Database

- [ ] Prisma migrations applied: `npx prisma migrate deploy`
- [ ] Seed data verified: `npm run seed` (dev only)
- [ ] Backup configured: see `infra/backup/runbook.md`

## Application Smoke Tests

### Auth Flow
- [ ] Login page loads: `GET /login` → 200
- [ ] Credentials login works (admin user)
- [ ] Forgot password flow: submit email → token created
- [ ] Reset password: token → new password → login succeeds
- [ ] Protected routes redirect to login when unauthenticated

### Role Access
- [ ] Admin: `/admin` — loads dashboard
- [ ] Instructor: `/instructor` — loads dashboard
- [ ] Student: `/student` — loads dashboard
- [ ] Curator: `/curator` — loads dashboard
- [ ] Super Curator: `/super-curator` — loads dashboard
- [ ] Customer Observer: `/customer-observer` — loads dashboard
- [ ] 403 page works for unauthorized role access

### Core Features
- [ ] Course listing loads for instructor
- [ ] Course builder opens (modules, lessons)
- [ ] Student can view lesson content
- [ ] Quiz submission works and result displays
- [ ] Assignment submission with file upload works
- [ ] Certificate generates as valid PDF with Cyrillic text
- [ ] Reports download (CSV, XLSX, PDF) — all 3 formats

### PWA
- [ ] Service worker registered: `/sw.js` — 200
- [ ] Manifest: `/manifest.json` — valid JSON
- [ ] Offline page: `/offline` — loads without network

## Performance Checks

- [ ] Lighthouse score: Performance > 80
- [ ] Lighthouse score: Accessibility > 90
- [ ] First meaningful paint < 2s
- [ ] API response times < 500ms for common endpoints

## Monitoring

- [ ] Sentry error tracking configured and receiving events
- [ ] Build version endpoint returns version: `GET /api/v1/build-version`
- [ ] Heartbeat endpoint: `POST /api/v1/heartbeat`

## Rollback Plan

1. **Database rollback**: `pg_restore` from latest backup (see `infra/backup/runbook.md`)
2. **Application rollback**: Revert to previous deployment version
3. **DNS rollback**: Point traffic to previous server/container
4. **Verify**: Run smoke tests after rollback
