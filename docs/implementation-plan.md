# План реализации AI Strategic Academy

Дата актуализации: 2026-05-21 (Stage 4 lessons/tests fixes)  
Статус документа: operational source of truth для реализации и контроля изменений.

## Цель проекта

Закрытая LMS одной академии для управления курсами, потоками, кураторами, заданиями, тестами, сертификатами, инвайт-доступом, аналитикой и отчётностью. Production-minded: безопасная, расширяемая, документированная.

## Текущее состояние на 2026-05-21

- Фазы 1-2 завершены: Academy Operations + Production Readiness
- Фаза 3: Scheduled report export реализован, data-connected dashboards уже работают
- Фаза 4: Security review, scale path документированы
- Security hardening C1–C5: закрыты 5 findings security-скана (3x P1, 2x P2)
  - C1: production guard на NEXTAUTH_SECRET + CRON_SECRET
  - C2: quiz answer keys изолированы от студентов
  - C3: server-side verification прогресса (тесты/задания)
  - C4: revalidateSession на каждый requireUser()
  - C5: cron endpoints fail-closed
- Stage 4 (Lessons/Tests fixes): 6 issues закрыты:
  - H-1: Sequential lock bypass fixed (wrong moduleId filter)
  - H-2: Secure media signed-URL — sequential lock check added
  - H-4: Quiz attempt race condition — wrapped in $transaction
  - H-5: CSRF protection confirmed active via proxy.ts (already done)
  - M-1: Rate limit key per-quiz (not per-user)
  - M-2: Enrollment check on lesson GET
  - M-3: Enrollment check on rating POST
- Все 63 role sub-pages реализованы (добавлен `/student/reports`), все дашборды на реальных данных
- Все tests: 368/368 passed (62 test files)

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

### Что осталось (фаза Production Readiness)

| Область | Задача | Приоритет |
|---------|--------|-----------|
| Auth | Email verification full UI flow + password recovery delivery | P1 |
| Курсы | Builder: publish checklist UX, preview mode | P1 |
| Тесты | Quiz builder UI (instructor), attempt history (student) | P2 |
| Задания | File upload signing, review queue UI (curator) | P2 |
| Уведомления | SMTP email wiring (production), retry policy | P2 |
| Безопасность | Redis-backed rate limiting for all endpoints | P2 |
| DevOps | Production deployment validation runbook | P2 |
| Деадлайны | Block deadlines for cohorts, curator reminders | P2 |
| Попапы кураторов | Notification popups with read confirmation | P2 |

## Связанные документы

- `README.md` — быстрый запуск и команды
- `docs/specification.md` — функциональная и архитектурная спецификация
- `docs/MASTER-PLAN.md` — полный план развития (текущий и远景)
- `docs/security.md` — security checklist и риски
- `docs/updates.md` — журнал всех обновлений
- `docs/DEVELOPER_GUIDE.md` — инструкция для разработчиков
- `docs/PLATFORM_SNAPSHOT.md` — архитектурный обзор
