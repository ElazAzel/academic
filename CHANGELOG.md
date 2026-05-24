# Changelog

## v1.0.0 (2026-05-24)

### Production Hardening
- **Метрики скорости ответов куратора**: per-student avgResponseHours и avgChatResponseHours в дашборде куратора; per-student breakdown для супер-куратора
- **Анонимизация имён студентов**: `Слушатель #XXXXX` для не-admin ролей на всех дашбордах
- **Устранение build noise**: `force-dynamic` на 15 страницах (подавление `Dynamic server usage` логов)
- **Восстановление report-designer.tsx**: компонент удалён в UI 4, восстановлен

### Deep Database Audit
- **12 FK-индексов**: добавлены недостающие индексы на внешние ключи (oauth_accounts, sessions, lesson_media, cohorts, quiz_questions, certificate_templates, admin_popups, popup_views, reports, import_jobs)
- **RLS отключён**: на всех 56 таблицах. Приложение использует Prisma server-side, Supabase REST API не применяется. Удалены 9 устаревших RLS-политик.
- **Схема cohorts исправлена**: добавлены 4 недостающие колонки (`project_id`, `starts_at`, `ends_at`, `updated_at`), присутствовавшие в Prisma schema, но отсутствовавшие в БД
- **Миграция add_block_model исправлена**: удалена FK-ссылка на `enrollments` (таблица ещё не существовала на момент миграции)

### Security Fixes
- **`curator-enhanced.ts`**: `take: 500` на безлимитные запросы сообщений; удалён неиспользуемый `include: roles`
- **`super-curator.ts`**: `take: 500` на запрос сообщений в `getCuratorActivity`
- **`risk-management.ts`**: проверка `actor.roles.includes("admin")` при маскировке имён

### Verification
- TypeScript: clean
- Tests: 419/419 passed (67 files)
- Build: 87 pages, compiled successfully
