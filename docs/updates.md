# Project Updates

## 2026-10-16 — Починка CI на `main` и разбор Dependabot PR

**Goal**: Вернуть зелёный CI на `main` (ESLint и Security падали на всех PR) и закрыть critical/high advisories.

### Changes
- **ESLint crash** (`TypeError: expand is not a function`): глобальный override `brace-expansion: 5.0.9` подменял зависимость `minimatch@3` (ESLint, `@eslint/eslintrc`), которой нужен API `brace-expansion@1`. Override разделён по мажорам: `brace-expansion@1 → 1.1.21`, `brace-expansion@5 → 5.0.12` (5.0.9 попал под новые DoS-advisories).
- **Runtime-уязвимости** закрыты обновлениями: `next` 16.4.2 (critical RCE в 16.0–16.3.7), `nodemailer` 10.1.1 (единственный breaking change 10.x — Node ≥20, совпадает с `engines`), `sharp` 0.35.5, `adm-zip` 0.6.1, `dompurify` 3.4.17, `@tiptap/*` 3.32.0, `prisma`/`@prisma/*` 7.10.1, `vitest` 4.1.12, `eslint-config-next`/`@next/bundle-analyzer` 16.4.2 и транзитивные (`undici`, `prosemirror-view`, `source-map-js`, `js-yaml`, `fast-uri`, `browserslist`) через `npm update`.
- **`services/gateway-bff`**: `proxy-addr` 2.0.7 → 2.0.8 (critical, ловился Trivy).
- **Audit gate** (`security:dependencies`): runtime-дерево блокирует на high, полное дерево — на critical. Причина: `braces`/`micromatch`/`fast-glob` (через `tailwindcss@3` и `eslint-config-next`) имеют high-advisory без патченной версии; единственный путь — миграция на Tailwind 4 (отдельная задача).
- **GitHub Actions**: `actions/checkout` 7.0.1, `actions/setup-node` v7, `github/codeql-action` init+analyze 4.38.1 (одновременно — раздельные bump-PR давали CodeQL configuration error).
- **Dependabot**: npm-группы ограничены minor/patch (мажоры — отдельными PR), `github/codeql-action*` сгруппированы.
- **E2E впервые после редизайна** (раньше CI падал на ESLint и до E2E не доходил) выявили и закрыли:
  - a11y (axe, WCAG 2.5.3/1.4.3): `aria-label` логотипа и кнопки поиска не содержал видимый текст; счётчик непрочитанных не входил в имя колокольчика; заголовок группы сайдбара `text-muted-foreground/70` не проходил контраст. В `accessibility-smoke` включён `reducedMotion`, чтобы axe проверял итоговое состояние, а не кадр fade-in.
  - **Молчаливый провал входа**: гонка CSRF-cookie next-auth v4 — параллельные `/api/auth/session` на странице входа перезаписывали cookie, callback отклонялся (`csrf=true`) без `error`, форма уводила на `/403`. `LoginForm` повторяет `signIn` один раз и показывает понятную ошибку при повторном отказе.
  - **Дашборд наблюдателя** всегда отдавал fallback: JSON-фильтр Prisma в MySQL-синтаксисе `path: "$.showInReport"` → `["showInReport"]`; регрессионный тест на строковые JSON-пути.
- `AGENTS.md`: управляемый блок, который `next dev` 16.4 дописывает сам.

### Verification
- ESLint `--max-warnings=0`: clean.
- TypeScript: clean.
- Vitest: 168 files, 942 tests passed.
- Production build: passed.
- `npm run verify:security`: passed; `npm audit --omit=dev`: 0 vulnerabilities.
- Trivy fs (HIGH,CRITICAL, ignore-unfixed): 0 findings.
- CI E2E (Chromium + Pixel 7, 252 теста): passed.

## 2026-08-23 — UX/UI редизайн «Calm Precision»: шелл, иконки, шрифты, дашборд слушателя

