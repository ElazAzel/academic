# План реализации AI Strategic Academy

Дата актуализации: 2026-05-22  
Статус документа: operational source of truth для реализации.

## Цель проекта

Закрытая LMS одной академии для управления курсами, потоками, кураторами, заданиями, тестами, сертификатами, инвайт-доступом, аналитикой и отчётностью. Production-minded: безопасная, расширяемая, документированная.

## Текущее состояние на 2026-05-22

### Core Metrics
- **Build:** 84/84 страниц, 0 ошибок ✅
- **Tests:** 377/377 passed (63 test files) ✅
- **Lint:** 0 errors, 0 warnings ✅
- **Typecheck:** clean ✅
- **Deployment:** Vercel auto-deploy на push в main ✅
- **Security scan:** Все C1-C5 findings закрыты ✅
- **CSRF:** Исправлен (origin vs hostname) ✅
- **Session resilience:** try/catch revalidateSession, fallback на JWT роли ✅

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

### Что осталось (после аудита Phase 0)

| Область | Задача | Приоритет | Статус | Примечание |
|---------|--------|-----------|--------|------------|
| Auth | Password recovery (email-based) | P1 | ✅ code done | Ждёт SMTP-провайдера |
| Auth | Email verification flow | P1 | 🟡 code done | Ждёт SMTP-провайдера |
| Безопасность | Redis-backed rate limiting for all endpoints | P2 | 🟡 | In-memory есть, Redis нет инфраструктурно |
| DevOps | Production deployment validation runbook | P2 | 🟡 | `verify:release` существует |
| Инфра | MinIO/S3 uploads локально | P3 | ❌ | Требует Docker (не установлен) — upload падает с ERR_CONNECTION_REFUSED |

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
