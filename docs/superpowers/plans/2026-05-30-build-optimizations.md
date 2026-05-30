# Build & Performance Optimizations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce server bundle from 105 MB to <90 MB, client bundle from 3.07 MB to <2.5 MB, add ISR/streaming for perf.

**Architecture:** All changes are in existing files — no new components. Remove unused dependencies, add dynamic imports, migrate `<img>` to `next/image`, add bundle analyzer, add ISR to public pages, add streaming to dashboards.

**Tech Stack:** Next.js 16, TypeScript, next/image, @next/bundle-analyzer

---

## File Structure

### Files to modify:
- `package.json` — remove deps, add bundle-analyzer, add analyze script
- `next.config.ts` — add bundle-analyzer config, remove unused optimizePackageImports
- `components/lms/chat-panel.tsx` — migrate `<img>` to `next/image`
- `components/admin/certificate-designer.tsx` — migrate `<img>` to `next/image`
- `components/lms/course-builder-shell.tsx` — migrate `<img>` to `next/image`
- `components/lms/course-hero-card.tsx` — migrate `<img>` to `next/image`
- `components/lms/course-settings-panel.tsx` — migrate `<img>` to `next/image`
- `components/ui/avatar.tsx` — migrate `<img>` to `next/image`
- `app/login/page.tsx` — add `dynamic = 'force-static'`
- `app/forgot-password/page.tsx` — add `dynamic = 'force-static'`
- `app/verify-email/page.tsx` — add `dynamic = 'force-static'`
- `app/privacy/page.tsx` — add ISR
- `app/terms/page.tsx` — add ISR
- `app/admin/analytics/page.tsx` — add Suspense boundaries
- `app/instructor/analytics/page.tsx` — add Suspense boundaries
- `app/student/page.tsx` — add Suspense boundaries
- `lib/reports/xlsx-generator.ts` — dynamic import of exceljs
- `types/pdfmake.d.ts` — DELETE (no longer needed)
- `docs/updates.md` — update changelog

### Files to delete:
- `types/pdfmake.d.ts` — orphaned type declaration

---

### Task 1: Bundle Analyzer Setup

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Install @next/bundle-analyzer**

Run:
```bash
npm install --save-dev @next/bundle-analyzer
```

- [ ] **Step 2: Update next.config.ts**

Edit `next.config.ts` to add bundle analyzer:

```typescript
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// @next/bundle-analyzer — включается через ANALYZE=true
import withBundleAnalyzer from "@next/bundle-analyzer" satisfies import("@next/bundle-analyzer").NextBundleAnalyzerOptions;

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  // ... existing config
};

export default withSentryConfig(analyze(nextConfig));
```

- [ ] **Step 3: Add analyze script to package.json**

Edit `package.json` scripts section:
```json
"analyze": "set ANALYZE=true&&next build",
```

- [ ] **Step 4: Run bundle analyzer baseline**

```bash
npm run analyze
```
Expected: creates `.next/analyze/client.html` and `.next/analyze/server.html` — review them.

---

### Task 2: Remove Unused Dependencies

**Files:**
- Modify: `package.json`
- Delete: `types/pdfmake.d.ts`

- [ ] **Step 1: Identify unused packages**

The following are NOT imported anywhere in application code:
- `hls.js` (24 MB) — no imports
- `pdfmake` (15 MB) — only `types/pdfmake.d.ts`, no runtime imports
- `canvas-confetti` — no imports
- `cmdk` — no imports
- `vaul` — no imports
- `@tanstack/react-virtual` — no imports
- `recharts` — listed in `optimizePackageImports` but not imported (custom BarChart used instead)

- [ ] **Step 2: Remove packages**

Run:
```bash
npm uninstall hls.js pdfmake canvas-confetti cmdk vaul @tanstack/react-virtual recharts
```

- [ ] **Step 3: Delete orphaned type declaration**

```bash
Remove-Item -LiteralPath "types/pdfmake.d.ts"
```

- [ ] **Step 4: Update next.config.ts — remove recharts from optimizePackageImports**

Edit `next.config.ts`:
```typescript
optimizePackageImports: ["lucide-react", "framer-motion", "date-fns", "@radix-ui/react-*"],
```

- [ ] **Step 5: Run lint + typecheck + test + build**

```bash
npm run lint; if ($?) { npm run typecheck }; if ($?) { npm run test }; if ($?) { npm run build }
```
Expected: all pass

---

### Task 3: Dynamic Imports for Heavy Libraries

**Files:**
- Modify: `lib/reports/xlsx-generator.ts`

- [ ] **Step 1: Dynamic import of exceljs in xlsx-generator**

Currently `lib/reports/xlsx-generator.ts` has a static import:
```typescript
import ExcelJS from "exceljs";
```

Change to dynamic import at the usage site. Read the file first to understand its structure.

- [ ] **Step 2: Audit framer-motion imports**

`framer-motion` is imported in 6 files. Check if `optimizePackageImports` already handles tree-shaking. It's listed in `next.config.ts` so individual exports should be tree-shaken. No action needed unless bundle analyzer shows it's a problem.

- [ ] **Step 3: Run build and verify**

```bash
npm run build
```
Expected: build passes, bundle sizes decreased.

---

### Task 4: Migrate `<img>` to `next/image`

**Files:**
- Modify: `components/lms/chat-panel.tsx` (line 361)
- Modify: `components/admin/certificate-designer.tsx` (line 785)
- Modify: `components/lms/course-builder-shell.tsx` (line 497)
- Modify: `components/lms/course-hero-card.tsx` (line 20)
- Modify: `components/lms/course-settings-panel.tsx` (line 76)
- Modify: `components/ui/avatar.tsx` (line 21)

