# Master Plan — AI Strategic Academy

> Единый план развития: от текущего состояния до стратегического roadmap.
> Дата актуализации: 2026-05-21

---

## Часть I. Текущее состояние (Snapshot)

**Платформа:** Next.js 16 modular monolith · TypeScript strict · Prisma 7.8 / PostgreSQL 17 (Supabase) · Auth.js 4 · Tailwind / shadcn · Framer Motion

**Масштаб:**
- 6 ролей: admin, instructor, student, curator, super_curator, customer_observer
- 81 маршрут, 354 теста, build 0 ошибок
- Vercel auto-deploy, Sentry monitoring, PWA, 55 таблиц с RLS

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
| 1.1 | **E2E test full suite** | QA | Playwright: все роли + критические сценарии |
| 1.2 | **WCAG 2.1 AA compliance** | UX | Audit findings закрыты |
| 1.3 | **Loading/skeleton states** | UX | Нет пустых экранов, скелетоны везде |
| 1.4 | **Error boundaries per route** | UX | Нет белых страниц при ошибках |
| 1.5 | **Performance budget** | DevOps | Lighthouse > 80, bundle size limits |
| 1.6 | **Backup/restore runbook tested** | DevOps | Восстановление БД из бэкапа |
| 1.7 | **i18n: локализация каркас** | UX | Подготовка к любым языкам (пока русский) |

### Фаза 2: Расширение функционала (1-2 месяца)

> Новые возможности для ключевых ролей.

| # | Задача | Домен | Ожидаемый результат |
|---|--------|-------|-------------------|
| 2.1 | **Real-time уведомления (SSE)** | Уведомления | Мгновенная доставка без polling |
| 2.2 | **Advanced report designer** | Аналитика | Кастомные отчёты: выбор полей, фильтров, формата |
| 2.3 | **Scheduled report export** | Аналитика | Автоматическая отправка по расписанию |
| 2.4 | **SCORM/xAPI import/launch** | Курсы | Импорт внешних курсов, совместимость со стандартами |
| 2.5 | **Video hosting integration** | Курсы | Встроенный плеер, субтитры, загрузка видео |
| 2.6 | **Forum/discussion per lesson** | Сообщество | Обсуждения внутри урока |
| 2.7 | **Attendance analytics** | Аналитика | Посещаемость лайв-уроков |

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
Email verification  │ E2E full suite     │ Real-time SSE      │ Outbox/inbox
SMTP wiring         │ WCAG compliance    │ Report designer    │ Service extraction
Builder UX          │ Skeleton states    │ SCORM import       │ Read replica
Rate limiting       │ Error boundaries   │ Video hosting      │ Search extraction
Deployment valid.   │ Performance budget │ Forum/discussion   │
Block deadlines     │ Backup/restore     │ Attendance         │
Curator popups      │ i18n scaffold      │                    │
File upload queue   │                    │                    │
Quiz builder        │                    │                    │
Attempt history     │                    │                    │
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
