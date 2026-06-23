# Phase 3 — Service Extraction Design

> **Goal:** Decompose monolithic service modules into focused, single-responsibility files.

## 1. Report Service Extraction

### Current State
`server/modules/reports/service.ts` — 666 lines, 5 responsibilities mixed:
- Report type definitions and role mappings
- Role-based scope resolution (6 roles)
- Report rendering (8 types × 3 formats = 24 branches)
- Download with caching
- Preview generation
- Display config for UI

### Target Structure
```
server/modules/reports/
├── definitions.ts    — REPORT_DEFINITIONS, ReportType, ReportFormat, role aliases
├── scope.ts          — resolveReportScope(), ReportAccessContext, scopeCacheKey()
├── renderer.ts       — renderReport(), RenderedReport, countRows(), format guardrails
├── service.ts        — public API: generateReportDownload(), generateReportPreview(),
│                       getAvailableReportsForRoles(), getDisplayReportsForRole(),
│                       getReportUser(), getStudentReportsDashboardData()
└── processor.ts      — (unchanged)
```

**Interfaces:**
- `definitions.ts` exports: `REPORT_DEFINITIONS`, `ReportDefinition`, `EXT`, `ROLE_PRIORITY`, `parseReportFormat()`, `normalizeReportType()`, `assertReportAllowed()`, `pickActorRole()`
- `scope.ts` exports: `resolveReportScope()`, `ReportAccessContext`, `ReportDataScope`
- `renderer.ts` exports: `renderReport()`
- `service.ts` imports from all three, exports public API

**Test strategy:** No logic changes — pure refactoring. Existing 60+ report tests cover all generators and API routes. Run full `npm run verify`.

## 2. Notification Service Extraction

### Current State
`server/modules/notifications/service.ts` — 301 lines, 4 responsibilities:
- Templates (18 notification types)
- Email channel (nodemailer SMTP transport)
- Push channel (Web Push via VAPID)
- In-app channel (Prisma CRUD + SSE)

### Target Structure
```
server/modules/notifications/
├── templates.ts       — NotificationEvent type, templates record, renderNotificationTemplate()
├── email.ts           — getMailer(), sendEmail(), nodemailer initialization
├── service.ts         — createNotification(), createNotificationInternal(),
│                        listNotifications(), getNotificationById(),
│                        markNotificationAsRead(), markAllNotificationsAsRead()
├── preferences.ts     — (already exists, unchanged)
├── push.ts            — (already exists, unchanged)
└── outbox-handler.ts  — (already exists, unchanged)
```

**Interfaces:**
- `templates.ts` exports: `NotificationEvent`, `templates`, `renderNotificationTemplate()`, `normalizeNotificationChannel()`, `securityNotificationEvents`
- `email.ts` exports: `sendEmail()`
- `service.ts` imports from templates.ts, email.ts, push.ts, preferences.ts

**Test strategy:** Pure refactoring. Existing notification tests cover CRUD + channels.

## 3. Search Extraction (deferred)

Current PostgreSQL ILIKE search (58 lines) will be replaced with MeiliSearch when:
- Docker is available locally
- MeiliSearch instance can be provisioned
- Infrastructure for sync/indexing is in place

## Acceptance Criteria
- [ ] All tests pass (936/936)
- [ ] TypeScript strict mode clean
- [ ] ESLint 0 errors, 0 warnings
- [ ] Production build OK
- [ ] docs/updates.md updated