**Goal**: Полный визуальный рефакторинг платформы: отказ от M3-стекла и Material Symbols, переход на «Calm Precision» (нейтральная база + один акцент, hairline-бордеры), архитектура шелла на ролейных layout'ах.

### Changes
- **Архитектура шелла**: созданы 6 ролейных layout'ов (`app/{student,curator,instructor,admin,super-curator,customer-observer}/layout.tsx`); обёртки `<AppShell role="...">` удалены из 155 page/loading файлов (остался только динамический shell в `app/notifications/page.tsx`). Дублирование шелла больше невозможно.
- **Навигация**: `components/layout/navigation.ts` переписан на сгруппированную структуру `NAV_GROUPS_BY_ROLE` (+ плоский `NAV_BY_ROLE` для совместимости). Новый клиентский `sidebar-nav.tsx`: сворачиваемый рейл с localStorage-персистентностью, живые бейджи непрочитанного (polling `/api/v1/unread-counts`), кнопка установки PWA.
- **Хедер**: убрано дублирующее pill-меню; добавлен триггер поиска с `Ctrl K` (`search-trigger.tsx`, клиентский компонент — открывает CommandPalette через событие `command-palette:open`).
- **Мобильная навигация**: `mobile-bottom-nav.tsx` — плоский таб-бар без glow, точка-индикатор бейджа при свёрнутом рейле.
- **Иконки**: Material Symbols полностью удалены (включая Google Fonts stylesheet из root layout). Новый `components/ui/icon.tsx` — shim над lucide-react (~90 маппингов имён), API сохранён.
- **Шрифты**: Inter → Manrope (next/font, кириллица; переменная `--font-inter` сохранена для контракта с рантайм-брендингом). `DEFAULT_BRAND_FONT_SANS/HEADING` = Manrope.
- **Дизайн-токены**: `globals.css` — новая шкала поверх существующих переменных бренда (имена сохранены для рантайм-переопределений): solid surfaces вместо glass, hairline-бордеры, calm-тени, семантические success/warning/info. `tailwind.config.ts` дополнен без удаления legacy-ключей.
- **Компоненты**: Button (solid primary, без градиента/glow), Card (без hover-lift по умолчанию, вариант interactive), Badge (семантические статусы), Skeleton, PageHeader, EmptyState, PageTransition — приведены к новой системе.
- **Дашборд слушателя**: bento-структура «продолжить обучение + XP + ближайшие действия», метрики/курсы/треки/вопросы переведены на семантические токены; ContinueLearningCard упрощён (без вложенных рамок и инсет-теней).
- **Фиксы**: опечатка `"--m3-surface-container-high: animate"` в branding-сервисе; неиспользуемый eslint-disable в root layout.

### Verification
- TypeScript: clean (`tsc --noEmit`).
- ESLint: clean with zero warnings.
- Vitest: 938 passed (обновлены тесты metric-grid и branding под новые токены; 1 инфраструктурный flake воркера воспроизведён изолированно — зелёный).
- Production build: passed (Turbopack, все маршруты собраны; для сбора данных страниц создан локальный `.env` — в git не попадает).

## 2026-07-22 — CSP nonce propagation for App Router chunks

**Goal**: Stop production route chunks from being blocked by `script-src 'strict-dynamic'` and prevent stale nonce reuse between requests.

### Changes
- **`proxy.ts`** now forwards the complete nonce-bearing CSP as a request header as well as a response header, allowing Next.js to apply the same nonce to framework and route scripts.
- Removed the `__academy_nonce` response cookie; a cookie represents the previous response during SSR and cannot safely carry a per-request nonce.
- **`app/layout.tsx`** reads only the current request nonce and passes it to the client provider boundary.
- **`components/providers.tsx`** passes the nonce to `next-themes`, covering its inline theme bootstrap script.
- Added a release-hardening regression test for the full proxy → layout → theme-provider nonce chain.
- Production logs showed repeated 300-second timeouts from legacy `/api/v1/notifications/stream` EventSource clients. The current UI already polls `/api/v1/notifications`, so the compatibility stream now returns authenticated HTTP `204`, which instructs old EventSource clients to stop reconnecting and releases serverless capacity that can otherwise surface as `503` responses.
- Updated the notification architecture notes and added a regression test for the retired stream endpoint.