For each `<img>` tag, replace with `next/image`:

**Pattern (replace `<img src={...} alt={...} className="..." />`):**
```tsx
import Image from "next/image";

// Before:
<img src={url} alt="text" className="..." />

// After:
<Image src={url} alt="text" width={640} height={360} className="..." />
```

For user avatars in `components/ui/avatar.tsx`, handle the remote URL case:
```tsx
import Image from "next/image";

// Before:
<img src={image} alt={name} className="h-full w-full object-cover" />

// After:
<Image src={image} alt={name} width={40} height={40} className="h-full w-full object-cover" />
```

For `course-hero-card.tsx` and `course-builder-shell.tsx` — `coverUrl` may be null. Handle with a ternary:
```tsx
{detail.coverUrl ? (
  <Image src={detail.coverUrl} alt="Обложка курса" width={128} height={128} className="h-32 w-full object-cover" />
) : (
  <div className="h-32 w-full bg-muted" />
)}
```

For `course-settings-panel.tsx`:
```tsx
{detail.coverUrl ? (
  <Image src={detail.coverUrl} alt="" width={200} height={100} className="w-full rounded-lg object-cover h-24" />
) : (
  <div className="h-24 w-full rounded-lg bg-muted" />
)}
```

- [ ] **Step 1: Migrate chat-panel.tsx — read file, find img tag, replace with Image**
- [ ] **Step 2: Migrate certificate-designer.tsx**
- [ ] **Step 3: Migrate course-builder-shell.tsx**
- [ ] **Step 4: Migrate course-hero-card.tsx**
- [ ] **Step 5: Migrate course-settings-panel.tsx**
- [ ] **Step 6: Migrate avatar.tsx**
- [ ] **Step 7: Run build to verify**

```bash
npm run lint; if ($?) { npm run build }
```
Expected: all pass

---

### Task 5: ISR for Public Pages

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/forgot-password/page.tsx`
- Modify: `app/verify-email/page.tsx`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`

- [ ] **Step 1: Read login/page.tsx to check existing dynamic config**

Check if `login/page.tsx` already has `export const dynamic` or any `cookies()`, `headers()`, or `searchParams` usage that would prevent static generation.

- [ ] **Step 2: Add static export for login page**

If no dynamic features are used, add:
```typescript
export const dynamic = "force-static";
```

- [ ] **Step 3: Add static export for forgot-password page**

Same approach.

- [ ] **Step 4: Add static export for verify-email page**

Same approach.

- [ ] **Step 5: Add ISR for privacy page**

Read `app/privacy/page.tsx` first. If it has no dynamic features:
```typescript
export const revalidate = 86400; // 24 hours
```

- [ ] **Step 6: Add ISR for terms page**

Same as privacy.

- [ ] **Step 7: Build verification**

```bash
npm run build
```
Expected: public pages are now static/ISR (check build output for `λ` vs `○` symbols).

---

### Task 6: Streaming SSR for Dashboards

**Files:**
- Modify: `app/admin/analytics/page.tsx`
- Modify: `app/instructor/analytics/page.tsx`
- Modify: `app/student/page.tsx`

- [ ] **Step 1: Read admin/analytics/page.tsx**

Identify sections that can be streamed independently (e.g., "activity chart", "user stats", "engagement"). Each section should be a separate async server component wrapped in `<Suspense>`.

- [ ] **Step 2: Extract streamable sections into separate async components**

For example, create inline async components:
```tsx
async function ActivityChart() {
  const data = await getAnalyticsData();
  return <BarChart items={data} />;
}

async function UserStats() {
  const stats = await getUserStats();
  return <StatsCards stats={stats} />;
}
```

- [ ] **Step 3: Wrap each section in Suspense**

```tsx
<div className="grid gap-6">
  <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
    <ActivityChart />
  </Suspense>
  <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>
    <UserStats />
  </Suspense>
</div>
```

- [ ] **Step 4: Apply same pattern to instructor/analytics and student pages**

- [ ] **Step 5: Build verification**

```bash
npm run build
```
Expected: build passes.

---

### Task 7: Full Build Verification & Final Touches

**Files:**
- Modify: `docs/updates.md`

- [ ] **Step 1: Run the full verify pipeline**

```bash
npm run verify
```
Expected: lint 0 errors, typecheck clean, tests pass, build success.

- [ ] **Step 2: Check bundle size improvement**

Compare with baseline:
```bash
# Server bundle
Get-ChildItem ".next/server" -Recurse -File | Measure-Object -Property Length -Sum
# Client bundle
Get-ChildItem ".next/static/chunks" -Recurse -File -Filter "*.js" | Measure-Object -Property Length -Sum
```

- [ ] **Step 3: Update docs/updates.md**

Add entry describing all changes:

```markdown
## 2026-05-30 — Build & Performance Optimizations

### Изменения
- Установлен @next/bundle-analyzer, добавлен `npm run analyze`
- Удалены неиспользуемые пакеты: hls.js, pdfmake, canvas-confetti, cmdk, vaul, @tanstack/react-virtual, recharts
- Удалён orphaned type declaration: types/pdfmake.d.ts
- Из next.config.ts убран recharts из optimizePackageImports
- ... (full list)
```

- [ ] **Step 4: Summary of results**

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Server bundle | 105 MB | ? | ? |
| Client bundle | 3.07 MB | ? | ? |
| node_modules | ~68 deps | ~61 deps | -7 |
| Public pages | SSR | Static/ISR | 0ms TTFB |
| `<img>` tags | 6 | 0 | All next/image |
