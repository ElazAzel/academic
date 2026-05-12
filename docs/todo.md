# TODO

## Production Hardening

- [done] SMTP env vars validated in Zod schema (`lib/env.ts`); transporter uses validated env.
- [done] S3 presigned upload URL endpoint at `app/api/v1/media/uploads/route.ts`.
- [done] Push notification provider scaffold (`server/modules/notifications/push.ts`).
- [done] Sentry monitoring config (`sentry.*.config.ts`, `instrumentation.ts`, `next.config.ts`).
- Add production S3 bucket configuration and test presigned upload flow.
- Wire push provider with Firebase Admin SDK or Telegram bot when credentials are available.
- Add production backup jobs and restore runbooks under `infra/backup/`.
- Add real PDF styling/signature assets for certificates in `public/assets/certificates/`.

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
