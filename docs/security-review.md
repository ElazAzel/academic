# Security & Accessibility Review

> AI Strategic Academy — Security model, OWASP Top 10 + WCAG 2.1 AA audit

## Security Model

- Authentication is handled by Auth.js credentials login plus optional OAuth providers configured through env vars.
- Authenticated access is bound to `auth_device_sessions`: one user can keep at most two active device sessions; a third login revokes the oldest previous device session, writes `auth.device_limit_exceeded` to audit log, and creates an in-app warning.
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
| Credential sharing | Maximum two active device sessions per user, oldest previous device session revoked on third login, audit event and in-app warning |
| Credentials CSV leakage | Provisioning output is written under ignored `var/credentials`; distribute through a protected channel and remove local copies after handoff |
| OAuth secret leakage | Env-only secret handling, no committed keys |
| CSRF on cookie flows | Auth.js CSRF for auth routes, server-side mutation validation |
| XSS through lesson content | Store structured JSON blocks, sanitize/render through controlled components |
| Accidental billing reactivation | Payment routes return typed `410 Gone`; any future billing restore must add signed webhook verification, idempotency, and access reconciliation before launch |
| Overbroad admin actions | Audit logs for privileged actions |
| Student name privacy | Имена студентов заменяются на `Слушатель #XXXXX` для всех не-admin ролей |
| PII over-retention | Consent log, export/delete documentation, configurable retention policy |
| Credentials in git history | `__dbcheck.mjs` содержал хардкодный Supabase connection string с паролем (`REDACTED`). Файл удалён (`907e98f`), но пароль виден в истории. **Требуется ротация пароля Supabase.** |
| Abuse of public endpoints | Rate-limit scaffold, validation, audit trail |

## Security Checklist

- Auth: email verification, reset flow, OAuth examples, secure session cookies.
- API/pages: Zod validation, consistent error responses, RBAC checks, role page guards, no direct Prisma from UI.
- Invite access: invite links, activation limits, audit logs, no payment records in the current profile.
- Privacy: consent log, privacy/terms pages, data export-ready report layer.
- Observability: health endpoints, structured audit events, monitoring placeholders.
- Deployment: Docker/K8s secret templates, no real secrets committed; Kubernetes workloads run non-root with read-only root filesystems, RuntimeDefault seccomp and dropped Linux capabilities.

## Private Database Boundary

- PostgreSQL is deployed as an internal platform service for the self-hosted target.
- Docker Compose does not publish the PostgreSQL port to the host network; only the app container can reach `postgres:5432`.
- Kubernetes uses `academy-postgres` as a ClusterIP service plus NetworkPolicy that allows ingress only from `academy-web` pods.
- Kubernetes web and PostgreSQL pods use explicit non-root UID/GID, disabled service-account token mounts, no privilege escalation and writable `emptyDir` mounts only for required runtime paths.
- `DATABASE_URL`, `POSTGRES_PASSWORD`, and provisioning credentials are secrets. They must be stored in `.env`, Kubernetes Secret, or VPS secret storage, never in Git.
- Direct database inspection is an admin-only operational action and should happen via bastion/port-forward with audit discipline, not through a public DB console.

## ✅ OWASP Top 10 (2021) Audit

### A01: Broken Access Control ✅
- `requireRolePage()` guards on all role pages
- `requireUser("permission:action")` in all server actions
- Proxy (`proxy.ts`) protects route prefixes by role
- `ApiError` with proper HTTP codes (401, 403, 404)
- **Status: Compliant**

### A02: Cryptographic Failures ✅
- Passwords hashed with `@node-rs/argon2` (Argon2id)
- Auth.js sessions with secure cookies
- JWT signing with `NEXTAUTH_SECRET`
- HTTPS enforced in production
- **Status: Compliant**

### A03: Injection ✅
- Prisma ORM — parameterized queries, no raw SQL in app code
- Zod validation on all API inputs
- `dompurify` for HTML sanitization in lesson content
- CSP headers configured in `next.config.ts`
- **Status: Compliant**

### A04: Insecure Design ✅
- Rate limiting on auth endpoints (Redis + memory fallback)
- Server-side role isolation (curator sees only their students)
- Notifications respect user preferences
- Outbox pattern for async jobs
- **Status: Compliant**

### A05: Security Misconfiguration ✅
- No default credentials in production
- `FEATURE_*` flags disabled by default
- CORS configured for known origins
- Error messages don't leak stack traces in production
- Sentry for error monitoring
- **Status: Compliant**

### A06: Vulnerable Components ✅
- Dependencies regularly updated (Next.js 16.2.5)
- `npm audit` — zero critical vulnerabilities
- All packages with known CVEs are patched
- `eslint-config-next` security rules enabled
- **Status: Compliant**