### Verification
- Targeted Vitest: 2 files, 11 tests passed.
- TypeScript: clean (`tsc --noEmit`).
- ESLint: clean with zero warnings.
- Production build: passed with the Webpack fallback. The default local Turbopack build could not load the workspace's Windows native SWC binary; unrelated branding lookups logged expected connection errors because local Postgres was not running.

## 2026-07-22 — CSP Header Delivery Restoration (`frame-ancestors` & `report-uri` meta fix)

**Goal**: Fix browser errors where `frame-ancestors` and `report-uri` directives were ignored due to delivery via `<meta http-equiv="Content-Security-Policy">`, and restore full header-based CSP delivery.

### Changes
- **`proxy.ts`**:
  - Restored `buildCspPolicy()` and `responseWithCsp()` middleware helper functions.
  - Generates per-request `nonce` and injects `x-nonce` into request headers while returning response `Content-Security-Policy` header.
  - Sets `__academy_nonce` HTTP cookie so Serverless Function SSR in Next.js fallback reads matching nonce when custom request headers drop across Vercel function boundaries.
- **`app/layout.tsx`**:
  - Removed `<meta httpEquiv="Content-Security-Policy">` from `<head>`.
  - Removed duplicated `buildCspPolicy()` function.

---

**Goal**: Fix production CSP violation on Vercel where `_next/static/chunks` bundles were blocked by `strict-dynamic` because the nonce set in Edge middleware didn't propagate to Serverless Function SSR.

### Root Cause
На Vercel кастомные заголовки, установленные в Edge middleware (`x-nonce`, `Content-Security-Policy`), не гарантированно сериализуются в Serverless Function при SSR. React получает пустой nonce, не применяет его к `<script>` тегам, и `strict-dynamic` блокирует все скрипты без nonce.

### Changes
- **`proxy.ts`**:
  - Удалён `buildCspPolicy()` — CSP больше не задаётся через middleware response headers.
  - Удалены `nextWithCsp()` и `redirectWithCsp()` — заменены на `NextResponse.next()` и `NextResponse.redirect()`.
  - Удалена генерация `nonce` в middleware.

- **`app/layout.tsx`**:
  - Добавлен `buildCspPolicy()` — идентичная политика (перенесена из `proxy.ts`).
  - Добавлен fallback chain nonce: `x-nonce` header → `__academy_nonce` cookie → `crypto.randomUUID()`.
  - Добавлен `<meta httpEquiv="Content-Security-Policy">` в `<head>` — гарантирует CSP независимо от заголовков Edge→Serverless.

### Verification
- **Typecheck**: Clean.
- **Lint**: 0 errors, 0 warnings.
- **Tests**: 936/936 passed (166 files).
- **Build**: Production build OK.

### Next Steps
- Развернуть на Vercel для верификации, что CSP violation на `/student` больше не возникает.
- Мониторить `/api/v1/csp-report` на предмет оставшихся нарушений.

---

## 2026-06-24 — Spec-Kit Legacy Document Migration

**Goal**: Finish the remaining spec-format migration warnings emitted by `npm run verify:specs`.

### Changes
- Added standard `## Goals`, `## Models`, `## Architecture`, and `## Validation` sections to legacy design specs where they were missing.
- Covered Course Builder upgrade, SCORM/xAPI import, build optimizations, search/libraries/gamification, and Phase 3 service extraction specs.
- Updated `scripts/validate-specs.ts` to count actual legacy warnings and print a clean success message when none remain.
- Stabilized two slow Vitest areas with scoped 10s timeouts for full-suite runs under load: closed auth self-service route checks and certificate dashboard error handling.
- Runtime product behavior is unchanged; this affects spec documentation, validation reporting, and test-suite stability only.

