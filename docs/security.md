# Security

## Security Model

- Authentication is handled by Auth.js credentials login plus optional OAuth providers configured through env vars.
- Public self-registration is disabled; academy operators provision issued credentials through `scripts/provision-users.ts`.
- Passwords are hashed with Argon2id. Plain passwords are never stored or logged.
- RBAC is enforced server-side through `requirePermission` before privileged mutations.
- Role dashboards are protected server-side through `requireRolePage`; private route prefixes are also gated by middleware.
- Database access stays inside repositories/services, not UI components.
- The current academy profile is invite-only: payment checkout and Stripe webhook routes are explicit `410 Gone` compatibility endpoints.
- Secrets live only in environment variables. `.env` is ignored and `.env.example` contains placeholders.
- ⚠️ **Инцидент:** `__dbcheck.mjs` (добавлен `0e20419`, удалён `907e98f`) содержал хардкодный Supabase password. Пароль скомпрометирован в git history. Рекомендуется ротация.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Tenant/role data leakage | Server-side permission checks, Prisma query scoping, audit logs |
| Unauthorized page access | `requireRolePage` on role dashboards, `/403` redirects, middleware auth gate for private prefixes |
| Password compromise | Argon2id hashing, reset tokens, no plaintext logs |
| Credentials CSV leakage | Provisioning output is written under ignored `var/credentials`; distribute through a protected channel and remove local copies after handoff |
| OAuth secret leakage | Env-only secret handling, no committed keys |
| CSRF on cookie flows | Auth.js CSRF for auth routes, server-side mutation validation |
| XSS through lesson content | Store structured JSON blocks, sanitize/render through controlled components |
| Accidental billing reactivation | Payment routes return typed `410 Gone`; any future billing restore must add signed webhook verification, idempotency, and access reconciliation before launch |
| Overbroad admin actions | Audit logs for privileged actions |
| PII over-retention | Consent log, export/delete documentation, configurable retention policy |
| Credentials in git history | `__dbcheck.mjs` содержал хардкодный Supabase connection string с паролем (`NFM3KJJzS2DxmIg6`). Файл удалён (`907e98f`), но пароль виден в истории. **Требуется ротация пароля Supabase.** |
| Abuse of public endpoints | Rate-limit scaffold, validation, audit trail |

## Checklist

- Auth: email verification, reset flow, OAuth examples, secure session cookies.
- API/pages: Zod validation, consistent error responses, RBAC checks, role page guards, no direct Prisma from UI.
- Invite access: invite links, activation limits, audit logs, no payment records in the current profile.
- Privacy: consent log, privacy/terms pages, data export-ready report layer.
- Observability: health endpoints, structured audit events, monitoring placeholders.
- Deployment: Docker/K8s secret templates, no real secrets committed.

# Private Database Boundary

- PostgreSQL is deployed as an internal platform service for the self-hosted target.
- Docker Compose does not publish the PostgreSQL port to the host network; only the app container can reach `postgres:5432`.
- Kubernetes uses `academy-postgres` as a ClusterIP service plus NetworkPolicy that allows ingress only from `academy-web` pods.
- `DATABASE_URL`, `POSTGRES_PASSWORD`, and provisioning credentials are secrets. They must be stored in `.env`, Kubernetes Secret, or VPS secret storage, never in Git.
- Direct database inspection is an admin-only operational action and should happen via bastion/port-forward with audit discipline, not through a public DB console.
