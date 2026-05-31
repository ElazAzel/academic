# Scale Path — Microservices Extraction

> AI Strategic Academy — reference architecture for service extraction

## Current Architecture

Modular monolith with clear domain boundaries:
- `server/actions/` — Server Actions (Next.js)
- `server/modules/` — Domain services (Prisma-based)
- `lib/` — Shared utilities
- `app/api/v1/` — REST API routes

## Extraction Candidates

### 1. Notification Service
**Why extract first:** Most independent domain, strong contract boundaries

| Aspect | Current | Target |
|---|---|---|
| Data | `Notification`, `NotificationPreference`, `PushSubscription` | Separate PostgreSQL or Redis |
| API | In-process calls | gRPC or REST |
| Transport | Direct function calls | Outbox → Message Broker |
| Push | Web Push/VAPID sender | Standalone push worker |

**Steps:**
1. Extract `server/modules/notifications/` → `services/notification-service/`
2. Port Prisma queries to independent DB connection
3. Add message broker consumer (Redis Streams / RabbitMQ)
4. Add health check, metrics, Dockerfile
5. Deploy as independent service

### 2. Report Generation Service
**Why extract second:** CPU-intensive (PDF generation), benefits from isolation

| Aspect | Current | Target |
|---|---|---|
| Data | Prisma reads (read replica) | Read replica or cache |
| API | REST via Next.js | Express/Fastify REST |
| Generation | Synchronous in API route | Background job queue |
| Storage | In-memory cache + response | S3 + signed URL |

**Steps:**
1. Extract `lib/reports/` → `services/report-service/`
2. Move PDF/XLSX generation to worker pool
3. Store generated files in S3
4. Add async status endpoint

### 3. Certificate Service
**Reason:** QR generation, PDF templates, verification are isolated

### 4. Search Service
**Reason:** Full-text search can be extracted to MeiliSearch/ElasticSearch

## Message Broker Contract

### Events (Outbox → Consumer)

```typescript
// User events
{ eventType: "user.created", payload: { userId, email, roles } }
{ eventType: "user.deleted", payload: { userId } }

// Notification events
{ eventType: "notification.send", payload: { userId, channel, title, body } }

// Report events
{ eventType: "report.generate", payload: { reportType, format, userId } }

// Certificate events
{ eventType: "certificate.issued", payload: { certificateId, userId, courseId } }
```

### Outbox Table (already exists)

```prisma
model OutboxEvent {
  id        String   @id @default(cuid())
  eventType String   @map("event_type")
  payload   Json     @default("{}")
  status    String   @default("pending")
  createdAt DateTime @default(now()) @map("created_at")
  sentAt    DateTime? @map("sent_at")
  error     String?  @db.Text
  @@map("outbox_events")
}
```

## Timeline & Cost

| Step | Effort | Risk | Value |
|---|---|---|---|
| 1. Notification service extraction | 2-3 weeks | Medium | High (independent deploy, push reliability) |
| 2. Report service extraction | 1-2 weeks | Low | Medium (PDF gen doesn't block API) |
| 3. Message broker (Redis Streams) | 1 week | Low | Enables all extractions |
| 4. Search extraction | 2-3 weeks | Medium | High (better search UX) |

## When to Extract

**Trigger conditions** (any of these):
- Monolith build time > 5 minutes
- Notification sending blocks API response time
- Report generation causes DB connection pool exhaustion
- Team size > 5 developers working on same codebase
- Deployment frequency < 1x per week due to coordination overhead