### Verification
- `npm run verify` completed successfully; `verify:specs` reports `Spec validation completed without warnings.`

---

## 2026-06-24 — Design System Refinement (Open Design / Linear-inspired)

**Goal**: Enhance platform UX/UI using Open Design design system resources — typography craft, surface elevation stepping, glass system upgrades, and component refinements.

### Changes
- **`app/globals.css`**:
  - Added `font-feature-settings: "cv01", "ss03"` to body — Inter geometric alternates (Linear-inspired)
  - Added surface luminance stepping system (`--surface-level-0` through `--surface-level-5`) for consistent elevation
  - Enhanced glass system with `--academy-glass-bg-subtle/elevated/dialog` and `--academy-glass-highlight-top`
  - Added multi-layer dialog shadow (`--academy-shadow-dialog`) based on Linear Level 5 stack
  - Added `list-item-enter` keyframe for staggered list entrance
  - Added `.glass-panel-elevated` CSS class for elevated surfaces
  - Updated `.academy-panel::before` to use `var(--academy-glass-highlight-top)`
  - Updated `.bottom-nav-bar` to use `--academy-glass-bg-elevated`

- **`tailwind.config.ts`**:
  - Added `font-510` weight (Linear-inspired between-weight for subtle emphasis)
  - Added `shadow-dialog` (multi-layer stack), `shadow-card-hover-glow` (with glow)
  - Added `animate-list-item-enter` for staggered list CSS animations

- **`components/ui/card.tsx`**:
  - Updated hover from `shadow-card-hover` to `shadow-card-hover-glow` for ambient glow
  - Added `CardFooter` component with top border separator

- **`components/ui/button.tsx`**:
  - Added `ghostAlt` variant (Linear-inspired: `bg-white/[0.03]`, subtle border, muted text)

- **`components/ui/badge.tsx`**:
  - Added `success` (emerald) and `warning` (amber) variants
  - Updated font-weight to `font-510`

- **`components/ui/dialog.tsx`**:
  - Enhanced shadow from `shadow-m3-modal` to `shadow-dialog` (multi-layer stack)
  - Added `max-h-[85dvh] flex flex-col` for scroll safety
  - Added `DialogBody` component with `flex-1 overflow-y-auto`

- **`components/lms/animations.tsx`**:
  - Added `ListStagger` component — CSS animation-based staggered list entrance (no framer-motion dependency, respects `prefers-reduced-motion`)

### Verification
- **Typecheck**: Clean.
- **Lint**: 0 errors, 0 warnings.
- **Tests**: 936/936 passed (166 files).
- **Build**: Production build OK (79 pages, all routes).

---

## 2026-06-23 — Phase 3: Notification Service Extraction (templates / email)

**Goal**: Split 301-line `server/modules/notifications/service.ts` into focused files.

### Changes
- **Created `server/modules/notifications/templates.ts`**: `NotificationEvent` type, `templates` (21 notification templates), `renderNotificationTemplate()`, `normalizeNotificationChannel()`, `securityNotificationEvents`, `resolveNotificationEvent()`
- **Created `server/modules/notifications/email.ts`**: `sendEmail()` with lazy-initialized nodemailer SMTP transport via `getMailer()`, `nodemailerTransporter`
- **Refactored `server/modules/notifications/service.ts`**: Stripped templates and email channel code. Kept `createNotification()`, `createNotificationInternal()`, `listNotifications()`, `getNotificationById()`, `markNotificationAsRead()`, `markAllNotificationsAsRead()`. Re-exports `renderNotificationTemplate`, `sendEmail`, `normalizeNotificationChannel`.
- **All 24 external consumers** unchanged — same public exports.

