# Changelog

## v1.0.0 (2026-05-24)

### Production Hardening
- **Метрики скорости ответов куратора**: per-student avgResponseHours и avgChatResponseHours в дашборде куратора; per-student breakdown для супер-куратора
- **Анонимизация имён студентов**: `Слушатель #XXXXX` для не-admin ролей на всех дашбордах
- **Устранение build noise**: `force-dynamic` на 15 страницах (подавление `Dynamic server usage` логов)
- **Восстановление report-designer.tsx**: компонент удалён в UI 4, восстановлен
- **Vercel preview**: codex/* ветки деплоятся в preview-окружение

### Deep Database Audit
- **12 FK-индексов**: добавлены недостающие индексы на внешние ключи (oauth_accounts, sessions, lesson_media, cohorts, quiz_questions, certificate_templates, admin_popups, popup_views, reports, import_jobs)
- **RLS отключён**: на всех 56 таблицах. Приложение использует Prisma server-side, Supabase REST API не применяется. Удалены 9 устаревших RLS-политик.
- **Схема cohorts исправлена**: добавлены 4 недостающие колонки (`project_id`, `starts_at`, `ends_at`, `updated_at`)
- **Миграция add_block_model исправлена**: удалена FK-ссылка на `enrollments`

### Code Quality
- **Zod-валидация + try/catch**: все 18 файлов в `server/actions/` покрыты
- **Metadata**: 105 page.tsx с русскими title/description
- **loading.tsx**: 84 route-директории с skeleton (PageSkeleton + AppShell)
- **global-error.tsx**, **robots.txt**, **sitemap.ts**: созданы
- **Lint**: 0 errors, 0 warnings

### Mobile Adaptation
- **student-achievements.tsx**: accordion (collapsed on mobile, `md:` always visible), `onClick` toggle (touch), `flex-wrap`, `line-clamp-2`
- **xp-display-client.tsx**: убраны `group-hover` анимации (не работали на тач), `active:scale-[0.99]` tactile feedback
- **2FA page**: metadata moved from `"use client"` page to layout

### Security Fixes
- **`curator-enhanced.ts`**: `take: 500` на безлимитные запросы сообщений; удалён неиспользуемый `include: roles`
- **`super-curator.ts`**: `take: 500` на запрос сообщений в `getCuratorActivity`
- **`risk-management.ts`**: проверка `actor.roles.includes("admin")` при маскировке имён

### Bug Fixes
- **Vercel build error**: 4 corrupted JSX files после битого merge (dashboard-widgets.tsx, student-achievements.tsx, student-course-dashboard-grid.tsx, xp-display-client.tsx) — восстановлены рабочие копии
- **Corrupted files fixed**: откат до рабочей версии после неудачного merge

### DevOps
- **GitHub**: Repo description, `delete_branch_on_merge=true`, Discussions enabled
- **Release v1.0.0**: создан с полным CHANGELOG.md + тег `рабочая-версия`
- **Branch protection**: отключена на main (прямые push разрешены)
- **Vercel**: auto-deploy на push в main

### Verification
- TypeScript: clean ✅
- Tests: 422/422 passed (69 files) ✅
- Build: 87 pages, 0 errors ✅
- E2E smoke: 52/52 (Chromium + Pixel 7) ✅
