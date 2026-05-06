# Security

## Security Model

- Authentication is handled by Auth.js plus explicit email/password registration.
- Passwords are hashed with Argon2id. Plain passwords are never stored or logged.
- RBAC is enforced server-side through `requirePermission` before privileged mutations.
- Database access stays inside repositories/services, not UI components.
- Stripe webhooks are verified with `STRIPE_WEBHOOK_SECRET`.
- Secrets live only in environment variables. `.env` is ignored and `.env.example` contains placeholders.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Tenant/role data leakage | Server-side permission checks, Prisma query scoping, audit logs |
| Password compromise | Argon2id hashing, reset tokens, no plaintext logs |
| OAuth secret leakage | Env-only secret handling, no committed keys |
| CSRF on cookie flows | Auth.js CSRF for auth routes, server-side mutation validation |
| XSS through lesson content | Store structured JSON blocks, sanitize/render through controlled components |
| Stripe spoofing | Signature verification before payment reconciliation |
| Overbroad admin actions | Audit logs for privileged actions |
| PII over-retention | Consent log, export/delete documentation, configurable retention policy |
| Abuse of public endpoints | Rate-limit scaffold, validation, audit trail |

## Checklist

- Auth: email verification, reset flow, OAuth examples, secure session cookies.
- API: Zod validation, consistent error responses, RBAC checks, no direct Prisma from UI.
- Billing: verified webhook, idempotent payment records, access reconciliation.
- Privacy: consent log, privacy/terms pages, data export-ready report layer.
- Observability: health endpoints, structured audit events, monitoring placeholders.
- Deployment: Docker/K8s secret templates, no real secrets committed.

