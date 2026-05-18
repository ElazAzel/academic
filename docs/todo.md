# TODO

## Production Hardening

- [done] SMTP env vars validated in Zod schema (`lib/env.ts`); transporter uses validated env.
- [done] S3 presigned upload URL endpoint at `app/api/v1/media/uploads/route.ts`.
- [done] Push notification provider scaffold (`server/modules/notifications/push.ts`).
- [done] Sentry monitoring config (`sentry.*.config.ts`, `instrumentation.ts`, `next.config.ts`).
- [done] Curator/instructor settings pages implemented (profile, notifications, security tabs).
- [done] Admin analytics "По пользователям" tab with role distribution chart.
- [done] Instructor analytics "По тестам" tab with per-quiz avg score breakdown.
- [done] Build fixed (eslint-config-next @15.5.18, FlatCompat restored).
- [done] Seed/auth bootstrap unlocked (SEED_ADMIN_TOKEN, deterministic password).
- [done] Notifications channel filtering fixed (default in_app no longer triggers email).
- [done] Progress calculation uses `isRequired` lessons when present, falls back to all.
- [done] Assignment submission checks active enrollment & resolves courseId from lesson.module.
- [done] Quiz submission resolves courseId from lesson, errors on progress sync no longer swallowed.
- [done] Student lesson view: YouTube URL normalization, toast error handling for questions.
- [done] Reports API scoped per-role (admin, curator, super_curator, instructor, customer_observer).
- [done] S3 production config documented (`infra/s3-config.md`).
- [done] Push provider wired (firebase-admin installed, subscribe API, PWA subscribe, send in service).
- [done] Backup/restore runbook + autobackup script (`infra/backup/`).
- [done] Certificate production assets created (`public/assets/certificates/` with SVG border, seal, signature).
- [done] Rate limiting expanded to quiz attempts and push subscribe.
- [done] Forgot password flow: no email, creates admin notification instead.
- [done] OWASP/WCAG security review (`docs/security-review.md`).

## Learning Features

- Add SCORM/xAPI/cmi5 import and launch support after MVP.
- Add advanced video hosting, subtitles workflow, attendance analytics, and private livestream chat persistence.
- Add Excel import preview UI and background job processing for very large cohorts.
- Add advanced report designer and scheduled export delivery.

## Microservices

- Expand reference services in `services/*` into independent deployables if the monolith reaches scaling pressure.
- Add outbox/inbox tables and message broker contracts before extracting invite access, notification, or analytics services.
- If Stripe/billing returns later, design it as a separate ADR with signed webhooks, idempotent reconciliation, tests, docs, and feature-flagged rollout.

## Self-hosted DB hardening

- Add a tested backup/restore runbook for `academy-postgres`.
- Add scheduled encrypted database backups with retention policy.
- Document admin-only database access through bastion or Kubernetes port-forward.
- Add restore rehearsal checklist before production cohort launch.

## Done (2026-05-18)

- [done] k6 load test script created (`tests/load/smoke-test.js`)
- [done] 4 test files fixed — all 304 tests pass (53/53 files)
- [done] FK indexes added for unindexed foreign keys
- [done] 55/55 Prisma models now have tables in production (applied `create_all_missing_tables_v2`)
- [done] `push_subscriptions`, `messages`, `admin_popups`, `outbox_events`, `learning_paths` + related tables exist
- [done] `consent_logs`, `lesson_progress`, `audit_logs`, `assignment_submissions`, `risk_flags`, `glossary_entries`, `certificate_templates` и ещё 22 таблицы созданы
- [done] RLS включён на всех 42 unprotected таблицах с default-deny политикой
- [done] `certificates.enrollment_id` + `verification_url` добавлены
- [done] 404 `/instructor/chat` — page created
- [done] 500 `POST /api/v1/push/subscribe` — таблица создана
