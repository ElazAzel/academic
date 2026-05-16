# Performance Review

> AI Strategic Academy — performance audit results and recommendations

## Bundle Size

### Current State (from `next build`)
- All routes build successfully
- Dynamic imports for: none explicitly configured (Next.js auto-splits by route)
- Largest dependencies: `pdf-lib`, `exceljs`, `firebase-admin`, `framer-motion`

### Recommendations

| Priority | Action | Impact |
|---|---|---|
| 🟡 Medium | Lazy-load `pdf-lib` and `exceljs` only on report download routes | Reduces initial bundle by ~300KB |
| 🟡 Medium | Dynamic import for `framer-motion` on pages that use it | Reduces initial bundle by ~50KB |
| 🟢 Low | Code-split admin pages with `next/dynamic` | Faster initial load for non-admin users |

## Database Indexes

**Current: 87 indexes across all tables.** Comprehensive coverage verified:

| Table | Key Indexes | Status |
|---|---|---|
| `enrollments` | `@@unique([userId, courseId])`, `@@index([userId, status])` | ✅ |
| `lesson_progress` | `@@unique([userId, lessonId])`, `@@index([userId])` | ✅ |
| `module_progress` | `@@unique([userId, moduleId])`, `@@index([userId])` | ✅ |
| `course_progress` | `@@unique([userId, courseId])` | ✅ |
| `assignment_submissions` | `@@index([userId])`, `@@index([assignmentId])`, `@@index([status])`, `@@index([submittedAt])` | ✅ |
| `notifications` | `@@index([userId])`, `@@index([createdAt])` | ✅ |
| `certificates` | `@@unique([number])`, `@@unique([verificationCode])` | ✅ |

**No missing indexes found.** All common query patterns are covered.

## Images

| Component | Current | Status |
|---|---|---|
| `course-hero-card.tsx` | `next/image` (fixed) | ✅ |
| `course-settings-panel.tsx` | `<img>` with eslint-disable | ⚠️ Minor (admin-only) |
| `popup-modal.tsx` | `<img>` for popup media | ⚠️ Minor (admin-only) |
| `popup-notification-viewer.tsx` | `<img>` for popup media | ⚠️ Minor (admin-only) |

## React Server Components

### "use client" Analysis

**38 components** in `lms/` use `"use client"`. Breakdown:

| Category | Count | Verdict |
|---|---|---|
| Interactive UI (forms, buttons, toggles) | ~25 | ✅ Required |
| Animation components (framer-motion) | ~5 | ✅ Required |
| Stateful display components (tables with state) | ~5 | ✅ Required |
| Pure display components | ~3 | ⚠️ Could be Server Components |

### Recommended changes

| File | Current | Change | Impact |
|---|---|---|---|
| `bar-chart.tsx` | `"use client"` | Remove if no interactivity | Minor |
| `widget-skeletons.tsx` | `"use client"` | Remove (pure display) | Minor |

## Performance Budget Targets

| Metric | Current (estimated) | Target |
|---|---|---|
| First Contentful Paint | ~1.5s | < 1.0s |
| Largest Contentful Paint | ~2.5s | < 2.0s |
| Total Bundle Size | ~1.2MB (gzipped) | < 800KB |
| API Response Time (p95) | ~300ms | < 200ms |
| Lighthouse Performance | ~75 | > 90 |
| Lighthouse Accessibility | ~88 | > 95 |

## Action Items

### Sprint 1 (High Impact)
- [ ] Dynamic import for `pdf-lib`/`exceljs` in report routes
- [ ] Lazy-load framer-motion on non-animated pages
- [ ] Remove `"use client"` from `bar-chart.tsx` and `widget-skeletons.tsx`

### Sprint 2 (Medium Impact)
- [ ] Convert `<img>` to `next/image` in popup components
- [ ] Add `loading="lazy"` to all below-the-fold images
- [ ] Enable `optimizePackageImports` in `next.config.ts`

### Sprint 3 (Low Impact)
- [ ] Audit and reduce unused CSS classes
- [ ] Add `preload` hints for critical fonts
- [ ] Enable Incremental Static Regeneration for public pages
