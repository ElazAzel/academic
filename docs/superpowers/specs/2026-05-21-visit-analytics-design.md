# Visit Analytics — Design Spec

**Date**: 2026-05-21
**Status**: Approved

## Goals
- [ ] Track user session duration and peak activity hours.
- [ ] Provide admin and super-curator with visit distribution analytics.
- [ ] Maintain user privacy while gathering engagement metrics.

## Models

### New: `UserSession`

| Field | Type | Purpose |
|-------|------|---------|
| id | String (cuid) | PK |
| userId | String | FK → User |
| role | String | Cached role at session start (student/curator/admin) |
| startedAt | DateTime | Session start |
| endedAt | DateTime? | Session end |
| durationSec | Int? | Computed on end |
| ipAddress | String? | Client IP |
| userAgent | String? | Client UA |
| source | String | "web" / "mobile" / "api" |

Indexes: `userId+startedAt`, `role+startedAt`, `startedAt`.

### Existing models repurposed:
- `ActivityLog` — page views, heartbeats, all timestamped actions (add `sessionId`)
- `Message.createdAt` — message timing analytics
- `LessonProgress.updatedAt` — lesson timing analytics
- `QuizAttempt.submittedAt` — quiz timing analytics

## Architecture

### Data Flow
1. **Client hook** (`VisitTracker`) runs on every page (via App Shell or layout)
   - On mount: `POST /api/v1/sessions/start` → creates UserSession row
   - After 2 min idle heartbeat: `POST /api/v1/sessions/heartbeat` (touch `endedAt = now()`)
   - On unmount / `beforeunload` / SPA navigation: `POST /api/v1/sessions/end` → sets `endedAt` + `durationSec`
   - Each page view logged as `ActivityLog` with `sessionId`

2. **Middleware** (`proxy.ts`) — logs page entry as ActivityLog for non-SPA navigation

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/sessions/start | Create session + first ActivityLog |
| POST | /api/v1/sessions/heartbeat | Touch session |
| POST | /api/v1/sessions/end | Close session, compute duration |

## Validation
- **Rule**: "Sessions must be touched via heartbeat."
  - **Test**: Verify `heartbeat` API call exists in `VisitTracker` hook.
- **Rule**: "Architecture boundary: prisma usage."
  - **Test**: Prisma only in `server/modules/analytics/service.ts`.