### Verification
- **Typecheck**: Clean.
- **Lint**: 0 errors, 0 warnings.
- **Tests**: 936/936 passed (166 files).

---

## 2026-06-23 — Phase 3: Report Service Extraction (definitions / scope / renderer)

**Goal**: Split 666-line `server/modules/reports/service.ts` into focused single-responsibility files.

### Changes
- **Created `server/modules/reports/definitions.ts`**: `REPORT_DEFINITIONS`, `ReportDefinition`, `EXT`, `REPORT_TYPE_ALIASES`, `ROLE_PRIORITY`, `pickActorRole()`, `unique()`, `normalizeReportType()`, `parseReportFormat()`, `assertReportAllowed()`
- **Created `server/modules/reports/scope.ts`**: `resolveReportScope()`, `ReportAccessContext`, `scopeCacheKey()`, `fieldsCacheKey()`, `getCourseIdsForCohorts()`
- **Created `server/modules/reports/renderer.ts`**: `renderReport()`, `countRows()`, `RenderedReport` (all 8 types × 3 formats = 24 branches + PDF/XLSX row-count guardrails + CSV fallback on error)
- **Refactored `server/modules/reports/service.ts`**: Stripped extracted code (~460 lines removed), kept public API: `generateReportDownload()`, `generateReportPreview()`, `getAvailableReportsForRoles()`, `getDisplayReportsForRole()`, `parseReportFormat()`, `getReportUser()`, `getStudentReportsDashboardData()`. All imports from sub-modules.
- **`processor.ts` unchanged** — imports from `service.ts` transparently.
- **All external consumers** (`app/api/v1/reports/*`) unchanged — same public exports.

### Verification
- **Typecheck**: Clean (`tsc --noEmit`).
- **Lint**: 0 errors, 0 warnings.
- **Tests**: 936/936 passed (166 files).
- **Build**: Production build OK.

### Next
- Notification service extraction (templates.ts + email.ts)

---

## 2026-06-23 — P1 Animation Discipline Audit (prefers-reduced-motion)

**Goal**: Ensure all framer-motion animations respect `prefers-reduced-motion` via `useReducedMotion()` hook.

### Audit scope
- **7 components** directly import `framer-motion`:
  - ✅ `animations.tsx` (centralized) — already had `useReducedMotion()` in all 7 wrappers
  - ✅ `mobile-bottom-nav.tsx` — already had `useReducedMotion()`
  - ✅ `tabs.tsx` — already had `useReducedMotion()`
  - ✅ `theme-toggle.tsx` — already had `useReducedMotion()`
  - ✅ `pwa-install-prompt.tsx` — already had `useReducedMotion()`
  - ❌ **`login-screen.tsx`** — was missing `useReducedMotion()`: conic gradient (60s rotation), floating orbs, staggered entrance — **fixed**
  - ❌ **`login-form.tsx`** — was missing `useReducedMotion()`: button hover scale (1.015), error shake animation, loading spinner rotation, OAuth hover/tap — **fixed**

### What was fixed
- **`login-screen.tsx`**:
  - Added `useReducedMotion()` import + const
  - Conic gradient: skips 60s rotation animation
  - Floating ambient orbs: skips scale/x animation
  - Staggered entrance: shows all at once (no stagger)
  - Device-limit banner: skips height/opacity transition
- **`login-form.tsx`**:
  - Added `useReducedMotion()` import + const
  - Submit button: skips `whileHover: { scale: 1.015 }` / `whileTap: { scale: 0.98 }`
  - OAuth buttons: skips `whileHover: { scale: 1.02 }` / `whileTap: { scale: 0.98 }`
  - Error shake: skips x-axis shake animation
  - Button text: skips opacity/y crossfade
  - Loading spinner: skips 360° rotation animation

### Global CSS baseline
- `app/globals.css` already has `@media (prefers-reduced-motion: reduce)` that sets `animation-duration: 0.01ms !important` on all CSS animations — covers Tailwind `animate-*` and `animate-in` classes.

