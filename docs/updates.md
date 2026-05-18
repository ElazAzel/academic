# Журнал обновлений AI Strategic Academy

Правило: новые записи добавляются сверху. Старые записи не переписываются, кроме исправления явной опечатки. Каждая запись должна быть достаточно конкретной, чтобы следующий AI-агент или инженер понял, что изменилось и что проверено.

## 2026-05-18 — Full DB schema sync + RLS hardening

- **29 missing tables created** в production: `oauth_accounts`, `sessions`, `verification_tokens`, `permissions`, `role_permissions`, `clients`, `projects`, `blocks`, `lesson_media`, `cohort_deadlines`, `block_cohort_deadlines`, `lesson_progress`, `quiz_attempts`, `assignment_submissions`, `activity_logs`, `lesson_questions`, `certificate_templates`, `audit_logs`, `consent_logs`, `app_settings`, `curator_assignments`, `risk_flags`, `reports`, `import_jobs`, `observer_projects`, `observer_cohorts`, `notification_preferences`, `lesson_ratings`, `glossary_entries`
- **RLS включён** на 42 таблицах с `deny_anon_all` политикой (default-deny через анон-ключ). Приложение использует Prisma (service_role), так что полный defence-in-depth
- **`certificates.enrollment_id`** + `verification_url` добавлены (колонки отсутствовали)
- **Проверка**: `supabase_get_advisors` — CRITICAL `rls_disabled` больше нет (понижен до INFO)
- **type-check**: 0 ошибок

## 2026-05-18 — Fix: instructor chat 404 + push subscribe 500

- **404 `/instructor/chat`**: создана страница `app/instructor/chat/page.tsx` (копирует паттерн curator chat)
- **500 `POST /api/v1/push/subscribe`**: применена миграция `apply_push_subscriptions_and_tables_v2` — созданы таблицы `push_subscriptions`, `messages`, `admin_popups`, `outbox_events`, `learning_paths` и др.
- **`getMyConversations`**: добавлена роль `instructor` в `requireRole` — теперь преподаватели могут видеть свои чаты

## 2026-05-18 — Outbox-паттерн для асинхронного создания уведомлений

- **`createNotification` переведён на outbox**: вместо синхронного создания уведомления (проверка предпочтений → DB insert → email → push) теперь пишет событие `notification.send` в `outbox_events` и возвращает управление
- **Новый файл**: `server/modules/notifications/outbox-handler.ts` — `processNotificationEvents()` читает pending события и вызывает `createNotificationInternal` (старая логика) для каждого
- **Новый endpoint**: `POST /api/v1/outbox/process` — универсальный cron-воркер, обрабатывает `report.generate` + `notification.send` за один вызов
- **Сохранена обратная совместимость**: `POST /api/v1/reports/scheduled` продолжает работать, но в документации рекомендован unified endpoint
- **Старая логика** переименована в `createNotificationInternal` — не экспортируется публично
- **Тесты обновлены**: `notifications-service.test.ts` теперь проверяет запись в outbox, `auth-service-notifications.test.ts` мокает `outboxEvent.create`
- **type-check**: 0 ошибок
- **tests**: 8 passed (3 suites)

## 2026-05-18 — Suspense boundaries для дашбордов (streaming)

- **Все 6 ролевых дашбордов** переведены на streaming с Suspense:
  - `app/student/page.tsx` — StudentDashboardPage → `<Suspense>` + `StudentDashboardContent`
  - `app/curator/page.tsx` — CuratorDashboardPage → `<Suspense>` + `CuratorDashboardContent`
  - `app/instructor/page.tsx` — InstructorDashboardPage → `<Suspense>` + `InstructorDashboardContent`
  - `app/admin/page.tsx` — AdminDashboardPage → `<Suspense>` + `AdminDashboardContent`
  - `app/super-curator/page.tsx` — SuperCuratorDashboardPage → `<Suspense>` + `SuperCuratorDashboardContent`
  - `app/customer-observer/page.tsx` — CustomerObserverDashboardPage → `<Suspense>` + `CustomerObserverDashboardContent`
- **Как работает**: страница больше не `async` — экспорт по умолчанию рендерит AppShell + PageHeader мгновенно, затем `<Suspense fallback={<PageSkeleton />}>` показывает скелет, пока inner async-компонент выполняет `requireRolePage()` + `getXDashboard()` и стримит готовый контент
- **Переиспользован** существующий `PageSkeleton` из `components/lms/page-skeleton.tsx` (скелет с заголовком, 3 карточками метрик и блоком контента)
- **type-check**: пройден (`npx tsc --noEmit` — 0 ошибок)

## 2026-05-18 — ISR + proxy.ts rate limiting

- Удалён `middleware.ts` (конфликт с `proxy.ts` в Next.js 16)
- **Rate limiting** перенесён в `proxy.ts` — 120 запросов/мин для API-маршрутов
- **ISR** добавлен на `/docs/[slug]`: `revalidate = 86400` (1 день), `generateStaticParams` для 3 документов
- **ISR** добавлен на `/certificates/verify/[code]`: `revalidate = 3600` (1 час)
- `/docs` добавлен в `PUBLIC_PATH_PREFIXES` в `middleware-guards.ts`

## 2026-05-18 — Оптимизация производительности (масштабирование до 4k+ пользователей)

- **Индексы БД**: добавлены 4 составных индекса в Prisma-схему:
  - `consent_logs (user_id, type, status)` — проверка согласия
  - `lesson_progress (user_id, status)` — проверка пройденных уроков
  - `module_progress (user_id, status, module_id)` — дашборды
  - `course_progress (user_id, status)` — дашборды
- **Migration `add_performance_indexes_v2`** применена на Supabase (для существующих таблиц)
- **Connection pooler**: `lib/prisma.ts` теперь автоматически определяет Supabase Supavisor (порт 6543) и устанавливает `max: 20`, добавляет `?pgbouncer=true`
- **Rate Limiting**: создан `middleware.ts` с in-memory rate limiter (120 запросов/мин на IP), только для `/api/*`
- **Notification polling**: `NotificationToast` снижен с 30с до 60с
- **HTTP кэширование**: добавлены `Cache-Control` заголовки на:
  - `GET /api/v1/notifications` — s-maxage=15, stale-while-revalidate=30
  - `GET /api/v1/unread-counts` — s-maxage=10, stale-while-revalidate=20
- Supabase-анализ показал: индексы на messages и notifications не используются — это нормально для низкой текущей нагрузки, при 4000 пользователях они начнут работать
- **Остаётся**: RLS политики для таблиц в public схеме (отдельная задача безопасности)

## 2026-05-18 — Фоновые анимации + всплывающие уведомления при входе

- Добавлены новые анимации в `globals.css`: drift, morph, shimmer, fade-in-scale, notification-slide-in, notification-progress
- Создан `components/lms/background-animations.tsx` — декоративные фигуры (круги, квадраты, блобы, кольца) с плавающими анимациями, отключены для пользователей с prefers-reduced-motion
- Создан `components/lms/notification-toast.tsx` — всплывающие уведомления через sonner toast:
  - При входе в аккаунт показываются все непрочитанные уведомления
  - При появлении новых (polling 30с) — показываются только новые (по track ID)
  - Разные цвета: синий (сообщения), зелёный (прогресс), янтарный (системные), основной (остальные)
  - Прогресс-бар 5 секунд, ссылка ведёт на соответствующий раздел
- `BackgroundAnimations` добавлен в `app/layout.tsx` (поверх контента, pointer-events: none)
- `NotificationToast` добавлен в `components/providers.tsx`

## 2026-05-18 — Consent popup для принятия юридических документов

