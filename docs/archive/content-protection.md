# Content Protection

## What this protects against

- Casual link sharing of media URLs
- Unauthorized file access by non-enrolled users
- Simple downloads via direct URL guessing
- Unattributed screen recordings (via dynamic watermark)
- Access to locked or sequential-locked lessons
- Embedding LMS pages on external sites

## What this cannot fully prevent

- External screen recording software (OBS, built-in OS recorders)
- Phone/camera recording of the screen
- Screenshots
- DevTools extraction during active signed URL lifetime
- Browser extensions that capture page content

> **Important:** In a browser environment, it is technically impossible to fully prevent screen recording. The system uses watermark, access control, signed URLs, and audit logging to reduce the risk of content leaks.

## Protection layers

### 1. Access Control
- Content is only available to authenticated users
- Students see only their active enrollments
- Locked lessons cannot be opened
- Paused/cancelled enrollments block access
- Quiz/assignment/file/video access cannot be obtained via direct ID alone

### 2. Signed URLs
- Video and files are served via temporary signed URLs
- Signed URLs have a limited lifetime (configurable TTL)
- URLs are not permanently stored in HTML or the database
- Direct public links are not used
- Supabase Storage buckets should be configured as private

### 3. Dynamic Watermark
- Personalized watermark displayed over lesson content and video
- Contains: user name, email, short user hash, date/time
- Position changes every 10-20 seconds
- Low opacity (0.12-0.22) to not interfere with learning
- Visible on screen recordings for attribution
- Multiple position variants: top-left, top-right, center, bottom-left, bottom-right

### 4. Audit Logging
- Protected content opens are logged
- Signed URL generation is logged
- File downloads are logged
- Suspicious events are flagged:
  - Frequent signed URL requests
  - Access from multiple IPs/user-agents
  - Attempts to access locked lessons
  - Attempts to access other users' files
  - Sudden device changes

### 5. Basic Deterrents
- Context menu disabled on protected content areas
- Drag disabled for media elements
- Direct video URLs not shown in HTML
- No "open in new tab" button for private video
- CSP and frame-ancestors headers prevent external embedding

### 6. Security Headers
- `Content-Security-Policy`: restricts sources, allows YouTube embeds
- `X-Frame-Options: DENY`: prevents iframe embedding
- `Referrer-Policy: strict-origin-when-cross-origin`: limits referrer leakage
- `Permissions-Policy`: disables camera, microphone, geolocation
- `X-Content-Type-Options: nosniff`: prevents MIME sniffing

## Protection Levels

### `none`
No protection applied. Used for public or non-sensitive content.

### `standard` (default for lessons)
- Dynamic watermark
- Context menu disabled
- No direct links exposed
- Signed URLs with standard TTL (10-15 minutes)

### `strict`
- All standard protections
- Visibility change logging (tab hide/focus)
- Aggressive audit events
- Shorter signed URL TTL (3-5 minutes)
- Soft warning message displayed to student

## Student-facing policy text

> "Материалы курса защищены персональным водяным знаком. Запись, копирование и распространение материалов без разрешения запрещены."

This text is displayed before the first view of protected content. It is concise and does not interfere with the learning experience.

## Admin/curator operational process

1. Suspicious activity is logged in the audit system
2. Risk flags are created for repeated suspicious behavior
3. Admins can review audit logs via `/admin/audit`
4. Curators can see risk flags assigned to their students
5. No automatic blocking on MVP — only flagging for review

## API Endpoints

### GET `/api/v1/lessons/[lessonId]/media/[mediaId]/signed-url`
Returns a temporary signed URL for accessing lesson media files.

**Requirements:**
- Authenticated user
- Active enrollment (for students) or appropriate role (instructor/curator/admin)
- Media must belong to the specified lesson

**Response:**
```json
{
  "url": "https://signed-url...",
  "expiresAt": "2026-05-16T12:30:00.000Z",
  "fileName": "lesson-material.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 10485760
}
```

### GET `/api/v1/lessons/[lessonId]/video-playback`
Returns a playback URL for lesson video content.

**Requirements:**
- Authenticated user
- Active enrollment (for students)
- Lesson access check (including sequential lock)

**Response:**
```json
{
  "provider": "supabase_storage",
  "playbackUrl": "https://...",
  "expiresAt": "2026-05-16T12:30:00.000Z",
  "durationSeconds": 720,
  "watermarkEnabled": true
}
```

## Future upgrades

- **Bunny Stream**: Signed URLs with token authentication, geographic restrictions
- **Cloudflare Stream**: Per-viewer tokenized playback, domain locking
- **Mux**: Signed playback IDs, real-time analytics
- **DRM**: Widevine/FairPlay/PlayReady for full content encryption
- **Forensic watermarking**: Invisible watermarks embedded in video stream
- **Per-user video watermark**: Burned-in watermark unique to each viewer
- **Screenshot detection**: Limited browser APIs for visibility tracking
- **Session binding**: Tie playback to specific session/IP combination

## Implementation files

| File | Purpose |
|------|---------|
| `components/lms/security/dynamic-watermark.tsx` | Watermark component |
| `components/lms/security/protected-content-shell.tsx` | Protected content wrapper |
| `server/modules/security/content-protection.ts` | Server-side protection logic |
| `app/api/v1/lessons/[lessonId]/media/[mediaId]/signed-url/route.ts` | Signed media URL endpoint |
| `app/api/v1/lessons/[lessonId]/video-playback/route.ts` | Video playback endpoint |
| `lib/storage.ts` | Supabase signed URL helper |
| `lib/constants.ts` | Content protection constants |
| `next.config.ts` | Security headers |