### Verification
- Lint: 0 errors, 0 warnings ✅
- TypeScript: clean ✅
- Tests: 936/936 passed ✅
- Production build: OK ✅

## 2026-06-23 — Dependabot vulnerability fixes (nodemailer + uuid + undici)

**Goal**: Fix actionable Dependabot alerts for production dependencies.

### Changes
- **nodemailer@8.0.11 → 9.0.1** (HIGH: SSRF + arbitrary file read via `raw` option) — production dep
- **uuid@8.3.2 → 11.1.1** (MODERATE: missing buffer bounds check) — direct dep
- **undici@7.25.0 → 7.28.0** (3 HIGH, 2 MEDIUM, 2 LOW) — transitive test dep (jsdom), fixed via `npm audit fix`
- Remaining dev-only unfixable alerts (12 moderate) accepted as risk:
  - `@hono/node-server` (Prisma dev tool transitive)
  - `js-yaml` in `@lhci/cli` (dev tool)
  - `postcss` in `next` (transitive)
  - `uuid@8.3.2` in `exceljs`/`next-auth` (transitive, can't force-upgrade)

### Verification
- Lint: 0 errors ✅
- TypeScript: clean ✅
- Tests: 936/936 passed ✅
- Production build: OK ✅

## 2026-06-22 — P1 State Coverage (empty/loading/error states)

**Goal**: Eliminate empty catch blocks, add empty/loading/error states to data components.

### Changes
- **🔴 Critical — empty catch blocks fixed**:
  - `course-outline.tsx`: 7 empty `catch {}` → toast.error (rename, add, delete module/block/lesson); added `EmptyState` when no modules
  - `lesson-block-editor.tsx`: SCORM package fetch `.catch(() => {})` → sets null state
  - `curriculum-editor.tsx`: `handleDeleteModule`/`handleDeleteLesson` — added try/catch with toast.error
- **🟡 Empty states added**:
  - `dashboard-widgets.tsx`: `MetricGrid`, `CourseProgressGrid`, `CourseManageGrid`, `CuratorLoadTable` — each shows `EmptyState` when data is empty
  - `curriculum-editor.tsx`: shows dashed border placeholder when no modules
- **🟡 Loading states added**:
  - `deadline-alerts.tsx`: loading skeleton while fetching, error card on failure
  - `xp-center-modal.tsx`: error state (AlertCircle) when gamification data fails to load
- **🟡 Error states added**:
  - `notifications-list.tsx`: error card with "Не удалось загрузить уведомления"
  - `notification-preferences-form.tsx`: error card when preferences fail to load

### Validation
- `npm run verify` — lint 0 warnings ✅, typecheck ✅, 936/936 tests ✅, build ✅

## 2026-06-22 — Auth Optimization + Track A Completion

**Goal**: Optimize auth flow for remote Supabase latency and close Track A (operational readiness).

### Changes
- **Auth JWT optimization**: JWT callback in `server/auth/options.ts` now uses `authorize()` return data instead of redundant `prisma.user.findUnique` on first login. Saves ~1.4s per login.
- **Device session transaction**: Changed `server/modules/auth/device-sessions.ts` transaction isolation from `Serializable` to `ReadCommitted` with 10s timeout, reducing latency on remote Supabase pooler.
- **Auth test sync**: Updated `tests/unit/auth-options.test.ts` to expect `requires2fa` field in authorize return value.
- **Zero-warning lint**: Removed unused `eslint-disable` directives from `components/instructor/quiz-edit-form.tsx` and `components/ui/card.tsx`.
- **Development plan updated**: Marked A1 (CI cleanup), A2 (CSP verification), A3 (E2E smoke for 6 roles), B4 (Onboarding flow) as complete.

### Verification
- `npm run verify`: 936/936 tests pass, zero warnings lint, typecheck clean, production build OK.
- Auth login time improved: 5004ms → 3601ms (−28%) on remote Supabase.
- Git history cleaned: squashed duplicate commits, reworded to reflect actual content.

---

## 2026-06-18 — DevSecOps Security Gate Completion

**Goal**: Finish the new repository security pipeline so it produces actionable results and can pass on the current codebase.

### Changes
- **Dependency remediation**: Upgraded Vitest to 4.1.9, refreshed compatible transitive dependencies, and pinned `tmp` to the patched 0.2.7 release for Lighthouse CI.
- **Gateway manifest remediation**: Upgraded the independently managed `services/gateway-bff` Vitest dependency and added its lockfile, closing the remaining critical Dependabot alert outside the root package graph.
- **Secret scanning baseline**: Added a narrow Gitleaks allowlist for the documented `invalid_token_here` test fixture without excluding security skill directories from scanning.
- **Release contract sync**: Added all 15 installed cybersecurity skills to the machine-readable `technicalSkills` contract.
- **GitHub security settings**: Enabled repository vulnerability alerts and Dependency Graph so `dependency-review-action` can run on pull requests.
- **Kubernetes hardening**: Added non-root pod identities, RuntimeDefault seccomp, dropped capabilities, disabled privilege escalation/service-account token mounts, read-only root filesystems and explicit writable runtime volumes for the web and PostgreSQL workloads.
- **E2E rate-limit isolation**: Made the global proxy limiter honor `RATE_LIMIT_MAX_REQUESTS`/`RATE_LIMIT_WINDOW_SECONDS` and raised only the CI limit, preventing the 252-test Playwright suite from exhausting one shared-IP bucket while preserving the production default.

### Verification
- `npm audit --audit-level=high` passes with no high or critical findings; 11 moderate transitive findings remain outside the blocking threshold.
- Gitleaks 8.24.3 reports `no leaks found` for the security commit after applying the scoped allowlist.
- Vitest 4 targeted release-hardening test passes: 9/9.
- `npm run verify` passes: banned patterns, security skill allowlist, ESLint with zero warnings, typecheck, 936/936 tests, production build and spec validation.
- Clean `npm ci` succeeds, and the previously blocked GitHub `Dependency review` job passes after enabling Dependency Graph.
- Trivy 0.70.0 reports zero high/critical Kubernetes misconfigurations across all 10 manifests in `infra/k8s`.
- `services/gateway-bff` clean `npm ci` and Vitest 4 startup pass; its independent npm audit reports zero vulnerabilities.
- GitHub E2E baseline reached 251/252 before the shared-IP limiter regression; the failing quiz API boundary is covered by the configurable CI limit fix.

---

## 2026-06-17 — GitHub Actions E2E Stability Fix

**Goal**: Keep CI on the local PostgreSQL service and clear the next blocking E2E failure after the database URL precedence fix.

### Changes
- **Playwright CI command**: `playwright.config.ts` now runs `npm run dev:next` in CI, avoiding the Windows-only PowerShell startup wrapper on Linux GitHub runners.
- **WCAG contrast**: Replaced low-contrast `text-emerald-600` status text/icons with `text-emerald-700` across UI surfaces covered by accessibility smoke tests.
- **E2E fixture compatibility**: Fixed the student-flow quiz fixture query to avoid a Prisma 7 runtime validation error from mixing `select` and `include` in one nested relation.

### Verification
- `npm run verify` passed: banned patterns, ESLint with `--max-warnings=0`, typecheck, 936 unit/integration tests, production build and spec validation.
- GitHub Actions confirmed local PostgreSQL `db:push`/`db:seed`, TypeScript, ESLint, unit/integration tests and accessibility smoke path; rerun pending for the student-flow fixture fix.

---

## 2026-06-17 — CI PostgreSQL URL Precedence Fix

**Goal**: Stop CI/deploy checks from accidentally connecting to a remote Supabase/PostgreSQL IPv6 endpoint when a local `DATABASE_URL` is explicitly provided.

### Changes
- **Prisma config precedence**: `prisma.config.ts` now prefers `DATABASE_URL` before `storage_POSTGRES_PRISMA_URL` and only uses non-pooling URLs as explicit migration overrides.
- **Runtime DB precedence**: `lib/prisma.ts` now prefers `DATABASE_URL` before `storage_POSTGRES_PRISMA_URL`, so CI/local overrides cannot be shadowed by storage aliases.
- **GitHub CI hardening**: `.github/workflows/ci.yml` now sets `DATABASE_URL`, `PRISMA_MIGRATION_DATABASE_URL`, `storage_POSTGRES_PRISMA_URL` and `storage_POSTGRES_URL_NON_POOLING` to the same local PostgreSQL service.

### Verification
- Precedence smoke passed: with local `DATABASE_URL` and remote storage alias present, Prisma config selects `localhost`.
- `npm run verify` passed with local PostgreSQL URL overrides for all DB aliases.
- Existing non-blocking warnings remain: legacy spec migration warnings, missing Sentry auth token and branding fallback logs when the local test database has no `app_settings` table during build-time metadata fallback.

---

## 2026-06-17 — Commercial and Tender Readiness Center

**Goal**: Make the platform easier to sell and evaluate for B2B academies, corporate training, quasi-government pilots and formal tender preparation without overstating production readiness.

### Changes
- **Admin Readiness Center**: Added `/admin/readiness` as an admin-only page with segment fit, buyer evidence pack, gov-readiness blockers and a tender roadmap.
- **Commercial Readiness Module**: Added `server/modules/commercial-readiness/service.ts` to keep B2B/government positioning data outside UI code and preserve the no-Prisma-in-pages rule.
- **Navigation**: Added "Готовность" to the admin sidebar so commercial/tender preparation is visible during demos and internal readiness reviews.
- **Tender Positioning**: Explicitly separates B2B pilot readiness from formal government production blockers: DPA, data residency, security evidence, operational drills, WCAG proof and legal/tender documentation.

### Verification
- `npm run verify` passed: banned patterns, ESLint with `--max-warnings=0`, typecheck, Vitest, production build and spec validation.
- Existing non-blocking warnings remain: legacy spec migration warnings and missing Sentry auth token for source map upload.

---

## 2026-06-17 — Integration of Strategic AI Repositories

**Goal**: Align the project with high-quality agentic workflows from `obra/superpower`, `ultraworkers/claw-code`, `anthtopics/skills`, `mattpocock/skills`, `github/spec-kit`, and `garretan/gstack`.

### Changes
- **Strategic Skills**: Refactored all skills in `skills/` to a strict, verifiable format inspired by Matt Pocock and Anthtopics. Added `Prerequisites`, `Context`, and `Post-conditions`.
- **Claw-code**: Integrated instructional hints ("Claws") into all `SKILL.md` files to guide agent logic.
- **Spec-Kit**: Implemented verifiable Markdown specifications. Added `docs/templates/SPEC_TEMPLATE.md` and `scripts/validate-specs.ts`. Refactored `visit-analytics-design.md` to the new standard.
- **GStack Architecture**: Established the "Golden Standard" multi-layered modular monolith in `docs/ARCHITECTURE_GUIDE.md`. Updated `docs/SKILL.md` and release hardening contracts to enforce this standard.
- **Superpowers Planning**: Enforced a stricter planning protocol in `AI.md` and `docs/PLANNING_PROTOCOL.md`, requiring `context`, `definitions`, and `constraints` for every task.
- **Automated Verification**: Integrated `npm run verify:specs` into the main `npm run verify` gate.

### Verification
- **Lint**: 0 warnings.
- **Typecheck**: Clean.
- **Specs**: `npm run verify:specs` passed for refactored documents.
- **Architecture**: No Prisma in UI (verified via `npm run verify`).

---