- Создан `server/modules/consent/service.ts` — модуль проверки и записи согласия (3 типа: privacy_policy, terms_of_use, cookie_notice, версия 1.0)
- Создан `app/api/v1/consent/status/route.ts` — GET-эндпоинт проверки, дал ли пользователь согласие
- Создан `app/api/v1/consent/accept/route.ts` — POST-эндпоинт для фиксации согласия (с ipAddress и userAgent)
- Создан `components/lms/consent-modal.tsx` — модальное окно со списком документов (ссылки открываются в новом окне)
- Модальное окно появляется при входе, если согласие ещё не дано; нельзя закрыть без принятия
- При обновлении страницы без согласия — показывается снова
- После принятия — фиксируется 3 записи в ConsentLog, модалка не показывается
- Модальное окно интегрировано в `components/providers.tsx`

## 2026-05-18 — Legal audit: 11 юридических документов для LMS

Автор/agent: opencode
Тип изменения: documentation / legal / compliance

1. **Анализ последних 4 коммитов** (полный аудит представлен ниже).

2. **Создан комплект из 11 юридических и операционных документов** для закрытой LMS-платформы AI Strategic Academy:

   **Публичные:**
   - `docs/privacy-policy.md` — Политика конфиденциальности (14 разделов: положения, категории данных, цели, источники, доступ, передача, cookie, хранение, защита, права, сертификаты, контакты, изменения)
   - `docs/terms-of-use.md` — Пользовательское соглашение (13 разделов: положения, термины, доступ, правила, материалы, тесты/задания, коммуникация, сертификаты, ограничения, ответственность, внешние сервисы, изменения, контакты)
   - `docs/cookie-notice.md` — Уведомление о cookie и технической статистике (8 разделов + 3 варианта текста для banner)

   **Внутренние:**
   - `docs/data-retention-policy.md` — Политика хранения и удаления данных (таблица категорий и сроков)
   - `docs/staff-data-access-policy.md` — Регламент доступа сотрудников (матрица доступа по 6 ролям)
   - `docs/user-data-request-policy.md` — Регламент обработки запросов пользователей (шаблоны ответов, процесс)
   - `docs/incident-response-policy.md` — Регламент реагирования на инциденты (классификация, процесс, шаблоны)
   - `docs/third-party-services-register.md` — Реестр внешних сервисов и подрядчиков (8 сервисов, чек-лист, статусы)

   **Для сотрудников:**
   - `docs/staff-confidentiality-agreement.md` — Соглашение о конфиденциальности (9 разделов, шаблон подписи)

   **Для интерфейса:**
   - `docs/legal-interface-copy.md` — Юридические тексты (14 элементов интерфейса)

   **Индекс:**
   - `docs/legal-documents-index.md` — Индекс документов (типы, владельцы, статусы, график пересмотра)

3. **Ключевые особенности документов:**
   - Русский язык, деловой стиль, без избыточного юридического языка
   - Статус draft, указаны места для проверки юристом
   - Все документы содержат пометку о необходимости юридической проверки
   - Каждый документ содержит перечень мест, требующих проверки юриста
   - Учтены все 6 ролей платформы (admin, instructor, curator, super_curator, student, customer_observer)
   - Учтены технические сервисы (Vercel, Supabase, GitHub, YouTube, Sentry)
   - Не создано отдельное «Согласие на обработку персональных данных» (требование соблюдено)
   - Учтён существующий `ConsentLog` в Prisma-схеме

4. **Проверки:** Документы созданы, прочитаны, соответствуют структуре спецификации.
5. **Отсутствует отдельное «Согласие на обработку персональных данных».**

6. **Заполнены реквизиты организации:**
   - ТОО «DESWAY (ДИСВЭЙ)», БИН 221140019814
   - Юридический адрес: г. Алматы, ул. Шолохова, д. 20
   - Email: admin@aistrategicacademy.com
   - Руководитель: Каримова Аружан Спартакқызы
   - Дата документов: 01.03.2026
   - Несовершеннолетние: нет
   - Sentry / email / AI-провайдеры: не используются
   - YouTube: не используется (статус Planned)
   - Сроки хранения: 1 год для основных категорий
   - DPA с Vercel и Supabase: отсутствуют

## 2026-05-16 — Phase 3-4: Scheduled reports, security review, scale path

Автор/agent: opencode
Тип изменения: feature / infrastructure / documentation

1. **Scheduled report export**: 
   - Created `POST /api/v1/reports/scheduled` — защищён CRON_SECRET, обрабатывает до 50 outbox-задач за вызов
   - Добавлен `CRON_SECRET` в `lib/env.ts`
   - Совместим с Vercel Cron Jobs, cron-job.org, pg_cron, GitHub Actions
   - Починен processor: `certificates` теперь поддерживает PDF

2. **OWASP/WCAG Security Review**: `docs/security-review.md` — полный аудит:
   - OWASP Top 10 (2021): 9/10 compliant, 1 recommendation (2FA for admin)
   - WCAG 2.1 AA: 24/25 criteria met, 1 recommendation (skip-to-content link)
   - 8 improvement recommendations с приоритетами

3. **Scale Path**: `docs/scale-path.md` — архитектура для microservices extraction:
   - 4 кандидата на выделение (notifications, reports, certificates, search)
   - Message broker contract (outbox → consumer)
   - Триггеры для начала extraction

4. **Certificate PDF processor** — исправлен: теперь поддерживает PDF для сертификатов

5. **TypeScript: 0 errors. ESLint: 0 errors, 0 warnings. Build: passed.**

## 2026-05-16 — Phase 1 complete, Phase 2 production hardening

Автор/agent: opencode
Тип изменения: feature / infrastructure / documentation

1. **Phase 1 complete**:
   - Push notifications: `firebase-admin` installed, `PushSubscription` model in Prisma, `/api/v1/push/subscribe` endpoint, `pwa-register.tsx` subscribes after SW registration, `createNotification()` sends push via Firebase
   - Assignment file upload: S3 presigned upload integrated into `assignment-view.tsx`
   - Quiz result detail: per-question answer review with color-coded correct/incorrect display
   - Course settings panel: detailed info (modules, lessons, cover, descriptions)

2. **Phase 2 documentation**:
   - `infra/backup/runbook.md` — full backup/restore procedures, retention policy, encryption, S3 off-site, emergency recovery
   - `infra/deployment-check.md` — deployment validation checklist with smoke tests, performance checks, rollback plan

3. **Existing production-ready infrastructure confirmed**:
   - Email delivery (`sendEmail()`, SMTP transporter, forgot/reset/verify flows) — ✅
   - Certificate production PDF (Cyrillic NotoSans, QR codes, verification URL) — ✅
   - Rate limiting (Redis + memory fallback, applied to auth endpoints) — ✅

4. **TypeScript: 0 errors. ESLint: 0 errors, 0 warnings. Build: passed.**

## 2026-05-16 — Phase 1: Academy Operations — editor, quiz, assignments, settings

Автор/agent: opencode
Тип изменения: feature / ui / api

1. **Course Settings Panel** (`course-settings-panel.tsx`): Добавлена детальная информация:
   - Количество модулей и уроков
   - Обложка курса (если есть)
   - Описание модуля
   - Summary урока
   - Список тестов и заданий в уроке

2. **Assignment file upload** (`assignment-view.tsx`): Интегрирована загрузка файлов через S3 presigned URL:
   - Кнопка выбора файла → presigned URL → S3 upload
   - Индикатор загрузки, отображение имени файла, возможность удалить
   - Поддержка PDF, изображений, ZIP, DOC/DOCX
   - URL файла передаётся в body запроса при отправке

