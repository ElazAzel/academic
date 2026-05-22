# Security & Accessibility Review

> AI Strategic Academy — OWASP Top 10 + WCAG 2.1 AA audit

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
