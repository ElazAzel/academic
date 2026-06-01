# TODO — AI Strategic Academy

Дата актуализации: 2026-05-31

Итоговый статус готовности и WP0-WP6 см. в `docs/READINESS.md`.

## Ближайшие задачи

| # | Задача | Домен | Приоритет | Статус |
| --- | -------- | ------- | ----------- | -------- |
| 0 | **Полная оптимизация и доказанная работоспособность платформы** | Program | P0 | 🟡 Цель создана: `docs/FULL-OPTIMIZATION-GOAL.md` |
| 1 | **Мониторинг Vercel auto-deploy** | DevOps | P1 | 🔄 После пуша in main |
| 2 | **DPA подписание (Vercel + Supabase)** | Legal | P1 | 🔴 Не подписан |
| 3 | **Ротация скомпрометированного Supabase пароля** | Security | P1 | 🔴 Требуется вручную в дашборде Supabase |
| 4 | **Staging-окружение** | DevOps | P2 | ✅ Ветка staging и инструкция добавлены |
| 5 | **Git purge __dbcheck.mjs из истории** | Security | P2 | ✅ `git filter-branch` + rebase — файл удалён из всей истории, force-push выполнен |
| 6 | **CSP: nonce-based script-src** | Security | P2 | ✅ nonce-based, без unsafe-inline в production |
| 7 | **E2E full suite (все роли + сценарии)** | QA | P2 | 🟡 Только smoke (52/52) |
| 8 | **Email notifications (SMTP wiring)** | Notifications | P2 | 🟡 Web Push/VAPID работает, SMTP pending |
| 9 | **WCAG 2.1 AA full audit** | UX | P2 | 🟡 Lighthouse asserts настроены |

## Выполнено (Phase 0)

- [x] Аутентификация (email/password + OAuth)
- [x] RBAC (6 ролей)
- [x] Курсы / модули / уроки / builder
- [x] Прогресс (sequential unlock)
- [x] Тесты (autograding, attempts)
- [x] Задания (submissions, review)
- [x] Сертификаты (PDF, unique number, verification)
- [x] Чат (студент ↔ куратор, вложения)
- [x] Уведомления (in-app + Web Push/VAPID)
- [x] Аналитика / отчёты (CSV, XLSX, PDF)
- [x] Риски (flags, filters, curator/super-curator)
- [x] Глоссарий (категории, поиск)
- [x] Администрирование (пользователи, потоки, инвайты, CSV import)
- [x] PWA (manifest, SW, push, Apple Web App)
- [x] 2FA (TOTP)
- [x] **FK-индексы (12 шт)** — добавлены ✅
- [x] **RLS отключён** — все 56 таблиц ✅
- [x] **Схема cohorts** — исправлена ✅
- [x] **Миграция add_block_model** — исправлена ✅
- [x] **Zod-валидация + try/catch** — 18 server actions ✅
- [x] **Metadata** — 105 page.tsx ✅
- [x] **loading.tsx** — 84 routes ✅
- [x] **global-error.tsx / robots.txt / sitemap.ts** ✅
- [x] **Анонимизация студентов** — Слушатель #XXXXX ✅
- [x] **Скорость ответов куратора** — per-student метрики ✅
- [x] **Mobile adaptation** — Achievements accordion, XP touch ✅
- [x] **GitHub Release v1.0.0** ✅
- [x] **CHANGELOG.md** ✅
- [x] **Prisma boundary cleanup** — direct Prisma удален из `app/**/page.tsx`
  и `components/**`, добавлен unit-guard ✅
- [x] **E2E wait cleanup** — `networkidle` удален из Playwright smoke-тестов,
  навигация совместима с SSE ✅

## Стратегические задачи (Phase 1-4)

| # | Задача | Фаза | Статус |
| --- | -------- | ------ | -------- |
| 1 | Real-time уведомления (SSE) | 2 | ✅ Реализовано на ReadableStream, SSE endpoint + useNotifications hook |
| 2 | SCORM/xAPI import | 2 | ✅ Реализовано (SCORM ZIP import, CMI backend, LRS) |
| 3 | Video hosting (YouTube + Vimeo) | 2 | ✅ |
| 4 | Forum/discussion per lesson | 2 | ✅ |
| 5 | Attendance analytics | 2 | ✅ |
| 6 | Notification service extraction | 3 | ❌ |
| 7 | Report generation service extraction | 3 | ❌ |
| 8 | Search extraction (MeiliSearch/Elastic) | 3 | ❌ |
| 9 | AI recommendations engine | 4 | ❌ |
| 10 | Adaptive learning paths | 4 | ❌ |
| 11 | NLP curator assistant | 4 | ✅ Реализовано (MVP full-text search, assistant Server Action, UI panel) |
| 12 | Mobile native app | 4 | ❌ |
