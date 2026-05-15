# Task Context: Fix Broken Features

Session ID: 2026-05-15-fix-broken-features
Created: 2026-05-15T17:42:00+03:00
Status: in_progress

## Current Request
Исправить всё, что работает не нормально по результатам аудита UX/UI, уведомлений, чата, скачивания документов.

## Context Files (Standards to Follow)
- `AI.md` — Project guide (Russian-only UI, TypeScript strict, Prisma, Next.js 16)
- `ai/roles/backend-next-prisma.md` — Backend conventions
- `ai/roles/frontend-lms-ux.md` — Frontend/UI conventions

## Reference Files (Source Material to Look At)
- `server/modules/notifications/service.ts` — Notification service
- `server/modules/notifications/push.ts` — Push notifications (stub)
- `server/modules/notifications/preferences.ts` — Notification preferences
- `components/lms/notifications-list.tsx` — Notifications list UI
- `components/lms/notifications-dropdown.tsx` — Notifications dropdown UI
- `components/layout/site-header.tsx` — Site header (broken nav)
- `components/layout/navigation.ts` — Navigation config
- `components/layout/nav-links.tsx` — Nav links component
- `components/lms/chat-panel.tsx` — Chat panel
- `components/lms/ask-curator-question.tsx` — Ask curator question
- `server/actions/chat.ts` — Chat server actions
- `lib/reports/xlsx-generator.ts` — XLSX report generator
- `server/modules/certificates/service.ts` — Certificate PDF generation
- `app/api/v1/certificates/[certificateId]/pdf/route.ts` — Certificate PDF download
- `lib/http.ts` — API error handling
- `services/notification-service/src/index.ts` — Notification microservice (stub)

## External Docs Fetched
None needed — all fixes are within the existing codebase.

## Components (Fixes to Make)

### Group A: Notifications (4 fixes)
1. **push.ts** — Replace Firebase stub with actual implementation or graceful fallback
2. **service.ts#createNotification** — Check user preferences before sending
3. **preferences.ts** — Ensure all DB operations use correct unique constraint
4. **UI for preferences** — Create settings page(s) for notification preferences

### Group B: Chat Real-time (1 fix)
5. **chat-panel.tsx + server/actions/chat.ts** — Replace 15s polling with Supabase Realtime subscription

### Group C: Certificate PDF (2 fixes)
6. **certificates/service.ts** — Translate to Russian, embed Cyrillic font
7. **pdf/route.ts** — Better filename with student name

### Group D: Navigation (2 fixes)
8. **site-header.tsx** — Restore/uncomment main navigation menu
9. **navigation.ts + nav-links.tsx** — Connect real badge counts from notification API

### Group E: API Errors (1 fix)
10. **server/actions/chat.ts, courses.ts, etc.** — Replace `throw new Error()` with `throw new ApiError()`

### Group F: XLSX Bug (1 fix)
11. **xlsx-generator.ts** — Fix rowNum counter after mergeCells

### Group G: NotificationDropdown Optimistic Bug (1 fix)
12. **notifications-dropdown.tsx** — Fix silent error swallowing on markAllRead

### Group H: ChatPanel Indicator Bug (1 fix)
13. **chat-panel.tsx** — Fix "отправляется..." staying visible on error

## Constraints
- Russian-only UI (no English user-facing strings)
- TypeScript strict mode
- Supabase PostgreSQL backend
- Next.js 16 App Router
- Prisma ORM

## Exit Criteria
- [ ] Push notifications: stub replaced with real implementation or removed
- [ ] createNotification respects user preferences
- [ ] Notification preferences UI exists and works
- [ ] Chat uses real-time subscriptions instead of polling
- [ ] Certificate PDF is in Russian with Cyrillic font support
- [ ] Site header navigation is visible
- [ ] Badge counts show unread notifications/messages
- [ ] Server actions throw ApiError instead of generic Error
- [ ] XLSX row counter is correct
- [ ] NotificationDropdown handles errors gracefully
- [ ] ChatPanel optimistic indicator handles errors
