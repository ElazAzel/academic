# Visit Analytics — Design Spec

**Date**: 2026-05-21
**Status**: Draft

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

## Data Flow

1. **Client hook** (`VisitTracker`) runs on every page (via App Shell or layout)
   - On mount: `POST /api/v1/sessions/start` → creates UserSession row
   - After 2 min idle heartbeat: `POST /api/v1/sessions/heartbeat` (touch `endedAt = now()`)
   - On unmount / `beforeunload` / SPA navigation: `POST /api/v1/sessions/end` → sets `endedAt` + `durationSec`
   - Each page view logged as `ActivityLog` with `sessionId`

2. **Middleware** (`proxy.ts`) — logs page entry as ActivityLog for non-SPA navigation

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/v1/sessions/start | Create session + first ActivityLog |
| POST | /api/v1/sessions/heartbeat | Touch session |
| POST | /api/v1/sessions/end | Close session, compute duration |

## Analytics Queries

### `getVisitAnalytics(days, role?, userId?)`
- Hour-of-day distribution (0–23 bucket)
- Time-slot distribution (0-3, 3-6, 6-9, 9-12, 12-15, 15-18, 18-21, 21-24)
- Average session duration by role
- Total visits / unique users by role
- Filter: role (students / curators / all)

### `getUserVisitDetail(userId, days)`
- Daily visit count for last N days
- Heatmap of hours per day
- Total sessions, total duration
- Last 10 page views (from ActivityLog)

### `getTimingAnalytics(days)`
- Message activity by hour (from Message.createdAt)
- Lesson activity by hour (from LessonProgress.updatedAt)
- Quiz activity by hour (from QuizAttempt.submittedAt)
- Breakdown: students vs curators

## UI

### Admin page — new tab "Посещения"
- Filters: период (7/14/30/90 дней), роль (все/студенты/кураторы)
- Метрики: всего визитов, уникальных пользователей, средняя длительность
- График: посещений по часам суток (столбчатая диаграмма)
- График: слоты времени (столбцы)
- Таблица: персональная статистика (пользователь, роль, визитов, средняя длительность, последний вход)
- Клик по пользователю → детальный график активности
- Ниже: сообщения + занятия по часам

### Super-curator page — same section but scoped to their students

## Implementation Plan

1. Prisma: add UserSession model + sessionId to ActivityLog
2. Run migration
3. Create session API routes (start/heartbeat/end)
4. Create VisitTracker client hook
5. Add hook to AppShell
6. Create visit analytics server action
7. Create timing analytics server action
8. Create PerUserVisitTable component
9. Update admin analytics page (add "Посещения" tab)
10. Update super-curator analytics page (add visit section)
