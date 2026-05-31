# Master Plan — AI Strategic Academy

> Единый план развития: от текущего состояния до стратегического roadmap.
> Дата актуализации: 2026-05-31
> Release-readiness статус см. в `docs/READINESS.md`.
> Долгосрочная цель полной оптимизации: `docs/FULL-OPTIMIZATION-GOAL.md`.

---

## Часть I. Текущее состояние (Snapshot)

**Платформа:** Next.js 16 modular monolith · TypeScript strict · Prisma 7.8 / PostgreSQL 17 (Supabase) · Auth.js 4 · Tailwind / shadcn · Framer Motion

**Масштаб:**

- 6 ролей: admin, instructor, student, curator, super_curator, customer_observer
- 87+ страниц, 466 unit/integration тестов по последнему `docs/updates.md`, build 0 ошибок, lint — 0 errors/0 warnings
- Vercel auto-deploy, Sentry monitoring, PWA, 56 таблиц (RLS отключён)

**Все базовые домены реализованы:** auth, RBAC, курсы, уроки, тесты, задания, прогресс, сертификаты, чат, уведомления (in-app + push), аналитика, отчёты, риски, глоссарий, администрирование, PWA.

Важно: "реализовано" не равно "release-ready". Текущий production-readiness итог остаётся `partial`, пока не закрыты WP1/WP2/WP4/WP5/WP6 из `docs/READINESS.md`.

**Глубокий аудит БД (2026-05-24):**
- Добавлены 12 недостающих FK-индексов
- Отключён RLS на всех 56 таблицах (приложение на Prisma, Supabase REST API не используется)
- Исправлена схема cohorts (добавлены 4 недостающие колонки)
- Исправлена миграция `add_block_model` (ошибочная FK-ссылка)

**Производственная полировка (2026-05-24):**
- Zod-валидация + try/catch: все 18 server actions
- Metadata: все 105 page.tsx
- loading.tsx: все 84 route-директории
- global-error.tsx, robots.txt, sitemap.ts
- Mobile adaptation: achievements accordion, XP touch-friendly
- Анонимизация имён студентов: Слушатель #XXXXX
- Метрики скорости ответов куратора per-student
- Тесты: 422/422 ✅ | Typecheck: ✅ | Build: ✅

---

## Часть II. Фазы развития

### Фаза 0: Production Hardening ✅ (завершена 2026-05-24)

> Все P0-P2 задачи закрыты. Платформа стабилизирована для production-эксплуатации.

| # | Задача | Домен | Статус |
| --- | -------- | ------- | ------ |
| 0.1 | **Email verification + password recovery UI** | Auth | ✅ |
| 0.2 | **Builder publish checklist UX** | Курсы | ✅ |
| 0.3 | **Production deployment validation** | DevOps | ✅ |
| 0.4 | **Block deadlines for cohorts** | Курсы | ✅ |
| 0.5 | **Curator popup notifications** | Уведомления | ✅ |
| 0.6 | **File upload signing + review queue UI** | Задания | ✅ |
| 0.7 | **Quiz builder UI** | Тесты | ✅ |
| 0.8 | **Attempt history UI** | Тесты | ✅ |
| 0.9 | **FK-индексы (аудит)** | БД | ✅ |
| 0.10 | **RLS отключён** | БД | ✅ |
| 0.11 | **Схема cohorts (аудит)** | БД | ✅ |
| 0.12 | **Zod-валидация + try/catch** | Code | ✅ |
| 0.13 | **Metadata + loading.tsx** | UX | ✅ |
| 0.14 | **global-error.tsx / robots.txt / sitemap.ts** | DevOps | ✅ |
| 0.15 | **Скорость ответов куратора** | Аналитика | ✅ |
| 0.16 | **Анонимизация студентов** | Privacy | ✅ |
| 0.17 | **Mobile adaptation** | UX | ✅ |

### Фаза 1: UX & Quality (2-4 недели)

> Полировка UI/UX, accessibility, производительность, full E2E coverage.

| # | Задача | Домен | Ожидаемый результат |
| --- | -------- | ------- | ------------------- |
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
| --- | -------- | ------- | ------------------- |
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
| --- | -------- | ------- | ------------------- |
| 3.1 | **Outbox/inbox pattern + message broker** | Инфра | Redis Streams / RabbitMQ для async событий |
| 3.2 | **Notification service extraction** | Инфра | Выделенный сервис, отдельная БД или Redis |
| 3.3 | **Report generation service extraction** | Инфра | Фоновый worker для PDF/XLSX, S3 storage |
| 3.4 | **Search extraction (MeiliSearch/Elastic)** | Инфра | Полнотекстовый поиск вне монолита |
| 3.5 | **Read replica for analytics** | Инфра | Аналитика не нагружает primary БД |
| 3.6 | **Certificate service extraction** | Инфра | Выделенный сервис для PDF/S3 |

### Фаза 4: Стратегическое развитие (6-12 месяцев)

> AI-рекомендации, продвинутая аналитика, новая функциональность.

| # | Задача | Домен | Ожидаемый результат |
| --- | -------- | ------- | ------------------- |
| 4.1 | **AI recommendations engine** | ML | Персональные рекомендации курсов на основе прогресса |
| 4.2 | **Adaptive learning paths** | ML | Автоматическая корректировка траектории |
| 4.3 | **NLP curator assistant** | AI | Авто-ответы на типовые вопросы, проверка заданий |
| 4.4 | **Advanced analytics dashboard** | Аналитика | BI-дашборд с произвольными срезами |
| 4.5 | **Mobile native app** | Mobile | React Native или Swift/Kotlin |
| 4.6 | **Gamification** | UX | Бейджи, рейтинги, соревнования |

---

## Часть III. Приоритеты выполнения

```text
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
| ------- | ----------- | ------------- | ----- | ------------- |
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
