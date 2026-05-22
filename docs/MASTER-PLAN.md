# Master Plan — AI Strategic Academy

> Единый план развития: от текущего состояния до стратегического roadmap.
> Дата актуализации: 2026-05-21

---

## Часть I. Текущее состояние (Snapshot)

**Платформа:** Next.js 16 modular monolith · TypeScript strict · Prisma 7.8 / PostgreSQL 17 (Supabase) · Auth.js 4 · Tailwind / shadcn · Framer Motion

**Масштаб:**
- 6 ролей: admin, instructor, student, curator, super_curator, customer_observer
- 83+ маршрута, 368 тестов (62 файла), build 0 ошибок
- Vercel auto-deploy, Sentry monitoring, PWA, 59 таблиц с RLS

**Все базовые домены реализованы:** auth, RBAC, курсы, уроки, тесты, задания, прогресс, сертификаты, чат, уведомления (in-app + push), аналитика, отчёты, риски, глоссарий, администрирование, PWA.

---

## Часть II. Фазы развития

### Фаза 0: Production Hardening (сейчас — 2 недели)

> Закрыть оставшиеся P0-P2 задачи, стабилизировать платформу для production-эксплуатации.

| # | Задача | Домен | Ожидаемый результат |
|---|--------|-------|-------------------|
| 0.1 | **Email verification + password recovery UI** | Auth | Полный цикл: запрос → ссылка → сброс; email через SMTP |
| 0.2 | **Builder publish checklist UX** | Курсы | Понятный UI: что мешает публикации, подсветка проблем |
| 0.3 | **SMTP email wiring** | Уведомления | Реальный провайдер (SendGrid/Resend), retry policy |
| 0.4 | **Redis rate limiting — все endpoints** | Безопасность | Rate limit на quiz attempts, push, media upload, API |
| 0.5 | **Production deployment validation** | DevOps | `npm run verify:release` проходит на staging |
| 0.6 | **Block deadlines for cohorts** | Курсы | Admin/instructor задаёт дедлайны блоков, студент видит |
| 0.7 | **Curator popup notifications** | Уведомления | Попапы с текстом, фиксация просмотра |
| 0.8 | **File upload signing + review queue UI** | Задания | Curator видит очередь, S3 presigned upload |
| 0.9 | **Quiz builder UI** | Тесты | Instructor создаёт тесты в builder |
| 0.10 | **Attempt history UI** | Тесты | Student видит свои попытки |

### Фаза 1: UX & Quality (2-4 недели)

> Полировка UI/UX, accessibility, производительность, full E2E coverage.

| # | Задача | Домен | Ожидаемый результат |
|---|--------|-------|-------------------|
| 1.1 | **E2E test full suite** | QA | ✅ Playwright: smoke + RBAC + student happy path |
| 1.2 | **WCAG 2.1 AA compliance** | UX | 🟡 Аудит: Lighthouse asserts настроены в lighthouse.config.js |
| 1.3 | **Loading/skeleton states** | UX | ✅ PageSkeleton + все role/loading.tsx |
| 1.4 | **Error boundaries per route** | UX | ✅ PageError + все role/error.tsx |
| 1.5 | **Performance budget** | DevOps | ✅ lighthouse.config.js + budget.json настроены |
| 1.6 | **Backup/restore runbook tested** | DevOps | ✅ docs/backup-restore-runbook.md |
| 1.7 | **i18n: локализация каркас** | UX | ✅ lib/i18n.ts + locales/ru.json |

### Фаза 2: Расширение функционала (1-2 месяца)

> Новые возможности для ключевых ролей.

| # | Задача | Домен | Ожидаемый результат |
|---|--------|-------|-------------------|
| 2.1 | **Real-time уведомления (SSE)** | Уведомления | ✅ Outbox handler + in-app/push notifications |
| 2.2 | **Advanced report designer** | Аналитика | ✅ ReportDesigner компонент + PDF/XLSX генерация |
| 2.3 | **Scheduled report export** | Аналитика | ✅ CRON route + scheduled reports |
| 2.4 | **SCORM/xAPI import/launch** | Курсы | ✅ Схема + API + миграция (ожидает ZIP-импорт) |
| 2.5 | **Video hosting integration** | Курсы | ✅ YouTube IFrame API + VideoBlock с поддержкой YouTube |
| 2.6 | **Forum/discussion per lesson** | Сообщество | ✅ LessonDiscussion + DiscussionPost (threaded) |
| 2.7 | **Attendance analytics** | Аналитика | ✅ ActivityLog-based: instructor attendance dashboard |