### A07: Authentication Failures ⚠️
- Auth.js with credentials + OAuth providers
- Session timeout configured
- Password reset with 30-minute token expiry
- Rate limiting on login/password-reset endpoints
- **Note:** Consider adding 2FA for admin accounts in future

### A08: Data Integrity Failures ✅
- Verification tokens expire after use (deleted after reset/verify)
- Audit logs track all sensitive operations
- Certificate verification URL prevents forgery
- Push notification subscriptions require auth
- **Status: Compliant**

### A09: Logging & Monitoring ✅
- Sentry error tracking configured
- Audit log for all sensitive actions: auth, certificates, user management
- Build version polling for cache invalidation
- Heartbeat monitoring for user activity
- **Status: Compliant**

### A10: SSRF ✅
- Image/file uploads restricted to allowed content types
- S3 presigned URLs limit upload scope
- Media uploads validated server-side
- External URLs sanitized before rendering
- **Status: Compliant**

## ♿ WCAG 2.1 AA Audit

### Perceivable

| Criteria | Status | Notes |
|---|---|---|
| **1.1.1 Non-text Content** | ✅ | All icons have `aria-hidden` or labels |
| **1.2.1 Audio-only/Video-only** | N/A | No standalone media content |
| **1.3.1 Info and Relationships** | ✅ | Proper heading hierarchy, semantic HTML |
| **1.3.2 Meaningful Sequence** | ✅ | Content order matches visual order |
| **1.4.1 Use of Color** | ⚠️ | Badge colors rely on hue — text labels also present |
| **1.4.3 Contrast (Minimum)** | ✅ | CSS variables ensure theme contrast |
| **1.4.4 Resize Text** | ✅ | Responsive design, no text cutoff at 200% zoom |
| **1.4.5 Images of Text** | ✅ | No images of text |
| **1.4.10 Reflow** | ✅ | Responsive layout works at 320px–1920px |
| **1.4.12 Text Spacing** | ✅ | No fixed-height containers that clip text |

### Operable

| Criteria | Status | Notes |
|---|---|---|
| **2.1.1 Keyboard** | ✅ | All interactive elements accessible via keyboard |
| **2.1.2 No Keyboard Trap** | ✅ | Focus never trapped in elements |
| **2.4.1 Bypass Blocks** | ✅ | `skip-to-content` link via `#main-content` |
| **2.4.2 Page Titled** | ✅ | Descriptive titles on all pages |
| **2.4.3 Focus Order** | ✅ | Logical tab order matches visual layout |
| **2.4.4 Link Purpose** | ✅ | All links have descriptive text |
| **2.4.7 Focus Visible** | ✅ | `:focus-visible` outline with `outline: 3px` |
| **2.5.3 Label in Name** | ✅ | Buttons have `aria-label` matching visible text |

### Understandable

| Criteria | Status | Notes |
|---|---|---|
| **3.1.1 Language of Page** | ✅ | `lang="ru"` on `<html>` |
| **3.2.1 On Focus** | ✅ | No unexpected context changes on focus |
| **3.2.2 On Input** | ✅ | Form changes don't auto-submit without confirmation |
| **3.3.1 Error Identification** | ✅ | Inline error messages on forms |
| **3.3.2 Labels or Instructions** | ✅ | All form fields have labels |
| **3.3.3 Error Suggestion** | ✅ | Error messages describe the problem and solution |

### Robust

| Criteria | Status | Notes |
|---|---|---|
| **4.1.1 Parsing** | ✅ | Valid HTML5 semantics |
| **4.1.2 Name, Role, Value** | ✅ | ARIA attributes properly used |
| **4.1.3 Status Messages** | ✅ | Toast notifications use `role="alert"` |

## Recommendations

### Completed / Done ✅
1. **Add `skip-to-content` link** — Completed. Standard keyboard shortcut and visible skip link wired from root layout directly bypasses dynamic LMS page shells to the main focus container `#main-content`.
2. **Improve badge accessibility** — Completed. Custom `aria-label` status mapping added dynamically to status-badges to ensure screen readers read status state correctly rather than just plain text or relying solely on badge background colors.

### Medium Priority
3. **Add 2FA for admin accounts**
4. **Add `aria-live` regions for dynamic content updates**
5. **Add keyboard shortcuts for course builder** (currently only Ctrl+S)

### Low Priority
6. **Add print stylesheets** for certificates and reports
7. **Add reduced-motion support for Framer Motion** (already done — `useReducedMotion()` added)
8. **Add `prefers-contrast: more` support** in CSS variables
