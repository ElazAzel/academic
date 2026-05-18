# Performance Review

> AI Strategic Academy — performance audit results and recommendations

## M-PR-11 Applied Changes

Status: implemented for the production MVP performance pass.

- Added central query caps in `lib/query-limits.ts` for dashboards, queues, reports, chats, and analytics detail views.
- Bounded heavy curator and super-curator dashboard queries with `take` limits while preserving role scope.
- Replaced the super-curator chat N+1 pair lookup with batched message and unread-count queries.
- Bounded report exports and detailed progress calculations to explicit export/detail limits.
- Reworked admin reports and admin analytics course summaries to use grouped aggregates instead of loading all course progress rows into React pages.
- Reworked instructor quiz analytics to use `groupBy` aggregates instead of loading every quiz attempt under every quiz.
- Added targeted PostgreSQL indexes for progress, reports, assignments, questions, certificates, notifications, curator assignments, risk flags, chat messages, user-role grouping, module progress, and quiz-attempt aggregates.

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

M-PR-11 adds targeted indexes for query shapes that are now part of dashboards, reports, analytics, and chat.

| Area | Key Indexes | Query Shape |
|---|---|---|
| Curriculum | `idx_lessons_block_order` | lesson tree ordered by block |
| Enrollments | `idx_enrollments_course_status`, `idx_enrollments_cohort_status`, `idx_enrollments_status_created_at` | reports, active enrollment counts, cohort dashboards |
| Progress | `idx_lesson_progress_user_updated_at`, `idx_module_progress_module_status`, `idx_course_progress_course_status`, `idx_course_progress_user_updated_at` | progress dashboards and grouped analytics |
| Quiz/assignments | `idx_quizzes_course_id`, `idx_quizzes_lesson_id`, `idx_quiz_attempts_quiz_passed`, assignment/submission indexes | instructor analytics and review queues |
| Questions/risks | lesson question status/curator/student indexes, risk status/scope indexes | curator and super-curator operational queues |
| Reports/certificates | certificate user/course/enrollment indexes | scoped certificate exports and verification lists |
| Notifications/chat | notification read-state index and sender/receiver message indexes | unread counters and chat history |
| Role analytics | `idx_user_roles_role_id` | admin role distribution grouping |

Migration: `prisma/migrations/20260518000000_performance_scale_pass/migration.sql`.

Operational note: production currently has migration-history drift from previous manual schema work, so apply this SQL in the same controlled path used for M-PR-10 until `_prisma_migrations` is reconciled.

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
- [x] Bound heavy dashboard/report/chat queries and remove known N+1 chat pair lookup
- [x] Add targeted database indexes for real query shapes
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