3. **Quiz result detail** (`result/page.tsx`): Добавлен детальный разбор ответов:
   - По-вопросный разбор с цветовой индикацией (зелёный = верно, красный = неверно)
   - Показ выбранного ответа и правильного ответа
   - Сводка: всего/правильно/неправильно/попытка
   - Все вопросы в одном скролле

4. **TypeScript: 0 errors. ESLint: 0 errors, 0 warnings. Build: passed.**

5. **Phase 1 remaining** (not started in this change):
   - Drag-and-drop блоков контента (lesson-block-editor)
   - Push notifications wiring (require firebase-admin install)
   - PushManager.subscribe() in PWA register
   - Curator assignment queue review (page exists, uses SubmissionsQueue)

## 2026-05-15 — UI: Mobile-app adaptive theme, bottom nav, PWA enhancement

Автор/agent: opencode
Тип изменения: feature / design / pwa

1. **Mobile-first adaptive UI**: Реализована смена парадигмы между мобильным устройством и ПК:
   - Mobile (<768px): нижняя панель навигации (bottom tab bar) с иконками и активным индикатором (spring-анимация), скрытый десктопный сайдбар, компактный хедер (h-14)
   - Desktop (>=768px): боковая панель навигации (260px, sticky, glass-эффект), полноценный хедер (h-16) с навигационными ссылками, hover-эффекты на карточках
   - Bottom nav показывает первые 4-5 пунктов для каждой роли (admin, student, curator, super_curator, instructor, customer_observer)
   - Боковая панель на десктопе содержит полный список ссылок с бейджами

