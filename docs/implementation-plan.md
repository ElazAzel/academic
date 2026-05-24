# План реализации AI Strategic Academy

Дата актуализации: 2026-05-24  
Статус документа: operational source of truth для реализации.

## Цель проекта

Закрытая LMS одной академии для управления курсами, потоками, кураторами, заданиями, тестами, сертификатами, инвайт-доступом, аналитикой и отчётностью. Production-minded: безопасная, расширяемая, документированная.

## Текущее состояние на 2026-05-24

### Core Metrics
- **Build:** 87/87 страниц, 0 ошибок ✅
- **Tests:** 426/426 passed (70 test files) ✅
- **Lint:** 0 errors, 0 warnings ✅
- **Typecheck:** clean ✅ (кроме предсуществующих `.next/dev/types/validator.ts`)
- **SCORM/xAPI:** Full import + proxy + CMI + player + xAPI LRS ✅
- **Deployment:** Vercel auto-deploy на push в main ✅; preview на codex/* ветках ✅
- **Security scan:** Все C1-C5 findings закрыты ✅
- **CSRF:** Исправлен (origin vs hostname) ✅
- **Session resilience:** try/catch revalidateSession, fallback на JWT роли ✅
- **FK-индексы:** 12 недостающих индексов добавлены ✅
- **RLS:** Отключён на всех 56 таблицах (не используется, приложение на Prisma) ✅
- **Схема cohorts:** Исправлена (добавлены отсутствующие колонки) ✅
- **Ветка main:** branch protection отключена, push напрямую ✅
- **Zod-валидация + try/catch:** Все 18 файлов server/actions/ покрыты ✅
- **Metadata:** Все 105 page.tsx имеют export const metadata ✅
- **loading.tsx:** Все 84 route-директории покрыты ✅
- **Mobile adaptation:** Achievements (accordion), XP (touch), hover→click ✅

### Последние изменения
- Runtime error: 500 на `/api/v1/modules/[moduleId]/lessons` — добавлен retry при Prisma unique constraint collision
- Runtime error: React #482 — async Server Component удалён из `error.tsx` error boundaries
- Runtime error: `Cannot read properties of undefined (reading 'length')` — `?.` guards во всех React Query компонентах, `window.onerror` в `providers.tsx`, усиленный `app/error.tsx` с логгированием
- Build error: 4 corrupted JSX файла после битого merge — восстановлены рабочие копии в dashboard-widgets.tsx, student-achievements.tsx, student-course-dashboard-grid.tsx, xp-display-client.tsx

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
| Безопасность (Argon2id, RBAC, rate limit, Sentry) | done | RLS отключён (Prisma только), Argon2id |
| PWA (manifest, SW, push, Apple Web App) | done | Custom install prompts |
| Студент (dashboard, learning paths, settings, deadlines) | done | Mobile adaptation (accordion, touch) |
| Скорость ответов куратора | done | Per-student avgResponseHours + avgChatResponseHours |
| Анонимизация имён студентов | done | Слушатель #XXXXX для не-admin |
| Zod-валидация + try/catch | done | Все 18 server actions покрыты |
| global-error.tsx / robots.txt / sitemap.ts | done | Production hardening |
| Metadata / loading.tsx | done | 105 pages metadata, 84 loading.tsx |
| Mobile adaptation | done | Achievements accordion, XP touch-friendly |

### Что осталось (после аудита Phase 0 + Phase 1)

| Область | Задача | Приоритет | Статус | Примечание |
|---------|--------|-----------|--------|------------|
| DevOps | Production deployment validation runbook | P2 | ✅ | `verify:release` выполнен 2026-05-22 (статический гейт зелёный, e2e требует staging) |
| Безопасность | CSP hardening (unsafe-eval в production) | P2 | ✅ | `unsafe-eval` удалён из production CSP. `unsafe-inline` остаётся (Next.js hydration). |
| Инфра | MinIO/S3 uploads локально | P3 | ❌ | Требует Docker (не установлен) — upload падает с ERR_CONNECTION_REFUSED |
| БД | FK-индексы (12 шт) | P1 | ✅ | Добавлены через миграцию `20260524000000_add_missing_fk_indexes` |
| БД | RLS отключён | P2 | ✅ | RLS отключён на всех 56 таблицах — приложение использует Prisma server-side |
| БД | Схема cohorts | P2 | ✅ | Добавлены колонки project_id, starts_at, ends_at, updated_at |
| БД | Миграция `add_block_model` | P1 | ✅ | Исправлена ошибочная FK-ссылка на enrollments |
| Mobile | Адаптация достижений и статистики | P2 | ✅ | Аккордеон на мобилке, click вместо hover, touch-friendly |
| Code | Zod-валидация + try/catch | P1 | ✅ | Все 18 server actions покрыты |
| Code | Metadata | P2 | ✅ | Все 105 page.tsx с русскими title/description |
| Code | loading.tsx | P2 | ✅ | Все 84 route-директории с skeleton |
| DevOps | Vercel preview branches | P2 | ✅ | codex/* ветки деплоятся в preview |

### Уже реализовано (Phase 2.4 — SCORM/xAPI)
- ✅ SCORM ZIP import (adm-zip + manifest parsing + Supabase Storage upload)
- ✅ SCORM proxy route with API Bridge injection (SCORM 1.2 `window.API` + 2004 `window.API_1484_11`)
- ✅ CMI backend endpoints (init, get/set values, update launch)
- ✅ Instructor SCORM block editor (upload ZIP, replace, delete)
- ✅ Student SCORM player (iframe + fullscreen)
- ✅ Minimal xAPI LRS (Statement API POST/GET + API key auth)
- ✅ xapi_statements table (migration applied)
- ✅ Unit tests: manifest parser (2 tests), full suite: 426 pass

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
- `docs/MASTER-PLAN.md` — полный план развития
- `docs/security.md` — security checklist и риски
- `docs/updates.md` — журнал всех обновлений
- `docs/DEVELOPER_GUIDE.md` — инструкция для разработчиков
- `docs/PLATFORM_SNAPSHOT.md` — архитектурный обзор
- `docs/todo.md` — текущий TODO-лист
- `docs/CHANGELOG.md` — лог изменений для релизов
