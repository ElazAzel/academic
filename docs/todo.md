# TODO

## Production Hardening

- Wire a real transactional email provider in `server/modules/notifications/service.ts` and keep MailHog only for local development.
- Add production S3 multipart upload signing in `app/api/v1/media/uploads/route.ts` before large media usage.
- Add push provider integration in `server/modules/notifications/push.ts`; current implementation stores in-app notifications and documents the event abstraction.
- Add Redis-backed distributed rate limiting in `lib/security/rate-limit.ts`; current scaffold keeps the interface and safe defaults.
- Add real PDF styling/signature assets for certificates in `server/modules/certificates/service.ts`.
- Add production backup jobs and restore runbooks under `infra/backup/`.

## Learning Features

- Add SCORM/xAPI/cmi5 import and launch support after MVP.
- Add advanced video hosting, subtitles workflow, attendance analytics, and private livestream chat persistence.
- Add Excel import preview UI and background job processing for very large cohorts.
- Add advanced report designer and scheduled export delivery.

## Microservices

- Expand reference services in `services/*` into independent deployables if the monolith reaches scaling pressure.
- Add outbox/inbox tables and message broker contracts before extracting invite access, notification, or analytics services.
- If Stripe/billing returns later, design it as a separate ADR with signed webhooks, idempotent reconciliation, tests, docs, and feature-flagged rollout.

<<<<<<< HEAD
# Self-hosted DB hardening
=======
## Self-hosted DB hardening
>>>>>>> e63fa65c366d6aebc4d97c18216ba9069a19a7c2

- Add a tested backup/restore runbook for `academy-postgres`.
- Add scheduled encrypted database backups with retention policy.
- Document admin-only database access through bastion or Kubernetes port-forward.
- Add restore rehearsal checklist before production cohort launch.