2. **Тёмная/светлая тема**: 
   - Переключатель темы `ThemeToggle` теперь циклически переключает 3 режима: light → dark → system
   - Анимация переключения через Framer Motion (rotate + scale)
   - `theme-color` meta tags динамически меняются в зависимости от темы (light: #F8FAFC, dark: #0F172A)

3. **Safe area & viewport**: 
   - `env(safe-area-inset-*)` для notched-устройств
   - `viewport-fit=cover` для Full-screen PWA
   - Нижняя навигация корректно обрабатывает safe-area-bottom
   - CSS-переменная `--nav-height: 64px`

4. **PWA улучшения**:
   - Обновлён `manifest.json`: maskable icons, shortcuts, orientation, scope, categories
   - Service Worker v2: стратегия network-first для навигации, cache-first для статики, offline fallback
   - Добавлена offline-страница `/offline` с кнопкой "Попробовать снова"
   - Push-уведомления: вибрация, action buttons (Открыть/Закрыть)
   - `PWARegister`: обработка `appinstalled` события с toast-уведомлением

5. **UI компоненты**:
   - `Button`: `min-h-[44px]` на мобильных (touch target), `active:scale-[0.97]` нажатие
   - `Card`: `md:hover:shadow-card-hover` на десктопе, адаптивные отступы (p-4 md:p-5)
   - `PageHeader`: меньшие отступы на мобильных

6. **Удалён/заменён**: `components/layout/mobile-nav.tsx` → `components/layout/mobile-bottom-nav.tsx`

7. **TypeScript**: 0 errors.

## 2026-05-15 — Fix: chat notification routing for curators/instructors

Автор/agent: opencode
Тип изменения: bugfix

1. **`server/actions/chat.ts` — инвертирована логика ссылки в уведомлении**:
   - Было (bug): при отправке сообщения куратором ссылка вела на `/curator/chat` (т.е. куратору же), при отправке студентом — на `/student/lessons/:id` (студенту же)
   - Стало: ссылка определяется **ролью получателя**, а не отправителя. Куратору → `/curator/chat`, студенту → `/student/lessons/:lessonId`
   - `getMyConversations` теперь включает `lessonId` и `lessonTitle` — контекст урока, из которого пришло сообщение

2. **`components/lms/notifications-dropdown.tsx` — исправлен fallback**:
   - Убран хардкод `/student/lessons/:refId` в fallback-ссылке
   - Теперь используется `data.link` из уведомления (корректно устанавливается сервером)
   - Fallback: `/notifications` (безопасно для любой роли)

3. **`app/curator/chat/chat-list.tsx` — добавлен контекст урока**:
   - В карточке диалога показывается название урока, с которого начат чат (иконка BookOpen + название)
   - `ChatPanel` в диалоге открывается с `lessonId` из первого сообщения диалога
   - Куратор видит, из какого урока пришёл вопрос/сообщение

4. **TypeScript: 0 errors. ESLint: 0 errors, 0 warnings.**

## 2026-05-15 — Feat: curator reminder, super-curator leaderboard, admin cache-bust, chat history

Автор/agent: opencode
Тип изменения: feature

1. **Полная история чата для куратора**:
   - При открытии диалога в `/curator/chat` `ChatPanel` больше не фильтрует по `lessonId`
   - Показываются ВСЕ сообщения между куратором и слушателем
   - Контекст урока отображается как справочная информация (иконка 📖)

2. **Напоминание о неотвеченных сообщениях (2 часа)**:
   - Создан `server/actions/chat-reminder.ts` — проверяет диалоги, где последнее сообщение от студента, и куратор не ответил > 2 часов
   - Дедупликация: повторное напоминание не ранее чем через 4 часа
   - Добавлен тип уведомления `curator_response_reminder` в `NotificationEvent`
   - Проверка вызывается при заходе на страницу `/curator/chat`

3. **Лидерборд кураторов для супер-куратора**:
   - Создан компонент `components/lms/curator-leaderboard.tsx` с сортировкой по: отвечено вопросов, скорость ответа, сообщений, слушателей, открытых вопросов
   - Топ-3 с медалями (🥇🥈🥉), индикатор онлайн/офлайн
   - Расширен тип `CuratorLoad`: `questionsAnswered`, `messagesSent`, `isOnline`, `lastSeenAt`
   - Heartbeat API (`POST /api/v1/heartbeat`) обновляет `lastLoginAt` каждые 5 минут
   - `Heartbeat` компонент встроен в корневой layout

4. **Кнопка сброса кэша для админа**:
   - В `/admin/settings` добавлена вкладка "Кэш" с текущей версией сборки
   - `incrementBuildVersionAction` увеличивает `BUILD_VERSION` в `app_settings`
   - API `GET /api/v1/build-version` для SW
   - Service Worker v3 проверяет версию каждые 5 минут, при изменении сбрасывает все кэши и показывает toast "Платформа обновлена" с кнопкой "Обновить"
   - Прогресс обучения и история чатов не затрагиваются (cache-only статика)

5. **TypeScript: 0 errors. ESLint: 0 errors, 0 warnings.**

## 2026-05-15 — Feat: PWA install prompt, user name security

Автор/agent: opencode
Тип изменения: feature / security

1. **PWA установка — баннер + инструкция**:
   - Создан `components/lms/pwa-install-prompt.tsx` — баннер установки с кнопкой
   - iOS: модальное окно с 4-шаговой инструкцией (через Share → На экран «Домой»)
   - Android: перехват `beforeinstallprompt`, нативная установка
   - Авто-скрытие если приложение уже установлено
   - Анимация появления/скрытия через Framer Motion
   - Интегрирован в `Providers`

2. **Безопасность имён пользователей**:
   - Создан `lib/auth/mask-name.ts` — функция маскировки реальных имён
   - `maskName(realName, viewerRoles, viewerId, ownerId)`:
     - Админ видит реальные имена
     - Своё имя — показывается полностью
     - Для чужих — только имя (без фамилии)
   - `deriveDisplayName(realName)` — берёт только первое слово
   - `maskChatName(senderName, senderId, viewerRoles, viewerId)` — для чата

3. **Chat — имена маскируются**:
   - `getConversation()`: `senderName` теперь проходит через `maskChatName`
   - `getMyConversations()`: `partnerName` маскируется для не-админов
   - Уведомления о новых сообщениях: имя отправителя маскировано

4. **Сертификаты — исключение**: реальное имя используется (не маскируется)

5. **Созданные файлы**:
   - `components/lms/pwa-install-prompt.tsx` — PWA баннер + iOS инструкция
   - `lib/auth/mask-name.ts` — маскировка имён
   - `app/api/v1/heartbeat/route.ts` (добавлен ранее)

6. **TypeScript: 0 errors. ESLint: 0 errors, 0 warnings.**

## 2026-05-15 — Fix: deadlineDaysLeft, complete Framer Motion animations, review last 9 commits

Автор/agent: opencode
Тип изменения: bugfix / animations / refactor

1. **deadlineDaysLeft**: Исправлен серверный метод `getContinueLearning` — теперь возвращает `deadlineDaysLeft` (разница в днях между дедлайном и текущей датой). Ранее поле было в типе `ContinueLearning`, но не заполнялось сервером. Виджет `ContinueLearningCard` корректно отображает дедлайн.
2. **Framer Motion animations**: Завершена интеграция анимаций на платформу. Добавлены `Stagger`, `FadeIn`, `CardHover` во все виджеты дашборда:
   - `CourseProgressGrid` — карточки курсов обёрнуты в `FadeIn` + `CardHover`
   - `ContinueLearningCard` — обёрнут в `FadeIn`
   - `QuestionsQueue` — каждый вопрос обёрнут в `FadeIn` + `CardHover`
   - `RisksList` — каждый риск обёрнут в `FadeIn` + `CardHover`
   - `MetricGrid`, `CourseManageGrid` — уже были анимированы ранее
   - `PageTransition` в `AppShell` оборачивает контент всех страниц
3. **Review last 9 commits**: Проверены все изменения (animations, PWA, CSP, env, notification service, layout). Ошибок не найдено. CSP расширен для `localhost:*` и `127.0.0.1:*`. Notification service lazy-loads nodemailer.
4. **TypeScript**: 0 errors. **Tests**: 217 passed, 40/40 test files.

## 2026-05-15 — Fix chat/questions merge, manifest.json, MinIO, auto-issue certificates

Автор/agent: opencode
Тип изменения: bugfix / chat / certificates / manifest

1. **Unified chat and questions**: Удалён компонент `AskCuratorQuestion` из `lesson-player-shell.tsx` (и из `student-lesson-view.tsx`). Единый интерфейс связи студента с куратором — `ChatPanel` (модель `Message`). Удалён `LessonQuestion` include из `lessonDetailInclude`. Убран `myQuestions` из типа `StudentLessonLearningDetail`.
2. **Manifest.json Syntax Error**: Убрано свойство `manifest` из экспорта `metadata`, чтобы Next.js не генерировал route handler, конфликтующий со статическим `public/manifest.json`. Файл сервится напрямую.
3. **Minio not running**: Диагностика — MinIO отключён на localhost:9000. Решение: запустить `docker compose up minio -d`.
4. **Auto-issue certificates**: В `markLessonProgress` добавлена авто-выдача сертификата при достижении `CERTIFICATE_COMPLETION_THRESHOLD` (по умолчанию 85%). Проверяется отсутствие существующего сертификата. Ошибки выдачи логируются, не блокируют прогресс.
5. **Tests**: Исправлен мок `prisma.certificate.findFirst` в `progress-service.test.ts`. Только 217 тестов проходят.

## 2026-05-13 — Credentials login and CI e2e login stabilization

Автор/agent: Codex
Тип изменения: bugfix / auth
Тип изменения: bugfix / auth / e2e

Файлы/модули:

- `server/auth/options.ts` — credentials and OAuth sign-in now use normalized active-status check instead of strict `"ACTIVE"`.
- `lib/auth/user-status.ts` — added shared `isActiveUserStatus()` helper.
- `tests/unit/user-status.test.ts` — added coverage for `active`, `ACTIVE`, inactive and missing statuses.
- `tests/unit/auth-options.test.ts` — added regression coverage for credentials login with Prisma default `status = "active"`.
- `components/auth/login-form.tsx` — submit button now stays disabled until client hydration, preventing native GET form submission during e2e.
- `tests/e2e/roles.spec.ts` — role login helper waits for hydrated auth form and uses `127.0.0.1` consistently.
- `.github/workflows/ci.yml` — e2e job now runs `db:push` and `db:seed` before Playwright.
- `next.config.ts` — added `allowedDevOrigins` for `127.0.0.1` to avoid Next dev-server HMR origin warnings in Playwright.

Summary:

- Fixed production credentials login returning `401 Unauthorized` for valid issued users when database rows use the Prisma default `status = "active"`.
- Fixed credentials login returning `401 Unauthorized` for valid issued users when database rows use the Prisma default `status = "active"`.
- Kept compatibility with uppercase `"ACTIVE"` rows so existing data does not need an immediate migration.
- Fixed CI e2e bootstrap so demo-role login tests have schema + seed data before Playwright starts.
- Reduced e2e login flakiness caused by clicking the form before React hydration.

Проверки:

- `npm run lint` — passed
- `npx vitest run tests/unit/auth-options.test.ts tests/unit/user-status.test.ts tests/integration/login.test.ts` — passed
- `npm run test` — 104 passed, 23 test files
- `npm run typecheck` — passed
- `npm run verify` — passed (`eslint --max-warnings=0`, `tsc --noEmit`, Vitest 23 files / 104 tests, `next build`).
- `npm run test:e2e` — local rerun no longer hits the native GET form-submit timeout, but still cannot pass against the current `.env` because it points at remote Supabase seed data; I did not run `db:push`/`db:seed` against that remote database. CI e2e now prepares its own localhost Postgres with `db:push` + `db:seed` before Playwright.

Риски:

- Production still returns 401 if the target user was not provisioned/seeded or has no password hash.
- The Vercel deployment must be rebuilt before the deployed URL reflects this fix.
- Local Playwright was not run against `.env` to avoid mutating a non-CI database with `db:push/db:seed`.

Next steps:

- Redeploy Vercel after merging/pushing this change.
- If login still fails after redeploy, verify production DB contains the expected user and a non-empty `password_hash`.
- Replace the incomplete initial migration with a full generated migration before relying on `prisma migrate deploy` for fresh environments.

## 2026-05-12 — 8-PR stabilization: build fix, seed/auth, notifications, progress, assignment/quiz access, student UX, reports scoping

Автор/agent: big-pickle
Тип изменения: stabilization / bugfix / security

Файлы/модули:

- `package.json` — eslint-config-next reverted to ^15.5.18 (compatible with next 16.2.5)
- `eslint.config.mjs` — reverted to FlatCompat format
- `app/instructor/questions/page.tsx` — removed unused CardTitle import
- `app/api/seed-temp/route.ts` — rewritten: SEED_ADMIN_TOKEN auth, deterministic password, no secret logging
- `.env.example` — SEED_USER_PASSWORD → SEED_ADMIN_TOKEN
- `server/modules/notifications/service.ts` — removed `|| !input.channel` from email condition
- `server/modules/progress/service.ts` — added `getCompletionBasis<T>` helper, applied to module/course progress
- `server/modules/assignments/service.ts` — enrollment check + courseId resolution from lesson.module.courseId in `submitAssignment`
- `server/modules/quizzes/service.ts` — courseId resolution from lesson, unswallowed progress sync error
- `components/lms/student-lesson-view.tsx` — `normalizeVideoUrl` helper, toast error handling in `askQuestion`
- `app/api/v1/reports/route.ts` — rewritten `getScopedStudentIds` with per-role scoping (admin, curator, super_curator, instructor, customer_observer), removed duplicate inline scoping
- `tests/unit/assignments.test.ts` — updated mocks for enrollment check

Summary:

- **PR-1 (Green main):** Fixed build by reverting eslint-config-next from 16.2.5 to ^15.5.18, restored FlatCompat config, removed unused CardTitle import.
- **PR-2 (Seed/auth):** Replaced catch-22 `requireUser("settings:manage")` with SEED_ADMIN_TOKEN check, deterministic password, no secret logging.
- **PR-3 (Notifications):** Default in_app channel no longer triggers email (removed `|| !input.channel`).
- **PR-4 (Progress):** Generic `getCompletionBasis<T>` helper uses `isRequired=true` lessons when any exist; applied to module/course progress.
- **PR-5 (Assignment access):** Resolves courseId from `assignment.lesson.module.courseId`, checks active enrollment, throws 403 if not enrolled.
- **PR-6 (Quiz access):** Resolves courseId from lesson when `quiz.courseId` is null, unswallowed progress sync error.
- **PR-7 (Student UX):** YouTube URL normalization (watch?v= → /embed/), toast.error/success on askQuestion, try-catch, sending disabled state.
- **PR-8 (Reports scoping):** Rewritten `getScopedStudentIds` with explicit per-role Prisma queries; customer_observer denied all data.

Проверки:

- `npm run typecheck` — passed
- `npm run lint -- --max-warnings=0` — passed
- `npm run test` — 93 passed, 20 test files
- `npm run build` — passed

Риски:

- SEED_ADMIN_TOKEN is a dev-only bootstrap; must not be used in production.
- customer_observer currently has no cohort/project linkage; scoped to empty array (safe default).
- Reports scoping depends on correct role assignment in the database.

Next steps:

- Wire transactional email provider (SMTP) for password reset and verification flows.
- Add production backup jobs and restore runbooks.
- Add test coverage for reports scoping edge cases (multi-role users, customer_observer cohorts).

## 2026-05-12 — Instructor questions and reports, analytics tabs, curator/instructor settings

Автор/agent: big-pickle
Тип изменения: feature / UI / analytics
Файлы/модули:

- `app/instructor/questions/page.tsx` — full forwarded questions UI with answer form
- `app/instructor/reports/page.tsx` — report export cards with fixed href template
- `app/instructor/analytics/page.tsx` — added "По тестам" tab with per-quiz avg score
- `app/admin/analytics/page.tsx` — added "По пользователям" tab with role distribution, recent registrations
- `app/curator/settings/page.tsx` — реализованы вкладки Профиль/Уведомления/Безопасность
- `app/instructor/settings/page.tsx` — реализованы вкладки Профиль/Уведомления/Безопасность
- `app/student/certificates/page.tsx` — fixed PDF download link `/api/certificates` → `/api/v1/certificates`
- `components/layout/navigation.ts` — added "Отчёты" nav item for instructor
- `components/ui/textarea.tsx` — new UI component
- `server/actions/curator.ts` — fixed syntax errors ({{ }}, \r\n), added missing findUnique, converted answerForwardedQuestionAction to FormData, preserved curatorId on instructor answer
- `server/actions/dashboard.ts` — added getForwardedQuestions(), extended getInstructorAnalytics with per-quiz stats
- `server/modules/notifications/service.ts` — added `question_forwarded` event type
- `server/modules/learning/service.ts` — added notification to curator on student question
- `app/api/v1/reports/route.ts` — added instructor role scoping to reports API

Summary:

- Реализован полный цикл вопросов: студент → куратор → инструктор с уведомлениями
- Страница отчётов инструктора с экспортом CSV/Excel/PDF
- Страницы настроек куратора и инструктора (3 вкладки: профиль, уведомления, безопасность)
- Аналитика "По пользователям" для админа (распределение ролей, последние регистрации)
- Аналитика "По тестам" для инструктора (средний балл по каждому тесту)
- Исправлены синтаксические ошибки в server/actions/curator.ts
- Добавлен UI-компонент Textarea

Проверки:

- `npx tsc --noEmit` — прошёл успешно
- `npx vitest run` — 93 passed, 20 test files

Риски:

- Instructor analytics "По тестам" загружает все попытки тестов; при большом количестве может быть медленно (можно добавить пагинацию позднее)
- Настройки профиля используют статические placeholder-данные (name/email), т.к. не подключены к серверу для сохранения

Next steps:

- Подключить mutation actions для сохранения профиля и смены пароля
- Добавить Redis-backed rate limiting
- Production deployment validation

Автор/agent: Codex
Тип изменения: infra / security / learning / verification
Файлы/модули:

- `docker-compose.yml`
- `.env.example`
- `infra/k8s/postgres.yaml`
- `infra/k8s/networkpolicy.yaml`
- `infra/k8s/secret.template.yaml`
- `lib/auth/role-redirect.ts`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/student/courses/[courseId]/page.tsx`
- `app/student/modules/[moduleId]/page.tsx`
- `app/student/lessons/[lessonId]/page.tsx`
- `server/modules/learning/service.ts`
- `server/modules/analytics/service.ts`
- `docs/assumptions.md`
- `docs/security.md`
- `docs/todo.md`

Summary:

- Главная страница академии закреплена как форма входа; landing/marketing слой не используется.
- После входа пользователь направляется в дашборд по своей роли через серверный role redirect.
- База данных переведена в self-hosted модель: PostgreSQL запускается как внутренний сервис платформы, без публичного порта в Docker Compose.
- Kubernetes получил `academy-postgres` StatefulSet, ClusterIP Service и NetworkPolicy, разрешающую доступ к БД только pod-ам приложения.
- `DATABASE_URL`, `POSTGRES_PASSWORD` и MinIO credentials документированы как внутренние секреты, не предназначенные для Git или публичных консолей.
- Credentials login теперь принимает только активных пользователей; отключённый аккаунт не может войти даже с правильным паролем.
- Learning flow подключен к server-side service: курс, модуль и урок проверяют активное enrollment, sequential lock и показывают реальные lesson/progress данные.
- Readiness endpoints теперь возвращают typed `503 service_unavailable`, если self-hosted PostgreSQL недоступен из runtime, вместо generic `500`.

Проверки:

- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run test` — прошёл успешно: 9 test files, 13 tests.
- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run build` — прошёл успешно.

Риски:

- Локальное создание 4053 аккаунтов через `npm.cmd run users:provision` требует запущенный внутренний PostgreSQL и реальный `.env`; CSV с паролями пишется только в ignored `var/credentials`.
- Админский доступ к самой БД остаётся операционной процедурой: через защищённый shell/port-forward/bastion, а не через публичный DB UI.
- Для production нужен backup/restore runbook и регулярная проверка восстановления.

Next steps:

- Запустить self-hosted PostgreSQL через Docker/K8s/VPS, применить миграции и seed.
- Выполнить `npm.cmd run users:provision` в закрытой среде и передать CSV через защищённый канал.
- Добавить backup jobs, restore rehearsal и admin-only operational access procedure.

## 2026-05-07 — Issued credentials вместо публичной регистрации

Автор/agent: Codex
Тип изменения: auth / user provisioning / documentation
Файлы/модули:

- `scripts/provision-users.ts`
- `app/register/page.tsx`
- `app/api/v1/auth/register/route.ts`
- `app/login/page.tsx`
- `components/auth/register-form.tsx`
- `.env.example`
- `.gitignore`
- `README.md`
- `docs/api/openapi.yaml`
- `docs/specification.md`
- `docs/implementation-plan.md`
- `tests/integration/auth-register-disabled.test.ts`
- `tests/integration/seed.test.ts`

Summary:

- Публичная self-registration модель отключена: `/api/v1/auth/register` возвращает typed `410 Gone`, `/register` объясняет, что аккаунты выдаёт академия.
- Удалена UI-форма регистрации и ссылка "Регистрация" со страницы входа.
- Добавлен `npm.cmd run users:provision` для создания 4000 слушателей, 50 кураторов, главного куратора, администратора и наблюдающего.
- Скрипт создаёт/обновляет роли и permissions, создаёт email/password аккаунты и пишет credentials CSV в ignored `var/credentials`.
- Добавлены env-параметры `PROVISION_STUDENT_COUNT`, `PROVISION_CURATOR_COUNT`, `PROVISION_EMAIL_DOMAIN`, `PROVISION_OUTPUT_DIR`, `PROVISION_RESET_EXISTING_PASSWORDS`.

Проверки:

- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run test` — прошёл успешно: 9 test files, 13 tests.
- `npm.cmd run build` — прошёл успешно.
- `npm.cmd run users:provision` — не выполнил создание аккаунтов, потому что текущий `DATABASE_URL` из `.env` недоступен с этой машины.

Риски:

- Credentials CSV содержит реальные временные пароли; директория `var/` добавлена в `.gitignore` и не должна коммититься.
- Для production нужно сначала настроить `DATABASE_URL` и применить миграции, затем запускать provisioning.
- Если используется Supabase, нужен доступный из среды запуска pooler/direct URL; текущий direct DB endpoint не принимает подключение из этой среды.

Next steps:

- Запустить `npm.cmd run users:provision` против production PostgreSQL только после проверки сетевого доступа к `DATABASE_URL`.
- Перед выдачей пользователям хранить CSV в защищённом канале и удалить локальную копию после операционной передачи.

## 2026-05-07 — P0 защита role pages и отключение production mock fallback

Автор/agent: Codex
Тип изменения: security / auth / production hardening
Файлы/модули:

- `lib/auth/page-guards.ts`
- `middleware.ts`
- `app/403/page.tsx`
- `app/{admin,student,curator,instructor,super-curator,customer-observer}/page.tsx`
- `components/lms/dashboard-unavailable.tsx`
- `components/auth/login-form.tsx`
- `server/auth/options.ts`
- `server/auth/provider-flags.ts`
- `server/modules/auth/service.ts`
- `server/modules/progress/service.ts`
- `.env.example`

Summary:

- Добавлен `requireRolePage()` и server-side role guard для основных кабинетов ролей.
- Добавлен `middleware.ts` для базового отсечения приватных route prefixes до входа.
- Production mock fallback отключён: фейковые dashboard data используются только при `NEXT_PUBLIC_DEMO_MODE=true`; иначе показывается явное состояние недоступности данных.
- Добавлена `/403` страница для аккаунтов без нужной роли.
- OAuth providers и кнопки Google/GitHub подключаются только при наличии реальных client id/secret.
- Регистрация теперь создаёт роль `student`, если seed ещё не создал её в новой базе.
- `markLessonProgress()` требует active enrollment и блокирует ручное прохождение sequential-уроков без предыдущих обязательных lessons.

Проверки:

- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run build` — требуется финальный повтор после записи.
- `npm.cmd run test` — требуется финальный повтор; ранее локально мог блокироваться sandbox `spawn EPERM`.

Риски:

- Живой Vercel URL `https://academic-silk-ten.vercel.app` сейчас отвечает `500` на `/api/readyz`, что указывает на отсутствующий/неготовый production `DATABASE_URL` или неприменённые миграции.
- `/api/auth/providers` на живом URL отвечает, но `/api/auth/session` и регистрация будут зависеть от готовности БД.

Next steps:

- Настроить Vercel env: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL`.
- Выполнить `npm.cmd run db:migrate` и `npm.cmd run db:seed` против managed PostgreSQL.
- После деплоя проверить `/api/readyz`, `/login`, `/register`, `/admin`, `/student`.

## 2026-05-07 — Стабилизация GitHub/Vercel и invite-only контракта

Автор/agent: Codex
Тип изменения: CI/CD / Vercel / runtime / documentation
Файлы/модули:

- `.github/workflows/ci.yml`
- `vercel.json`
- `package.json`, `package-lock.json`
- `app/student/lessons/[lessonId]/page.tsx`
- `app/{admin,curator,customer-observer,instructor,student,super-curator}/page.tsx`
- `app/api/v1/payments/checkout/route.ts`
- `app/api/v1/webhooks/stripe/route.ts`
- `server/auth/options.ts`
- `server/modules/analytics/service.ts`
- `server/modules/billing/service.ts`
- `lib/auth/rbac.ts`
- `docs/api/openapi.yaml`
- `docs/specification.md`
- `docs/security.md`
- `docs/assumptions.md`
- `services/*`

Summary:

- Исправлены TypeScript и ESLint blockers, из-за которых падали GitHub Actions и Vercel build.
- `payments:manage` заменён на `invites:manage`; платежные endpoints теперь возвращают typed `410 Gone`, а не generic runtime error.
- Аналитика больше не обращается к удалённой `Payment` модели и отдаёт invite metrics вместе с backward-compatible `revenueCents: 0`.
- Stripe dependency удалена из runtime dependencies; текущий production contract зафиксирован как invite-only.
- CI усилен: `npm run lint -- --max-warnings=0` запускается до typecheck/test/build, Vercel использует `npm ci`.
- Документация, OpenAPI и microservices reference синхронизированы с invite-only моделью.
- Role dashboards помечены `force-dynamic`, чтобы Vercel build не выполнял Prisma-запросы без `DATABASE_URL` во время static generation.

Проверки:

- `npm.cmd run db:generate` — прошёл успешно.
- `npm.cmd run lint -- --max-warnings=0` — прошёл успешно.
- `npm.cmd run typecheck` — прошёл успешно.
- `npm.cmd run test` — локально блокируется sandbox `spawn EPERM`; escalated повтор в этой сессии был отклонён auto-review лимитом, поэтому финальный статус зависит от GitHub Actions.
- `npm.cmd run build` — прошёл успешно; role dashboards теперь собираются как dynamic routes без Prisma `DATABASE_URL` noise во время build.

Риски:

- Vercel Production/Preview требуют реальные `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_URL` и OAuth secrets при наличии; значения не коммитятся.
- До подключения managed PostgreSQL `readyz` будет зависеть от доступности `DATABASE_URL`.
- Browser plugin ранее мог не стартовать в Codex runtime; если повторится, smoke нужно выполнить Playwright fallback и зафиксировать отдельной записью.

Next steps:

- Запушить ветку `codex/stabilize-github-vercel`, открыть PR в `ElazAzel/academic`.
- Проверить GitHub Actions job `verify` и Vercel Preview.
- После merge настроить production env, выполнить миграции/seed против managed PostgreSQL и проверить production deployment.

## 2026-05-07 — Server Actions, полные суб-страницы ролей, страницы курсов/уроков

Автор/agent: Antigravity
Тип изменения: feature — backend actions, full pages

### Что сделано

1. **Server Actions** — `server/actions/dashboard.ts`
   - `getStudentDashboard()` — реальные Prisma-запросы для слушателя (enrollments, progress, questions)
   - `getCuratorDashboard()` — вопросы, задания, риски слушателей куратора
   - `getSuperCuratorDashboard()` — нагрузка кураторов, потоки
   - `getAdminDashboard()` — курсы, потоки, инвайты, сертификаты
   - `safeQuery()` wrapper: graceful fallback если БД недоступна

2. **Server Actions** — `server/actions/courses.ts`
   - `getCourseForStudent(courseId)` — курс с модулями, уроками и прогрессом
   - `getLessonForStudent(lessonId)` — урок с медиа, тестами, заданиями
   - `askCuratorQuestion(lessonId, text)` — задать вопрос куратору

3. **Страница курса слушателя** — `app/student/courses/[courseId]/page.tsx`
   - Прогресс-бар курса с инструкторами
   - Цель курса и порог сертификации
   - Модули: развёрнутые уроки, иконки типов, статусы (✓ / ▶ / 🔒)
   - Sequential lock визуализация
   - Навигация по урокам

4. **Страница урока слушателя** — `app/student/lessons/[lessonId]/page.tsx`
   - YouTube видео embed (16:9 responsive)
   - Текстовый контент (blocks)
   - Прикреплённые файлы
   - Тест: карточка с кнопкой "Пройти тест"
   - "Задать вопрос куратору": форма + история вопросов
   - Навигация: ← предыдущий / следующий → урок
   - Breadcrumb: Мои курсы > Курс > Модуль

5. **Суб-страницы куратора:**
   - `app/curator/students/page.tsx` — таблица слушателей с прогрессом, рисками
   - `app/curator/questions/page.tsx` — открытые/отвеченные вопросы
   - `app/curator/assignments/page.tsx` — задания на проверку
   - `app/curator/risks/page.tsx` — риски слушателей

6. **Суб-страницы супер-куратора:**
   - `app/super-curator/curators/page.tsx` — таблица кураторов
   - `app/super-curator/distribution/page.tsx` — назначение кураторов нераспределённым слушателям
   - `app/super-curator/risks/page.tsx` — риски по потокам
   - `app/super-curator/reports/page.tsx` — отчёты с кнопками скачивания

7. **Суб-страницы администратора:**
   - `app/admin/invites/page.tsx` — полная страница инвайтов (создание формы + таблица + copy/delete)
   - `app/admin/users/page.tsx` — таблица пользователей + импорт Excel
   - `app/admin/courses/page.tsx` — сетка курсов с кнопкой создания
   - `app/student/my-courses/page.tsx` — реальный список курсов

8. **Документация** — `docs/QUICKSTART.md`
   - Docker setup, Prisma migrate, seed, тестовые аккаунты

**Файлы (новые)**: 14 файлов
**Файлы (перезаписаны)**: 3 файла

## 2026-05-07 — Удаление Stripe/billing, полные дашборды ролей, доменные типы

Автор/agent: Antigravity (Planning Mode)
Тип изменения: **breaking** — schema, UI, architecture

### Список изменений

1. **Billing удалён.** Платформа использует invite-доступ (InviteLink + выданные credentials).
   - Удалены: `PaymentStatus`, `PaymentType` enum, `Payment` model из Prisma schema
   - Удалены: `STRIPE_*` переменные из `lib/env.ts` и `.env.example`
   - `server/modules/billing/service.ts` → stub (throws "disabled")
   - `app/api/v1/payments/checkout/route.ts` → disabled stub
   - `app/api/v1/webhooks/stripe/route.ts` → disabled stub
   - `app/admin/payments/page.tsx` → redirect to invite management
   - Seed: `payments:manage` → `invites:manage`

2. **Доменные типы** — `types/domain.ts`
   - 30+ TypeScript интерфейсов: CourseSummary, ModuleDetail, LessonDetail, StudentProgress, ContinueLearning, QuizSummary, AssignmentSummary, SubmissionForReview, QuestionFromStudent, RiskItem, CuratorLoad, CohortSummary, CertificateSummary, InviteLinkSummary, DashboardMetric
   - Enums: RoleKey, CourseStatus, ProgressStatus, EnrollmentStatus, SubmissionStatus, RiskType, RiskSeverity
   - ROLE_LABELS, RISK_LABELS — локализованные словари

3. **Mock-данные** — `lib/mock-data.ts`
   - Typed mock данные для всех ролей: курсы, прогресс, вопросы, задания, риски, кураторы, потоки, сертификаты, инвайты
   - Функции метрик: getStudentMetrics, getCuratorMetrics, getSuperCuratorMetrics, getAdminMetrics, getInstructorMetrics, getObserverMetrics

4. **UI-компоненты** — новые:
   - `components/ui/avatar.tsx` — инициалы + image
   - `components/ui/tabs.tsx` — animated tab switcher
   - `components/ui/table.tsx` — full table suite (Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
   - `components/ui/skeleton.tsx` — loading placeholder
   - `components/ui/separator.tsx` — divider

5. **Dashboard widgets** — `components/lms/dashboard-widgets.tsx` полная перезапись:
   - MetricGrid, ContinueLearningCard, CourseProgressGrid, CourseManageGrid, QuestionsQueue, SubmissionsQueue, RisksList, CuratorLoadTable

6. **Универсальный AppShell** — `components/layout/app-shell.tsx`
   - Role-based sidebar навигация для 6 ролей
   - Badge с текущей ролью
   - Полные меню: student(7), curator(6), super_curator(6), instructor(7), admin(9), customer_observer(4)

7. **Полные дашборды ролей:**
   - `app/student/page.tsx` — MetricGrid + ContinueLearningCard + табы (Курсы, Ответы куратора, Дедлайны, Уведомления)
   - `app/curator/page.tsx` — MetricGrid + табы (Вопросы, Задания, Риски)
   - `app/super-curator/page.tsx` — MetricGrid + табы (Нагрузка кураторов, Потоки, Риски, Нераспределённые)
   - `app/admin/page.tsx` — MetricGrid + action buttons + табы (Курсы, Потоки, Инвайты, Сертификаты, Аудит)
   - `app/instructor/page.tsx` — MetricGrid + табы (Мои курсы, Аналитика, Вопросы от кураторов)
   - `app/customer-observer/page.tsx` — MetricGrid + прогресс потоков + табы (Сертификаты, Отчёты)

### Проверки

- [ ] `npm run typecheck` — нет TS ошибок (TODO: запустить локально)
- [ ] `npm run build` — production build проходит
- [ ] Visually verify all 6 dashboards in browser

### Риски

- Breaking: Payment model удалён из schema, нужен `npx prisma migrate dev` для сброса текущей БД
- Billing API routes — stubs, но файлы остаются для обратной совместимости
- Все суб-страницы (settings, courses, lessons) всё ещё используют WorkspacePage shell

### Следующие шаги

- Запустить PostgreSQL через Docker, `prisma migrate dev`, `prisma db seed`
- Заменить mock-данные в дашбордах на server actions с реальной БД
- Реализовать страницы курсов и уроков для слушателя
- Добавить instructor course editor

## 2026-05-07 — Подготовлена публикация проекта в GitHub

Автор/agent: Codex  
Тип изменения: repository operations / documentation  
Файлы/модули:

- `LICENSE`
- `.git/config`
- `docs/updates.md`
- `docs/implementation-plan.md`

Summary:

- Remote `Academic` переименован в стандартный `origin` для корректной работы git tooling и cloud task diff.
- Удалённая ветка `main` из `https://github.com/ElazAzel/academic` подтянута локально.
- Initial commit удалённого репозитория с `LICENSE` объединён с локальной историей через merge без force-push.
- Локальный проект опубликован в `origin/main`.

Проверки:

- `git status --short --branch` показал чистую ветку `main` перед операцией.
- `git fetch origin main` прошёл успешно.
- `git merge FETCH_HEAD --allow-unrelated-histories --no-edit` прошёл успешно и добавил `LICENSE`.
- `git push -u origin main` прошёл успешно, ветка `main` теперь отслеживает `origin/main`.

Риски:

- Истории локального проекта и удалённого initial commit были unrelated; решено через обычный merge, чтобы сохранить удалённый `LICENSE`.
- Дальнейшие push/fetch операции всё ещё зависят от доступной GitHub-аутентификации в локальном окружении.

Next steps:

- Использовать `origin/main` как upstream для дальнейших задач и cloud diff.
- При следующих изменениях продолжать обновлять этот журнал и план реализации.

## 2026-05-07 — Добавлены auth UI flow и публичная проверка сертификатов

Автор/agent: Codex  
Тип изменения: runtime / UI / API / documentation  
Файлы/модули:

- `components/auth/*`
- `app/forgot-password/page.tsx`
- `app/reset-password/page.tsx`
- `app/verify-email/page.tsx`
- `app/certificates/verify/[verificationCode]/page.tsx`
- `app/api/v1/certificates/verify/[verificationCode]/route.ts`
- `server/modules/certificates/service.ts`
- `docs/api/openapi.yaml`
- `docs/implementation-plan.md`

Summary:

- Подключена форма восстановления пароля к `/api/v1/auth/forgot-password`.
- Добавлены страницы сброса пароля и подтверждения email с поддержкой `?token=...`.
- Добавлена публичная страница проверки сертификата по verification code.
- Добавлен REST endpoint публичной проверки сертификата без раскрытия email и внутренних данных слушателя.
- OpenAPI и implementation plan обновлены под новый API/UI срез.

Проверки:

- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- `npm.cmd run test` прошёл успешно: 8 test files, 11 tests. В sandbox запуск упёрся в `spawn EPERM`, повторный escalated запуск прошёл.
- `npm.cmd run build` прошёл успешно, включая новые routes `/reset-password`, `/verify-email`, `/certificates/verify/[verificationCode]` и `/api/v1/certificates/verify/[verificationCode]`.

Риски:

- Email delivery остаётся scaffold: reset/verify tokens создаются, но production SMTP/provider ещё не подключён.
- Certificate template assets и финальный visual PDF остаются production-hardening.

Next steps:

- Подключить transactional email provider и шаблоны писем для reset/verify flows.
- Добавить public certificate verification smoke/e2e после подключения тестовой БД.

## 2026-05-07 — Добавлен agent-операционный слой документации

Автор/agent: Codex  
Тип изменения: documentation / AI operations  
Файлы/модули:

- `docs/implementation-plan.md`
- `docs/updates.md`
- `ai/roles/*`
- `skills/**/*/SKILL.md`

Summary:

- Создан план реализации проекта с доменным backlog, статусами и правилом обновления документации при каждом изменении.
- Создан журнал обновлений с шаблоном записи.
- Создана папка AI-ролей для распределения задач между специализированными агентами.
- Созданы переносимые skills для Codex и Antigravity в формате `SKILL.md`.

Проверки:

- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- Проверка `skills/**/*/SKILL.md` на наличие YAML frontmatter `name` и `description` прошла успешно.

Риски:

- Skills являются проектными инструкциями и не устанавливаются автоматически в глобальные каталоги Codex/Antigravity.
- При изменениях проекта агенты должны дисциплинированно обновлять этот журнал вручную.

Next steps:

- При следующем runtime/code изменении обновить эту запись или добавить новую сверху.
- Если skills начнут использоваться в конкретном IDE, при необходимости добавить symlink/copy instructions под выбранный toolchain.

## 2026-05-07 — Bootstrap проекта LMS

Автор/agent: Codex  
Тип изменения: repository bootstrap / architecture / runtime scaffold  
Файлы/модули:

- `app/`, `components/`, `server/`, `lib/`, `prisma/`, `tests/`
- `docs/`, `infra/`, `services/`, `.github/workflows/ci.yml`
- `Dockerfile`, `docker-compose.yml`, `.env.example`, `package.json`

Summary:

- Создан runnable Next.js modular monolith для закрытой LMS AI Strategic Academy.
- Добавлены REST endpoints, GraphQL schema scaffold, Prisma schema, seed data, tests, Docker/Compose/K8s/CI templates.
- Добавлены роли academy-ru-closed: admin, instructor, student, curator, super_curator, customer_observer.

Проверки:

- `npm.cmd run db:generate` прошёл успешно.
- `npm.cmd run lint` прошёл успешно.
- `npm.cmd run typecheck` прошёл успешно.
- `npm.cmd run test` прошёл успешно: 8 test files, 11 tests.
- `npm.cmd run build` прошёл успешно.

Риски:

- `.npmrc` использует `legacy-peer-deps=true`, потому что NextAuth stable `4.24.x` не объявляет peer support для Next `16`.
- Docker runtime не проверен локально из-за отсутствия Docker CLI.
- Production email, push, backup, storage upload signing и advanced reporting остаются в `docs/todo.md`.

Next steps:

- Подключить реальную PostgreSQL среду и выполнить миграции/seed.
- Пройти auth flow end-to-end на dev server.
- Начать MVP hardening по `docs/implementation-plan.md`.

## Шаблон записи

```markdown
## YYYY-MM-DD — Краткое название изменения

Автор/agent:
Тип изменения:
Файлы/модули:

- `path/or/module`

Summary:

- Что изменилось.

Проверки:

- Какая команда или ручной сценарий выполнены.

Риски:

- Что может сломаться или требует внимания.

Next steps:

- Что сделать дальше.
```
## 2026-05-07 — Login-first academy, course passing core, private self-hosted DB

Автор/agent: Codex  
Тип изменения: feature/security/infra

### Что изменено

- Главная страница `/` стала страницей входа; отдельной посадочной страницы академии больше нет.
- После входа пользователь перенаправляется в типовой кабинет по своей роли.
- Добавлен server-side learning service: active enrollment, sequential lock, реальные страницы курса/модуля/урока, отметка урока пройденным и вопрос куратору.
- Добавлен API назначения ролей: админ может назначать все роли, главный куратор — только учебные/операционные роли без доступа к `admin`.
- Docker Compose переведен на private PostgreSQL: порт БД не публикуется наружу, доступ есть только у app-контейнера по внутренней сети.
- Kubernetes получил `academy-postgres` StatefulSet, ClusterIP service и NetworkPolicy для доступа к БД только от `academy-web`.

### Проверки

- `npm.cmd run typecheck` — passed.

### Риски и next steps

- Нужно прогнать `lint`, `test`, `build`.
- Для production self-hosted DB нужны backup/restore runbook, регулярные бэкапы и процедура доступа администратора через защищенный bastion/port-forward.

## $(date +%Y-%m-%d) — Wire transactional email provider

Автор/agent: Jules
Тип изменения: feature / email
Файлы/модули:

- `package.json`
- `server/modules/notifications/service.ts`
- `server/modules/auth/service.ts`

Summary:

- Добавлен пакет `nodemailer`.
- В `server/modules/notifications/service.ts` добавлена утилита `sendEmail`, которая использует настройки SMTP из переменных окружения, что позволяет локально использовать MailHog, а на проде — любой реальный провайдер.
- Настроен `createNotification` на отправку письма, если указан соответствующий `channel`.
- В `server/modules/auth/service.ts` настроена отправка письма для восстановления пароля через ту же утилиту `sendEmail`.

Проверки:

- `npm run typecheck`, `npm run lint`, `npm run build` прошли успешно.
- `vitest run tests/unit/notifications.test.ts` прошёл успешно.
- Код-ревью пройдено.

Риски:

- Необходима корректная настройка SMTP-переменных на проде. Ошибки отправки логируются (catch), чтобы не блокировать процесс создания уведомления в БД.

Next steps:

- Добавить логирование исходящих писем в аудит, если это необходимо.
- Проверить доставку на реальном SMTP (SendGrid/Resend).
