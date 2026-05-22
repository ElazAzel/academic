# Vercel + Supabase Deployment Guide

**Дата:** 2026-05-16 (updated 2026-05-22 — upload limit aligned with code)
**Статус:** Reference document

---

## Architecture Overview

```
GitHub ──► Vercel (Next.js 16, App Router)
              │
              ├── API Routes (REST)
              ├── Server Actions
              └── Pages / Components
                     │
               Supabase ──► PostgreSQL 17
                           ├── Prisma ORM
                           ├── Storage (PDF, images, files ≤20MB)
                           └── Realtime (future)
```

---

## Environment Variables

### Required (Vercel Project Settings)

```env
# === Database ===
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public&sslmode=require"

# === Auth ===
NEXTAUTH_SECRET="[generate: openssl rand -base64 32]"
NEXTAUTH_URL="https://[your-domain].vercel.app"
APP_URL="https://[your-domain].vercel.app"

# === Supabase (optional — for Realtime) ===
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
```

### Optional (feature flags)

```env
CERTIFICATE_COMPLETION_THRESHOLD=85
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=120
FEATURE_GRAPHQL=false
FEATURE_EMAIL_NOTIFICATIONS=false
FEATURE_PUSH_NOTIFICATIONS=false
```

### OAuth (optional)

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

### Monitoring (optional)

```env
SENTRY_DSN="..."
SENTRY_AUTH_TOKEN="..."
```

---

## Vercel Configuration

### `vercel.json` (if needed)

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install"
}
```

### Build command (`package.json`)

```
node scripts/clean-next-dev-types.mjs && prisma generate && next build
```

- `prisma generate` — generates Prisma client
- `clean-next-dev-types.mjs` — removes dev-only type files that can break build

### Prisma & Vercel Serverless

`lib/prisma.ts` handles:
- Connection pooling via `pg` Pool (max: 1 for serverless, 10 for traditional)
- SSL: `rejectUnauthorized: false` for Supabase
- `normalizePostgresConnectionString` — strips SSL params that cause self-signed-chain errors on Vercel
- `storage_POSTGRES_PRISMA_URL` env var (if set by Supabase integration) overrides `DATABASE_URL`

---

## Supabase Configuration

### Database

1. Create project on Supabase
2. Get connection string from Project Settings → Database
3. Set `sslmode=require` (already handled by `normalizePostgresConnectionString`)
4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Storage

Used ONLY for:
- PDF files
- Images (JPEG, PNG, WebP)
- Course cover images
- Assignment submissions

NOT used for:
- Video files (use YouTube/Vimeo embed)
- Large files (>20MB)

**Upload restrictions** (enforced in `app/api/v1/media/uploads/route.ts`):
- MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `video/mp4`, `video/webm`, `video/mpeg`, `application/zip`
- Max size: 20MB (configured in `lib/constants.ts` — `UPLOAD.MAX_FILE_SIZE_MB`)

### Storage Buckets

| Bucket | Visibility | Usage |
|--------|-----------|-------|
| `course-covers` | Public | Course cover images |
| `lesson-media` | Private | PDFs, images for lessons |
| `submissions` | Private | Student assignment uploads |

Private files use Supabase signed URLs (generate via server-side).

---

## Critical Checks

### ❌ No VPS assumptions
- No local file storage in production paths
- No long-running serverless operations (>10s limit on Vercel Hobby)
- No Redis as mandatory dependency (KV_URL is optional)
- No SMTP as mandatory (email bounces silently if not configured)

### ✅ Prisma + Supabase compatibility
- Uses `@prisma/adapter-pg` for connection pooling
- Pool config adapts to serverless (`max: 1`) vs traditional (`max: 10`)
- `sslmode` handling for Supabase certificates

### ✅ Upload limits
- MIME type allowlist: 9 types (defined in `lib/constants.ts`)
- Max file size: 20MB (`UPLOAD.MAX_FILE_SIZE_BYTES` in `lib/constants.ts`)
- Chat uploads: 15MB (separate limit in `app/api/v1/chat/upload/route.ts`)
- Video is NOT uploaded — only YouTube URLs

### Missing / Needs Attention

- [x] **20MB limit**: Aligned — code enforces 20MB via `lib/constants.ts`
- [ ] **Supabase Storage signed URLs**: Verify signed URL generation works for private files
- [ ] **YouTube URL normalizer**: Check if `/server/modules/` has YouTube URL processing
- [ ] **Env vars documentation**: This document needs to be kept in sync with `lib/env.ts`
- [ ] **CI deploy**: Add GitHub Action for `prisma migrate deploy` on production push

---

## Deployment Checklist

### Before first deploy
- [ ] Supabase project created
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Demo users created (`npm run users:create`)
- [ ] Demo course created (`npm run course:create-demo`)
- [ ] Environment variables set in Vercel
- [ ] Build passes locally (`npm run build`)
- [ ] `npm run lint -- --max-warnings=0` passes
- [ ] `npm run test` passes

### After deploy
- [ ] Health check: `GET /api/v1/healthz` → 200
- [ ] Readiness: `GET /api/v1/readyz` → 200
- [ ] Login: admin@academy.local / Password123!
- [ ] Student dashboard loads
- [ ] Course page loads
- [ ] Lesson player loads
- [ ] Static assets load (images, icons)

### Ongoing
- [ ] Monitor Supabase free tier pause (project auto-pauses after 7 days inactivity)
- [ ] Set up Sentry for error tracking
- [ ] Configure Vercel Analytics for performance monitoring
