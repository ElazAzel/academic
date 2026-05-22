# План реализации AI Strategic Academy

Дата актуализации: 2026-05-21 (Stage 4 lessons/tests fixes)  
Статус документа: operational source of truth для реализации и контроля изменений.

## Цель проекта

Закрытая LMS одной академии для управления курсами, потоками, кураторами, заданиями, тестами, сертификатами, инвайт-доступом, аналитикой и отчётностью. Production-minded: безопасная, расширяемая, документированная.

## Текущее состояние на 2026-05-22

### Core Metrics
- **Build:** 83/83 страниц, 0 ошибок ✅
- **Tests:** 368/368 passed (62 test files) ✅
- **Deployment:** Vercel auto-deploy на push в main ✅
- **Security scan:** Все C1-C5 findings закрыты ✅
- **CSRF:** Исправлен (origin vs hostname) ✅
- **Session resilience:** try/catch revalidateSession, fallback на JWT роли ✅

### Последние изменения (Stage 4)
- H-1: Sequential lock bypass — исправлен wrong moduleId filter
- H-2: Secure media signed-URL — sequential lock check added
- H-4: Quiz attempt race condition — wrapped in $transaction
- M-1: Rate limit key per-quiz (not per-user)
- M-2: Enrollment check on lesson GET
- M-3: Enrollment check on rating POST

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

### Что осталось (фаза Production Hardening — Phase 0)

| Область | Задача | Приоритет | Статус |
|---------|--------|-----------|--------|
| Auth | Password recovery (email-based) | P1 | ✅ code done, ждёт SMTP |
| Auth | Email verification flow | P1 | 🟡 code done, ждёт SMTP |
| Курсы | Builder: publish checklist UX, preview mode | P1 | ❌ |
| Тесты | Quiz builder UI (instructor) | P2 | ❌ |
| Тесты | Attempt history (student) | P2 | ❌ |
| Задания | File upload signing, review queue UI (curator) | P2 | ❌ |
| Безопасность | Redis-backed rate limiting for all endpoints | P2 | 🟡 in-memory есть, Redis нет |
| DevOps | Production deployment validation runbook | P2 | 🟡 verify:release существует |

### Уже реализовано (Phase 0)
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