### Фаза 3: Масштабирование (3-6 месяцев)

> Выделение сервисов, подготовка к росту.

| # | Задача | Домен | Ожидаемый результат |
|---|--------|-------|-------------------|
| 3.1 | **Outbox/inbox pattern + message broker** | Инфра | Redis Streams / RabbitMQ для async событий |
| 3.2 | **Notification service extraction** | Инфра | Выделенный сервис, отдельная БД или Redis |
| 3.3 | **Report generation service extraction** | Инфра | Фоновый worker для PDF/XLSX, S3 storage |
| 3.4 | **Search extraction (MeiliSearch/Elastic)** | Инфра | Полнотекстовый поиск вне монолита |
| 3.5 | **Read replica for analytics** | Инфра | Аналитика не нагружает primary БД |
| 3.6 | **Certificate service extraction** | Инфра | Выделенный сервис для PDF/S3 |

### Фаза 4: Стратегическое развитие (6-12 месяцев)

> AI-рекомендации, продвинутая аналитика, новая функциональность.

| # | Задача | Домен | Ожидаемый результат |
|---|--------|-------|-------------------|
| 4.1 | **AI recommendations engine** | ML | Персональные рекомендации курсов на основе прогресса |
| 4.2 | **Adaptive learning paths** | ML | Автоматическая корректировка траектории |
| 4.3 | **NLP curator assistant** | AI | Авто-ответы на типовые вопросы, проверка заданий |
| 4.4 | **Advanced analytics dashboard** | Аналитика | BI-дашборд с произвольными срезами |
| 4.5 | **Mobile native app** | Mobile | React Native или Swift/Kotlin |
| 4.6 | **Gamification** | UX | Бейджи, рейтинги, соревнования |

---

## Часть III. Приоритеты выполнения

```
СЕЙЧАС              │ 2 НЕДЕЛИ          │ 1-2 МЕСЯЦА         │ 3-6 МЕСЯЦЕВ
────────────────────┼────────────────────┼────────────────────┼────────────────────
✅ Phase 0 done     │ 🟡 WCAG audit     │ Video hosting      │ Outbox/inbox
✅ Phase 1 (code)   │                    │ Attendance         │ Service extraction
✅ Forum discussion │                    │                    │ Read replica
✅ SCORM stub       │                    │                    │ Search extraction
✅ Perf budget      │                    │                    │
✅ Backup runbook   │                    │                    │
```

---

## Часть IV. Матрица ответственности

| Домен | Архитектор | Разработчик | QA | Документация |
|-------|-----------|-------------|-----|-------------|
| Auth/сессии | principal-architect | backend-next-prisma | qa-release | technical-writer |
| Курсы/уроки | principal-architect | backend-next-prisma | qa-release | technical-writer |
| Тесты/задания | principal-architect | backend-next-prisma | qa-release | technical-writer |
| Сертификаты | principal-architect | backend-next-prisma | qa-release | technical-writer |
| Чат | principal-architect | backend-next-prisma | qa-release | technical-writer |
| UI/UX | principal-architect | frontend-lms-ux | qa-release | technical-writer |
| Аналитика | data-analytics | backend-next-prisma | qa-release | technical-writer |
| Безопасность | security-privacy | backend-next-prisma | qa-release | technical-writer |
| DevOps | devops-platform | devops-platform | qa-release | technical-writer |
| Продукт | product-owner | — | — | — |
| Координация | orchestrator | — | — | — |

---

## Часть V. Критерии готовности к релизу

Релиз считается готовым, когда:

1. **`npm run verify:release` проходит** — lint, typecheck, tests, build, Prisma validate, E2E
2. **Все P0-P1 задачи закрыты** — нет блокеров для core flow
3. **Security review пройден** — OWASP Top 10, WCAG 2.1 AA, rate limiting
4. **Backup/restore runbook подтверждён** — восстановление из бэкапа проверено
5. **Deployment runbook подтверждён** — Vercel deploy + smoke-тесты
6. **Документация актуальна** — MASTER-PLAN, specification, security, developer-guide
