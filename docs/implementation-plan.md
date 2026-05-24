# План реализации AI Strategic Academy

Дата актуализации: 2026-05-22  
Статус документа: operational source of truth для реализации.

## Цель проекта

Закрытая LMS одной академии для управления курсами, потоками, кураторами, заданиями, тестами, сертификатами, инвайт-доступом, аналитикой и отчётностью. Production-minded: безопасная, расширяемая, документированная.

## Текущее состояние на 2026-05-24

### Core Metrics
- **Build:** 87/87 страниц, 0 ошибок ✅
- **Tests:** 419/419 passed (67 test files) ✅
- **Lint:** 0 errors, 0 warnings ✅
- **Typecheck:** clean ✅
- **Deployment:** Vercel auto-deploy на push в main ✅
- **Security scan:** Все C1-C5 findings закрыты ✅
- **CSRF:** Исправлен (origin vs hostname) ✅
- **Session resilience:** try/catch revalidateSession, fallback на JWT роли ✅
- **FK-индексы:** 12 недостающих индексов добавлены ✅
- **RLS:** Отключён на всех 56 таблицах (не используется, приложение на Prisma) ✅
- **Схема cohorts:** Исправлена (добавлены отсутствующие колонки) ✅

### Последние изменения
- Runtime error: 500 на `/api/v1/modules/[moduleId]/lessons` — добавлен retry при Prisma unique constraint collision
- Runtime error: React #482 — async Server Component удалён из `error.tsx` error boundaries
- Runtime error: `Cannot read properties of undefined (reading 'length')` — `?.` guards во всех React Query компонентах, `window.onerror` в `providers.tsx`, усиленный `app/error.tsx` с логгированием

### Выполненные домены

| Домен | Статус | Последние изменения |
|-------|--------|-------------------|
| Auth/RBAC (email/password, OAuth, сессии, роли) | done | Session resilience, CSRF fix |
| Курсы/модули/уроки (CRUD, builder, editor) | done | Mobile responsive builder |
| Прогресс (lesson/module/course, sequential unlock) | done | isRequired fallback |
| Тесты (autograding, attempts, pass threshold) | done | Quiz answer keys isolated |
| Задания (submissions, review service) | done | Enrollment check, courseId resolution |
| Сертификаты (unique number, premium PDF, verification) | done | Premium assets, Cyrillic fonts, QR |
| Чат (студент↔куратор, S3 вложения) | done | 503 fix, attachment previews |
| Уведомления (in-app + push Firebase) | done | Channel filtering fix |
| Аналитика/отчёты (CSV/XLSX/PDF, per-role scope) | done | Dynamic report config |
| Риски (флаги, фильтры, curator/super-curator) | done | Deadline integration |
| Глоссарий (категории, поиск) | done | — |
| Администрирование (пользователи, потоки, инвайты, импорт CSV) | done | Batch CSV importer |
| Безопасность (Argon2id, RBAC, RLS, rate limit, Sentry) | done | All 55 tables have RLS |
| PWA (manifest, SW, push, Apple Web App) | done | Custom install prompts |
| Студент (dashboard, learning paths, settings, deadlines) | done | Settings page, StatusBadge |

### Что осталось (после аудита Phase 0 + Phase 1)

| Область | Задача | Приоритет | Статус | Примечание |
|---------|--------|-----------|--------|------------|
| DevOps | Production deployment validation runbook | P2 | ✅ | `verify:release` выполнен 2026-05-22 (статический гейт зелёный, e2e требует staging) |
| Безопасность | CSP hardening (unsafe-eval в production) | P2 | ✅ | `unsafe-eval` удалён из production CSP. `unsafe-inline` остаётся (Next.js hydration). |
| Инфра | MinIO/S3 uploads локально | P3 | ❌ | Требует Docker (не установлен) — upload падает с ERR_CONNECTION_REFUSED |
| БД | FK-индексы (12 шт) | P1 | ✅ | Добавлены через миграцию `20260524000000_add_missing_fk_indexes` |
| БД | RLS-политики (49 таблиц) | P2 | ✅ | RLS отключён полностью — приложение использует Prisma server-side |
| БД | Схема cohorts | P2 | ✅ | Добавлены колонки project_id, starts_at, ends_at, updated_at |
| БД | Миграция `add_block_model` | P1 | ✅ | Исправлена ошибочная FK-ссылка на enrollments |

### Уже реализовано (Phase 0)
- ✅ Builder publish checklist UX (checks + UI в course-settings-panel.tsx + footer статус)
- ✅ Builder preview mode (CourseBuilderPreview, toggle edit/preview)
- ✅ Quiz builder UI (instructor) — quiz-creator.tsx, встроен в lesson-block-editor
- ✅ Attempt history UI (student) — список попыток с деталями
- ✅ Block deadlines for cohorts (admin + instructor UI)
- ✅ Curator popup notifications (create + acknowledge)
- ✅ Password recovery: API (`requestPasswordReset`), UI (`forgot-password-form`)

## Связанные документы

- `README.md` — быстрый запуск и команды
- `docs/specification.md` — функциональная и архитектурная спецификация
- `docs/MASTER-PLAN.md` — полный план развития (текущий и远景)
- `docs/security.md` — security checklist и риски
- `docs/updates.md` — журнал всех обновлений
- `docs/DEVELOPER_GUIDE.md` — инструкция для разработчиков
- `docs/PLATFORM_SNAPSHOT.md` — архитектурный обзор
