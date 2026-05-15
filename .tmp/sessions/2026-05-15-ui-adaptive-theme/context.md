# Task Context: UI Adaptive Theme + Mobile App-like Experience

Session ID: 2026-05-15-ui-adaptive-theme
Created: 2026-05-15T19:44:00+03:00
Status: in_progress

## Current Request
Настроить UI так, чтобы с мобилки это выглядело как мобильное приложение, а с ПК как профессиональное ПК приложение. Отработать светлую/тёмную тему и адаптив. Внедрить PWA.

## Context Files (Standards to Follow)
- ai/roles/frontend-lms-ux.md — frontend role, mobile-first LMS UX

## Reference Files (Source Material to Look At)
- app/globals.css — current theme variables and global styles
- app/layout.tsx — root layout
- components/providers.tsx — theme provider, query, session
- components/layout/app-shell.tsx — main app layout shell
- components/layout/mobile-nav.tsx — current mobile hamburger nav
- components/layout/site-header.tsx — sticky header
- components/layout/nav-links.tsx — sidebar nav links
- components/layout/navigation.ts — nav items by role
- components/layout/user-account-nav.tsx — user dropdown
- components/lms/theme-toggle.tsx — current theme toggle
- components/lms/animations.tsx — framer-motion animations
- components/lms/pwa-register.tsx — current PWA registration
- components/ui/card.tsx — card component
- components/ui/button.tsx — button component
- components/ui/sheet.tsx — sheet/drawer component
- tailwind.config.ts — Tailwind config
- public/ — static assets (manifest, icons)
- app/manifest.ts or similar PWA manifest

## External Docs
- next-themes documentation for theme provider
- next-pwa or PWA approach in Next.js 16

## Components to Create/Modify

1. **globals.css** — Enhanced CSS variables for both themes, safe-area-inset, mobile app-like body, refined glass effects
2. **components/layout/mobile-bottom-nav.tsx** — NEW: Bottom tab bar for mobile (app-like)
3. **components/layout/app-shell.tsx** — Restructured: mobile bottom nav + desktop sidebar
4. **components/layout/site-header.tsx** — Adaptive: compact mobile (scroll-hide) + full desktop
5. **components/layout/mobile-nav.tsx** — Removed/repurposed
6. **components/layout/nav-links.tsx** — Enhanced for bottom nav use
7. **components/lms/theme-toggle.tsx** — 3-mode toggle with animation
8. **components/ui/card.tsx** — Touch-friendly sizing
9. **components/ui/button.tsx** — Touch-friendly sizing
10. **app/layout.tsx** — PWA meta tags enhancement
11. **public/manifest.json** — PWA manifest update
12. **PWA strategy** — Service worker, offline support

## Constraints
- Russian-only UI
- Next.js 16 App Router
- Tailwind CSS with class-based dark mode
- Framer Motion for animations
- Radix UI primitives for dialogs/sheets
- PWA must work: install prompt, offline fallback, push notifications
- Must not break existing role pages (admin, student, curator, etc.)

## Exit Criteria
- [ ] Mobile: bottom tab bar navigation, full-height app-like feel, no desktop sidebar
- [ ] Desktop: professional sidebar layout, proper spacing, hover effects
- [ ] Light/dark theme: smooth transition, system preference respect
- [ ] Responsive: all breakpoints work (mobile, tablet, desktop)
- [ ] PWA: install prompt works, offline page, manifest correct
- [ ] Build succeeds with no TypeScript errors
- [ ] No regressions in existing functionality
