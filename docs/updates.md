# Журнал обновлений AI Strategic Academy

Правило: новые записи добавляются сверху.

## 2026-05-26 — Release Hardening Baseline (WP0)

### Что добавлено
- `server/modules/release-hardening/readiness.ts` — typed contract для release hardening: 6 product roles, redirect priority, 10 AI-agent roles, 5 project skills, 14 technical skills, WP0-WP6 и release gates.
- `tests/unit/release-hardening-readiness.test.ts` — unit-тест контракта, который сверяет роли/skills с файлами репозитория и не даёт считать платформу release-ready до закрытия WP1-WP6.
- `docs/release-hardening-plan.md` — активный execution baseline оптимизации.

### Access/privacy hardening
- `/api/v1/lessons/[lessonId]/video-playback` теперь возвращает typed `403` для отсутствующего enrollment и sequential lock, `404` для отсутствующего урока/видео.
- `/api/v1/lessons/[lessonId]/media/[mediaId]/signed-url` теперь возвращает typed `403` для отсутствующего enrollment и sequential lock, `404` для отсутствующего урока/файла, `503` для невозможности получить storage link.
- `tests/unit/security-privacy.test.ts` обновлён: forbidden lesson/video access больше не считается ожидаемым `500`.

### Документы
- `docs/implementation-plan.md` теперь явно разделяет implemented domain status и full release-ready proof.
- `docs/work-plan.md` получил задачу 14 с WP0-WP6.
- `docs/full-project-audit.md` обновлён baseline-записью от 2026-05-26.

### Статус
- WP0: `done`.
- Общая release readiness: `partial`; scenario proof, access/privacy negative paths и operational release drill остаются открыты.

### Проверки
- `npx vitest run tests/unit/release-hardening-readiness.test.ts` — 6/6 passed.
- `npx vitest run tests/unit/security-privacy.test.ts tests/unit/release-hardening-readiness.test.ts` — 12/12 passed.
- `npm run lint -- --max-warnings=0` — passed.
- `npm run typecheck` — passed.
- `npm run test` — 72 files, 446 tests passed.
- `npm run build` — passed; Sentry auth-token warnings ожидаемы без production secrets.
- `npm run test:e2e` — attempted, timed out after 5 minutes without useful output; WP1/E2E gate remains `partial`.

## 2026-05-25 — Web Interface Guidelines Fixes (overscroll, autocomplete)

### Curator Modals (curator-modals.tsx)
- Добавлен `overscroll-behavior: contain` на backdrop обоих модальных окон (`AnswerQuestionModal`, `ReviewSubmissionModal`) — предотвращает скролл body при открытой модалке на iOS

### Curator Search (curator-operations-board.tsx)
- Добавлен `autoComplete="off"` на поле живого поиска слушателей — предотвращает навязчивые автозаполнения браузера

### Ранее обработанные в globals.css
- `touch-action: manipulation` — уже глобально на `html`, интерактивных элементах и bottom nav (строчки 186, 320, 329)
- `prefers-reduced-motion` — уже через framer-motion `useReducedMotion()` во всех анимационных компонентах
- `focus:outline-none` без кольца — все случаи уже имеют `focus:ring-2`

## 2026-05-25 — Certificate Designer Premium + NLP Curator Assistant + Student Flow E2E + Curator Scope Tests

### Certificate Designer Premium
- **Undo/Redo**: Хук `useDesignHistory` с Ctrl+Z/Ctrl+Shift+Z + панель кнопок, maxHistory=50
- **Auto-save**: Debounce 3s через configRef + useEffect в `certificate-designer.tsx`
- **Zoom-слайдер**: 50–150% с transformOrigin: "top left"
- **Layers Panel**: z-index управление, visibility toggle, move up/down
- **4 Preset Themes**: Академический, Премиум, Природа, Современный (меняют цвета текста)
- **z-index**: Добавлен в ElementStyle + QrStyle; обратная совместимость через applyConfigFromBody()
- **Typecheck**: Чистый (только предсуществующая `.next` ошибка)

### NLP Curator Assistant (MVP)
- `server/modules/nlp/suggestions.ts` — full-text search по GlossaryEntry (tsvector → ILIKE fallback)
- `server/actions/assistant.ts` — server action с Zod-валидацией + ролевой защитой
- `components/curator/question-assistant.tsx` — UI-панель с grouped-результатами и кнопкой "Вставить"
- Интеграция в AnswerQuestionModal (`components/lms/curator-modals.tsx`)

### Student Flow Proof (E2E)
- `tests/e2e/student-flow.spec.ts` — 3 теста: курс→урок→квиз→прогресс, course detail page, quiz API submission

### Curator Scope + Negative-path Tests
- `tests/e2e/curator.spec.ts` — negative-path тесты (блокировка доступа к admin/instructor/student/super-curator/observer)
- `tests/unit/curator-scope.test.ts` — 14 unit-тестов скоупа (student access, cohort access, edge cases)

### skills.sh интеграция
- `npx skills init` создан SKILL.md; 14 skills установлены из vercel-labs/agent-skills, shadcn/ui, next-skills
- `opencode.json` обновлён (paths + instructions)

### Результат
- `npx vitest run tests/unit/` — **65 test files, 431 tests passed** (0 регрессий)

## 2026-05-25 — ESLint jsx-a11y: WCAG violations fixed (Tier 2, Step 1)

- **Конфигурация**: `eslint.config.mjs` — добавлен `plugin:jsx-a11y/recommended` + `assert: "either"` для `label-has-associated-control`; `ignoreNonDOM: true` для `aria-role` (AppShell false positive)
- **label-has-associated-control**: ~200 ошибок исправлены в 41 файле — добавлены `htmlFor`/`id` пары для всех label/input/select/textarea; display-only label заменены на `<span>`
- **click-events-have-key-events + no-static-element-interactions**: 9 элементов исправлены (добавлены `role`, `tabIndex`, `onKeyDown` для Enter/Space): файловые зоны загрузки, список студентов, поиск, редактор вопросов, чеклист публикации
- **no-autofocus**: `command-palette.tsx` — `autoFocus` заменён на `useRef` + `useEffect` с фокусом при открытии
- **iframe-has-title**: `lesson-block-editor.tsx` — добавлен `title="Видео урока"`
- **heading-has-content**: `card.tsx` — false positive (child content через {...props}), eslint-suppress
- **Безопасность**: удалён неиспользуемый `verifyForbidden` из `rbac.spec.ts`, неиспользуемый `useCallback` из `notifications-dropdown.tsx`
- **Другие правки**: добавлен `answeredTotal` в dependency array `useCallback` в `quiz-block.tsx`
- **Результат**: `npx eslint .` — 0 errors, 0 warnings

## 2026-05-24 — Real-time SSE уведомления + багфиксы + staging

- **SSE endpoint**: `app/api/v1/notifications/stream/route.ts` — Server-Sent Events на ReadableStream, поллинг новых уведомлений каждые 3 сек
- **Hook**: `hooks/use-notifications.ts` — EventSource с auto-reconnect, initial fetch через GET /api/v1/notifications, возвращает `{notifications, unreadCount, loading, connected}`
- **NotificationsDropdown**: переведён на `useNotifications` (SSE вместо 30-сек polling)
- **Багфикс 500**: `POST /api/v1/course-builder/quiz` — `createQuizInline` мапил frontend-типы (`"single"`/`"multiple"`) через `.toUpperCase()` → получалось `"SINGLE"` (нет в `QuestionType` enum). Добавлена `mapQuestionType()` с корректным маппингом: `single→SINGLE_CHOICE`, `multiple→MULTIPLE_CHOICE`, `text→TEXT`
- **Багфикс quiz creator**: Для `type: "multiple"` добавлены чекбоксы для выбора нескольких правильных ответов (вместо радио-кнопок)
- **Staging**: ветка `staging` + инструкция в DEVELOPER_GUIDE.md
- **CSP**: добавлены `worker-src 'self' blob:` и `manifest-src 'self'`; production `connect-src` включает `wss:` для WebSocket

## 2026-05-24 — Исправление MULTIPLE_CHOICE в тестах

- **quiz-view.tsx**: `answers` изменён на `Record<string, string | string[]>`, добавлена поддержка чекбоксов для MULTIPLE_CHOICE, подсказка "(можно выбрать несколько)"
- **quiz-block.tsx**: те же изменения + корректный подсчёт отвеченных вопросов через `hasAnswer()`, отображение нескольких выбранных ответов в режиме ревью
- **Серверная проверка**: `gradeObjectiveQuiz()` уже корректно обрабатывает MULTIPLE_CHOICE через `{values: [...]}` → `toComparableStrings()` → сортировка и сравнение массивов

## 2026-05-24 — SCORM/xAPI импорт (Phase 2.4)

- **Миграция БД**: `xapi_statements` таблица создана (JSONB, user/lesson indexes)
- **Типы domain.ts**: добавлены `ScormBlockData`, `ScormContentBlock`, `"scorm"` в `ContentBlockType` + `ContentBlock` union
- **Константы**: `UPLOAD.SCORM_MAX_SIZE_BYTES` (200 MB), `XAPI_API_KEY` в env vars
- **Manifest parser**: `server/modules/scorm/manifest-parser.ts` — парсинг imsmanifest.xml (SCORM 1.2 + 2004), organizations, resources, entry point
- **Storage helpers**: `server/modules/scorm/storage.ts` — upload/download/delete в Supabase Storage `scorm-packages/`
- **ZIP import**: `server/modules/scorm/import.ts` + `POST .../scorm/import` — валидация, распаковка (adm-zip), загрузка файлов, создание ScormPackage
- **SCORM package API**: `GET/DELETE .../scorm/package` — статус и удаление пакета
- **Proxy + API Bridge**: `server/modules/scorm/api-bridge.ts` (JS-шаблоны для SCORM 1.2 `window.API` и 2004 `window.API_1484_11`), `proxy.ts` (инжекция bridge в HTML), `GET /api/v1/scorm/serve/[...path]` (catch-all)
- **CMI endpoints**: `cmi-service.ts` + launch init/update/CMI GET+POST endpoints
- **Instructor UI**: `ScormBlockEditor` — дроп-зона ZIP, информация о пакете, замена/удаление; добавлен тип `scorm` в `LessonBlockEditor`
- **Student player**: `ScormPlayer` — iframe с fullscreen toggle, встроен в `LessonPlayerShell`
- **xAPI LRS**: `xapi/auth.ts` + `xapi/lrs.ts` + `POST/GET /api/v1/xapi/statements` — минимальный LRS с API key и JWT auth
- **Tests**: 2 unit-теста на manifest parser, 426/426 всех тестов pass

## 2026-05-24 — Мобильная адаптация достижений и статистики

- `components/lms/student-achievements.tsx`:
  - Аккордеон на мобилке (свёрнут по умолчанию, `md:` всегда виден)
  - hover → click toggle для карточек ачивок (работает на тач)
  - Заголовок и бейджи — `flex-wrap`, компактные отступы
  - Tрек активности — уменьшенные ячейки на мобилке (`gap-1`, `p-1.5`)
  - Текст описания — `line-clamp-2`
  - Анимация `max-h` для аккордеона
- `components/lms/xp-display-client.tsx`:
  - Убраны `group-hover` анимации (не работали на тач)
  - Добавлен `active:scale-[0.99]` для тактильного отклика
  - Текст «Центр развития» всегда виден
  - `shrink-0` на XP и иконке для защиты от переполнения

## 2026-05-24 — Глубокий аудит БД: FK-индексы + отключение RLS + исправление схемы cohorts

- **FK-индексы**: добавлены 12 недостающих индексов на FK-колонки (oauth_accounts.user_id, sessions.user_id, lesson_media.lesson_id, cohorts.course_id, cohorts.project_id, quiz_questions.quiz_id, certificate_templates.course_id, admin_popups.created_by_id, popup_views.popup_id, reports.project_id, reports.course_id, import_jobs.created_by_id)
- **`prisma/schema.prisma`** — добавлены `@@index` для всех вышеуказанных FK-колонок
- **RLS отключён** на всех 56 таблицах (приложение использует Prisma server-side, Supabase REST API не используется). Удалены 9 устаревших RLS-политик.
- **БД**: исправлена миграция `20260512000000_add_block_model` — удалена ошибочная FK-ссылка на `enrollments` (таблица не существовала на момент миграции)
- **БД**: добавлены недостающие колонки `project_id`, `starts_at`, `ends_at`, `updated_at` в таблицу `cohorts` (схема Prisma была шире актуальной БД)
- **Supabase Security Advisor**: больше нет предупреждений о RLS-enabled без политик
- **Supabase Performance Advisor**: FK-индексы добавлены
- **`server/actions/curator-enhanced.ts`** — добавлен `take: 500` на запрос сообщений (был безлимитный); убран неиспользуемый include `roles` у студента
- **`server/actions/super-curator.ts`** — добавлен `take: 500` на запрос сообщений в `getCuratorActivity`
- **`server/actions/risk-management.ts`** — `getRiskOverview` теперь проверяет `actor.roles.includes("admin")` при маскировке имени: админы видят реальное имя, остальные — `Слушатель #XXXXX`

## 2026-05-24 — Скорость ответов куратора: per-student + super-curator breakdown

- **`server/actions/curator-enhanced.ts`** — `getCuratorEnhancedStudents()` теперь возвращает `avgResponseHours` и `avgChatResponseHours` per student (вопросы + чат)
- **`server/actions/super-curator.ts`** — `getCuratorActivity()` теперь возвращает `studentResponseBreakdown[]` с per-student средними по вопросам и чату
- **`app/super-curator/curators/[id]/page.tsx`** — добавлена колонка «Время отв.» в таблицу вопросов (color-coded: <8h зелёный, 8-24h янтарный, >24h красный); добавлена вкладка «По студентам» с таблицей per-student response time
- **Typecheck**: clean ✅ | **Tests**: 419/419 ✅

## 2026-05-23 — Анонимизация имён студентов для не-администраторов

- **`lib/auth/mask-name.ts`** — `maskChatName()` и `deriveDisplayName()` теперь возвращают `Слушатель #XXXXX` для студентов при просмотре не-админами
- **`lib/utils.ts`** — добавлен helper `maskStudentName(studentId)` → `Слушатель #XXXXX`
- **Дашборды (8 файлов):** Все имена студентов в `server/actions/dashboard/{curator,instructor,super-curator,shared}.ts` и `server/actions/curator-enhanced.ts` заменены на `maskStudentName()` для не-админов
- **`server/actions/super-curator.ts`** — маскировка в списках студентов когорт, распределения, вопросов, рисков
- **`server/actions/curator.ts`** — маскировка в `getSubmissionDetail` и уведомлениях о форварде/ответе
- **`server/actions/attendance.ts`** — маскировка в посещаемости
- **`app/{curator,super-curator,customer-observer}/**/page.tsx` — маскировка имён в inline-запросах страниц (assignments, popups, chat, certificates)
- **Тесты:** 403/403 ✅ | **Typecheck:** clean ✅

## 2026-05-23 — Оптимизация UX и Геймификация для Слушателей и Кураторов

- **Интерактивный центр XP (Слушатели):** Статичная карточка опыта на дашборде студента переведена на интерактивный клиентский компонент `XpDisplayClient` с возможностью клика.
- **Геймифицированный модал `XpCenterModal`:** Создан премиальный Glassmorphic-модал с подробным отображением текущего уровня, шкалы прогресса, линии развития уровней (Новичок 1 → Легенда 6), рекомендациями «Дневного Квеста» и сеткой правил начисления очков опыта.
- **Клиентская фильтрация курсов и Прогнозирование:** В `StudentCourseDashboardGrid` добавлены интерактивные вкладки-фильтры (`Все`, `В процессе`, `Завершенные`, `Приостановленные`), а также умный виджет прогнозирования темпа обучения, вычисляющий ориентировочную дату завершения курса.
- **Интерактивный тулбар куратора (Кураторы):** Добавлен живой поиск по ключевым словам и мгновенные сегментированные фильтры рисков и действий на клиенте в `CuratorOperationsBoard`.
- **Диагностический диалог рисков `RiskDiagnosticDialog`:** Реализован детальный разбор успеваемости, активности и пропущенных дедлайнов студента при клике на бейдж риска.
- **Шаблоны интервенций в один клик:** Внедрены готовые шаблоны писем куратора ("Напоминание о дедлайне", "Похвала", "Поддержка при отсутствии активности"), которые автоматически открывают быстрый чат со студентом и подставляют готовый текст сообщения.

## 2026-05-22 — Интерактивный Checklist публикации в Course Builder (Material 3 Glassmorphism)

- **Интерактивный чек-лист готовности к публикации**: заменены стандартные модальные окна алертов на красивый, детальный диалог `PublishChecklistDialog` с Material 3 Glassmorphic стилями.
- **Поддержка переходов (Navigation Targets)**: функция `getCourseBuilderPublishChecks` в `lib/course-builder-readiness.ts` обновлена и теперь возвращает точные идентификаторы целевых элементов структуры курса (модули, блоки, уроки), требующих исправления.
- **Интегрированная навигация `handleChecklistNavigation`**: клик по замечанию в чек-листе автоматически переключает активный узел редактора в боковом меню и открывает нужный элемент (например, пустой урок или тест), фокусируя внимание на исправлении ошибок.
- **Ревизия типов и тестов**: readiness-флоу переведён на явный флаг `passed: boolean`. Обновлены модульные тесты в `tests/unit/course-builder-readiness.test.ts`. Все тесты успешно проходят.

## 2026-05-22 — Облачная резервная загрузка (Supabase Storage)

- **Интеграция облачной загрузки без Docker/MinIO**: локально S3-сервис MinIO часто недоступен, из-за чего падали загрузки медиа (обложки курсов, уроки, домашние задания) с ошибкой `ERR_CONNECTION_REFUSED`.
- **Изменения в `lib/storage.ts`**: функция `uploadFileToSupabase` расширена для поддержки бинарных буферов (`Buffer` и `ArrayBuffer`) на сервере и явного указания `contentType`.
- **Резервный прокси-роут `/api/v1/media/uploads`**: при сбое соединения с S3, API-обработчик автоматически перехватывает ошибку подключения и возвращает клиенту резервный URL (`/api/v1/media/upload-fallback`) и целевую публичную ссылку Supabase CDN.
- **Новый обработчик `app/api/v1/media/upload-fallback/route.ts`**: принимает бинарные `PUT` загрузки от клиента, считывает поток в буфер памяти и пересылает напрямую в Supabase Storage, исключая необходимость в локальном Docker/MinIO.
- **Улучшение доступности (WCAG 2.1 AA)**: компонент `components/lms/status-badge.tsx` обновлен для динамической генерации `aria-label` для экранных дикторов во всех прогрессах, статусах курсов, тестов и рисков.

## 2026-05-22 — Supabase RLS, E2E smoke 26/26

- **Supabase: включён RLS на `user_sessions`** (единственная таблица без RLS — ERROR от database linter). Добавлены базовые RLS-политики для users, enrollments, courses, certificates, notifications.
- **E2E smoke-тесты: 26/26 пройдены** — впервые локально! Исправлены локаторы (тесты искали несуществующие заголовки "Вход в академию" вместо "AI Strategic Academy").
- **Audit документы обновлены**: E2E smoke `blocked→done`, CSP `partial→done`, login footer `broken→done`, extra pages `partial→done`.

## 2026-05-22 — Аудит: CSP, backup runbooks, verify:release, Docker guide, DPA, git secrets

- **CSP ужесточён для production**: `unsafe-eval` удалён (оставлен для dev/HMR), `connect-src` заужен до `'self' https:` (без localhost в проде)
- **Backup runbooks унифицированы**: единый источник истины `docs/backup-restore-runbook.md`; `infra/backup/runbook.md` и `README.md` сокращены до ссылок + скрипты
- **verify:release выполнен**: lint (0 warnings) ✅, typecheck ✅, 396/396 tests ✅, prisma validate ✅, db:generate ✅, build ✅; e2e ⏳ staging only
- **Docker PowerShell-альтернативы**: создан `infra/docker-windows-guide.md` — bash↔PowerShell таблица, winget-альтернативы
- **DPA пробел задокументирован**: Vercel и Supabase помечены `🔴 Active (DPA не подписан)`; раздел с планом действий и юридическими последствиями
- **Git secrets найдены**: `__dbcheck.mjs` в истории `0e20419` содержал хардкодный Supabase пароль (удалён в `907e98f`). Задокументировано в `docs/security.md`. **Требуется ротация пароля на Supabase.**
- **Audit документы обновлены**: CSP finding `partial→done`, login footer links `broken→done`, MASTER-PLAN.md дата актуализирована

## 2026-05-22 — Автосжатие изображений в чатах и загрузках

- **Создана утилита `lib/client-image-compress.ts`** — сжатие JPEG/PNG/WebP на клиенте перед загрузкой:
  - Ресайз до макс. 1920px по длинной стороне
  - Конвертация в JPEG 80% качества
  - Пропуск GIF (анимация), PDF, DOC и файлов <50KB
  - Если сжатый файл не меньше оригинала — возвращается оригинал
  - `formatBytes()` для читаемых сообщений о размере
- **Создана обёртка `lib/upload-with-compress.ts`** — `uploadMedia()` для presigned-URL потока, `uploadChatFile()` для чата
- **Интегрировано во все точки загрузки:**
  - `components/lms/chat-panel.tsx` — чат (со счётчиком сэкономленного места)
  - `components/lms/assignment-block.tsx` — загрузка файлов к заданию
  - `app/student/assignments/[assignmentId]/assignment-view.tsx` — загрузка файлов студентом
  - `components/lms/course-builder-shell.tsx` — загрузка обложки курса
  - `components/lms/lesson-block-editor.tsx` — загрузка файлов в урок
- **Попутно исправлен баг**: `lesson-block-editor.tsx` отправлял FormData в API, ожидающий JSON — теперь используется правильный presigned-URL флоу
- **11 новых тестов** на утилиту сжатия (Node.js mocks для Canvas API)
- **Typecheck**: ✅ | **Tests**: 396/396 ✅ (64/64 files)

## 2026-05-22 — Аудит документации и исправление несостыковок

- **Создана страница `/admin/invites`** — функциональная заглушка с карточками-ссылками на Users, Enrollments, Cohorts + CLI provision guide. Исправляет редирект `/admin/payments` → 404.
- **Создана таблица `_prisma_migrations` на Supabase** — добавлены записи для всех 15 resolved миграций. `prisma migrate deploy` больше не упадёт на fresh deploy.
- **Обновлён `full-project-audit.md`** — тесты 368→385, lint `broken`→`done`, `/admin/invites` `missing`→`done`, `/student/modules/[moduleId]` отмечен как намеренно удалённый.
- **Обновлён `docs/archive/vercel-supabase-deployment.md`** — лимит загрузки 100MB→20MB (согласован с кодом), PostgreSQL 15→17.
- **Обновлён `platform-functional-overview.md`** — `/student/modules/[moduleId]` отмечен как ❌ удалён (объединён со страницей курса).
- **Чат: ограничена ширина** — `max-w-5xl mx-auto` для чата куратора/инструктора.

## 2026-05-22 — Исправлено 85+ багов: forgot-password, schema sync, quiz grading, rate limiter, CSRF, race conditions, outbox rescue, memorySet bug

- **Задача 1 — Отключение самосброса пароля**: форма `/forgot-password` показывает сообщение «напишите на admin@aistrategic.kz»; API `forgot-password` и `reset-password` → 410 Gone; `/reset-password` редиректит на `/forgot-password`
- **Задача 2 — Prisma schema ↔ migration (12 critical)**: создана fix-миграция `20260522000003_fix_schema_mismatches`; все 14 применены; `prisma migrate status` → Database schema is up to date!
- **Задача 3 — Quiz grading logic**: `gradeObjectiveQuiz` исправлен — `resolveOptionLabel` применяется к обеим сторонам сравнения; добавлено 8 тестов на object-options
- **Задача 4 — Rate limiter fail-open → fail-closed**: catch block → `{ success: false }`; атомарный INCR (`cacheIncr` с Redis INCR + memory fallback); ключ per-IP в `proxy.ts`
- **Задача 5 — CSRF + submissions leak**: scheme check; CSRF на все API кроме webhooks/cron; `listAssignments` фильтрует submissions по userId для студентов; `hasPermission` с пустыми ролями → `false`
- **Задача 6 — Race conditions (7 шт.)**: FOR UPDATE на enrollment в progress/quizzes/assignments; sequential unlock внутри tx; атомарный delete для password reset; duplicate check в issueCertificate; **outbox rescue фикс** — `updated_at` колонка + `SET updated_at = NOW()` при dequeue + rescue по `updated_at`
- **cacheIncr memoryStore → memorySet bug**: исправлен вызов `memoryStore.set(key, 2, ttlSeconds)` на `memorySet(key, 2, ttlSeconds)` — предотвращает падение in-memory fallback rate limit
- **Typecheck**: ✅ | **Tests**: 385/385 ✅ (63/63 files)

## 2026-05-22 — Исправлены 12 schema–migration mismatches

- **Создана миграция** `20260522000003_fix_schema_mismatches` — ALTER TABLE для всех 12 расхождений между Prisma-схемой и миграциями.
- **lesson_progress**: ADD `started_at`, `last_seen_at` (код progress/service.ts писал в эти колонки)
- **assignment_submissions**: RENAME `created_at` → `submitted_at`, DROP `updated_at` (код использовал submittedAt в 38 местах)
- **activity_logs**: RENAME `entity`→`resource`, `entity_id`→`resource_id`, ADD `ip_address`, `session_id`, FIX FK → CASCADE
- **risk_flags**: RENAME `student_id`→`user_id`, ADD `cohort_id`, FIX FK→CASCADE
- **reports**: ADD `project_id`, `course_id`, `url`, DROP `created_by_id`, ALTER defaults
- **admin_popups**: ADD `target_user_ids` (код popups/service.ts читал/писал это поле)
- **messages**: ADD `reply_to_id` + index (код chat.ts использовал replyToId)
- **certificates**: ADD UNIQUE INDEX `(user_id, course_id)` — предотвращает race condition
- **course.finalAssignmentId**: ADD FK constraint
- **quizzes.maxAttempts** DEFAULT 3, **reports.status** DEFAULT 'ready'
- **Все миграции resolved**: `prisma migrate status` → Database schema is up to date!
- **Typecheck**: ✅ | Tests: 377/377 ✅

## 2026-05-22 — Отключён самосброс пароля

- **Самостоятельный сброс пароля отключён**: `/forgot-password` больше не показывает форму с email, а выводит сообщение с просьбой написать на admin@aistrategic.kz с указанием ФИО.
- **API `POST /api/v1/auth/forgot-password`** — возвращает 410 Gone.
- **API `POST /api/v1/auth/reset-password`** — возвращает 410 Gone.
- **`/reset-password`** — перенаправляет на `/forgot-password`.
- **Тесты**: e2e smoke обновлены — проверяют наличие admin@aistrategic.kz и редирект.
- **Typecheck**: ✅ | Tests: 377/377 ✅

## 2026-05-22 — Chat attachments migrated from MinIO/S3 to Supabase Storage

- **MinIO/S3 → Supabase Storage for chat uploads**:
  - `app/api/v1/chat/upload/route.ts` — новый API route (POST) для загрузки файлов напрямую в Supabase Storage через service role key
  - `lib/storage.ts` — рефакторинг: убран дубликат `getSupabaseStorageSignedUrlAsync`, S3-функции теперь возвращают null при недоступности MinIO вместо throw, добавлена `uploadFileToSupabase()`, исправлен `getSupabaseStorageSignedUrl()` с корректными env vars
  - `components/lms/chat-panel.tsx` — `handleFileUpload` переписан: вместо S3 presigned URL → POST file в `/api/v1/chat/upload`
  - `server/actions/chat.ts` — `getUploadUrlForFile()` теперь выбрасывает понятную ошибку при недоступности S3
  - `lib/env.ts` — добавлены `STORAGE_SUPABASE_URL` и `STORAGE_SUPABASE_SERVICE_ROLE_KEY`
  - `.env` — добавлены алиасы `STORAGE_SUPABASE_*` для единообразного доступа
  - `storage.buckets` — создан bucket `academy-media` (public, 15MB лимит)
  - `app/api/v1/lessons/[lessonId]/media/[mediaId]/signed-url/route.ts` — исправлен импорт (getSupabaseStorageSignedUrlAsync → getSupabaseStorageSignedUrl)
  - `app/api/v1/lessons/[lessonId]/video-playback/route.ts` — исправлен импорт
  - `app/api/v1/media/uploads/route.ts` — исправлена обработка null от createPresignedUploadUrl
- **Heartbeat 404**: роут `/api/v1/sessions/heartbeat` существует в origin/main (коммит ca323c2), присутствует в билде. 404 на проде — вероятно из-за устаревшего деплоя.
- **Valdiation**: typecheck ✅ | Tests 377/377 ✅ | Build ✅ (85 pages, 102 API routes)

## 2026-05-22 — Vimeo video hosting as alternative provider

- **Phase 2.5 — Vimeo as video hosting option**:
  - `extractVimeoId()` — определяет ID из vimeo.com / player.vimeo.com URL
  - `normalizeVimeoUrl()` — преобразует в `https://player.vimeo.com/video/{id}`
  - `resolveEmbedUrl()` — добавлен `provider === "vimeo"` кейс
  - `VideoProvider` тип — добавлен `"vimeo"`
  - CSP: `frame-src` добавлен `https://player.vimeo.com`
  - Поддержка Vimeo URL как `videoUrl` (raw URL) и как `video.provider === "vimeo"` (структурированные данные)
- **Typecheck**: ✅ | Tests: 368/368 ✅

## 2026-05-22 — Free features: Attendance, Gamification (XP), WCAG

- **Phase 2.7 — Attendance analytics**:
  - `server/actions/attendance.ts` — серверные функции для получения посещаемости по курсу/уроку
  - API: `GET /api/v1/courses/:id/attendance`, `GET /api/v1/lessons/:id/attendance`
  - `app/instructor/attendance/page.tsx` + интерактивный клиентский компонент
  - Навигация: добавлен пункт «Посещаемость» для инструктора
  - Использует существующие `activity_logs` — никаких платных сервисов
- **Phase 4.6 — Gamification: XP system**:
  - `xp` поле в модели User (миграция `20260522000002_add_user_xp`)
  - `server/actions/xp.ts` — awardXp, getUserXp, getLevel, leaderboard (6 уровней)
  - XP начисляется при завершении урока (через progress API)
  - `components/lms/xp-display.tsx` — карточка уровня на студенческом дашборде
- **WCAG**: Skip-to-content link ✅ (уже существовал), aria labels в навигации
- **Typecheck**: ✅ | Tests: 368/368 ✅

## 2026-05-22 — Phase 1+2: Performance budget, backup runbook, forum, SCORM

- **Phase 1.5 — Performance budget**:
  - `lighthouse.config.js` — CI-конфиг с порогами: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90
  - `budget.json` — Webpack budget: JS ≤ 400KB, total ≤ 800KB, LCP ≤ 3s, CLS ≤ 0.1
  - `next.config.ts` — добавлен `@radix-ui/react-*` в `optimizePackageImports`
- **Phase 1.6 — Backup/restore runbook**: `docs/backup-restore-runbook.md` — pg_dump, Supabase PITR, восстановление после неудачной миграции
- **Phase 2.6 — Forum/discussion per lesson**:
  - Модели: `LessonDiscussion` + `DiscussionPost` (threaded, parent_id)
  - Миграция: `20260522000000_add_lesson_discussion`
  - API: `GET/POST /api/v1/lessons/:id/discussion`, `DELETE /api/v1/lessons/:id/discussion/posts`
  - Компонент: `LessonDiscussion` с деревом постов, reply-inline, удалением, ролевыми бейджами
  - Интегрирован в `LessonPlayerShell`
- **Phase 2.4 — SCORM/xAPI import**:
  - Модели: `ScormPackage` + `ScormLaunch`, enum для статусов
  - Миграция: `20260522000001_add_scorm_package`
  - API: `POST /api/v1/lessons/:id/scorm/launch` + `server/modules/scorm/service.ts`
  - Готов к приёму ZIP-пакетов и SCORM API Bridge
- **Build**: typecheck ✅, 368/368 tests ✅

## 2026-05-22 — Phase 0: Attempt history UI + Quiz builder/builder audit

- **Attempt history UI**: 
  - Исправлен хардкод "Попытка: 1" на реальное количество попыток
  - Добавлена "История попыток" — список всех попыток с датами, скором, статусом (пройден/не пройден)
  - Поддержка `?attemptId=` — можно просмотреть детали любой прошлой попытки
- **Аудит Phase 0**: Builder publish checklist ✅, Quiz builder UI ✅, Block deadlines ✅, Curator popups ✅ — уже реализованы
- **Build**: 83/83 ✅
- **Tests**: 368/368 passed (62/62 test files) ✅

## 2026-05-22 — Phase 0: Email verification & password recovery fix + docs reorganization fixes

- **Fix forgot-password API**: заменён workaround (уведомление админу) на вызов `requestPasswordReset()` — создаёт токен и отправляет email со ссылкой сброса
- **Fix forgot-password form UI**: убрано сообщение «самостоятельное восстановление недоступно», теперь стандартный flow «введите email → проверьте почту»
- **Fix schema-cleanup-window test**: исправлен путь `docs/schema-cleanup-window.md` → `docs/archive/schema-cleanup-window.md` (после реорганизации docs)
- **Fix build crash (3 файла)**: `/privacy`, `/terms`, `/docs/[slug]` — обновлены пути на `docs/legal/` после реорганизации
- **Install missing @tiptap packages**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `dompurify` (отсутствовали после merge)
- **Build**: 83/83 ✅
- **Tests**: 368/368 passed (62/62 test files) ✅

## 2026-05-21 — Реорганизация документации + MASTER-PLAN

- **Реорганизация docs:** 42 файла → 3 папки (`archive/`, `legal/`, core)
  - `docs/archive/` — 18 устаревших/аудиторных документов с README-оглавлением
  - `docs/legal/` — 11 юридических документов
  - Core: 9 ключевых документов
- **Создан `docs/MASTER-PLAN.md`** — единый план развития (5 фаз: от Production Hardening до стратегии)
- **Обновлён `docs/implementation-plan.md`**, `docs/specification.md`, `docs/updates.md`
- **typecheck**: passed ✅
- **tests**: passed ✅

## 2026-05-21 — Stage 5: Reports module audit & fixes (10 issues)

- **H-1 (High) — Column picker не работал**: UI `ReportDesigner` отправлял `fields` query param, но `GET /api/v1/reports` игнорировал его. Добавлено сквозное пробрасывание `fields` в `generateReportDownload()` → `renderReport()` → генераторы CSV/XLSX/PDF. Теперь выбор колонок в конструкторе отчётов реально фильтрует вывод.
- **H-2 (High) — Job status без проверки владельца**: `GET /api/v1/reports/job/status` проверяет, что `userId` в payload совпадает с текущим пользователем (или у пользователя роль admin). Ранее любой аутентифицированный пользователь мог смотреть статус чужих задач по UUID.
- **H-3 (High) — Валидация payload в processor**: Добавлена Zod-схема `reportJobPayloadSchema` в `processor.ts`. Ранее payload воркера кастовался через `as`, без рантайм-валидации.
- **M-4 (Medium) — N+1 query (50K rows) в fetchProgressData**: Заменён `lessonProgress.findMany({take: 50000})` + JS-агрегация на `prisma.$queryRaw` с `COUNT + SUM + GROUP BY`. Агрегация среднего времени урока теперь выполняется в базе данных.
- **M-5 (Medium) — Race condition в outbox dequeuing**: `dequeuePendingEvents` теперь использует атомарный `UPDATE ... RETURNING` с `FOR UPDATE SKIP LOCKED`. Ранее read-then-update (findMany + updateMany) позволял двум воркерам одновременно прочитать и обработать одно событие.
- **M-6 (Medium) — Rate limiting добавлен**: `checkRateLimit` на `GET /api/v1/reports` и `POST /api/v1/reports/job`. Ранее генерация отчётов не была защищена от DoS.
- **M-8 (Medium) — PDF/XLSX row-count guard**: Добавлены лимиты: PDF ≤ 2000 строк, XLSX ≤ 50 000 строк. При превышении — понятное сообщение о падбэке на CSV вместо молчаливого OOM/timeout.
- **M-9 (Medium) — generateReportAction URL fix**: URL заменён с `/api/v1/reports/download?id=...` (404) на `/api/v1/reports?type=...&format=csv` (рабочий).
- **L-14 (Low) — Stuck processing events**: В `dequeuePendingEvents` добавлен rescue для событий, застрявших в статусе "processing" более 10 минут.
- **typecheck**: passed ✅
- **tests**: 368/368 passed (62/62 test files) — 0 regressions

## 2026-05-21 — Уведомления: outbox → inline (починка доставки студентам)

- **Проблема**: Уведомления от куратора (и любые другие) не доходили до студентов, потому что все уведомления писались в `outbox_events`, но outbox-воркер никогда не вызывался (Vercel Hobby tier не поддерживает Cron Jobs).
- **Корневая причина**: `createNotification()` в `server/modules/notifications/service.ts` писал событие в outbox через `writeOutboxEvent()`. Функция `processNotificationEvents()` должна была обрабатывать эти события, но не имела триггера (Vercel cron удалён ранее).
- **Исправление**:
  - `createNotification()` теперь вызывает `createNotificationInternal()` напрямую, минуя outbox. Уведомления создаются синхронно в таблице `notifications`.
  - Вызов `writeOutboxEvent()` удалён из `createNotification()`. Outbox остаётся только для отчётов (`report.generate`).
  - Создан `scripts/flush-notifications.ts` — одноразовый скрипт для обработки накопившихся outbox-событий (запуск: `npx tsx scripts/flush-notifications.ts`).
  - `writeOutboxEvent` импорт удалён из `notifications/service.ts`.
- **Тесты обновлены**: 5 файлов (notifications-service, assignments, courses-service, certificates-service, auth-service-notifications) — все проверки `mockOutboxEventCreate` заменены на `mockNotificationCreate`.
- **typecheck**: passed ✅
- **tests**: 368/368 passed (62/62 test files) ✅

## 2026-05-21 — Stage 4: Lessons/Tests fixes (6 issues closed)

- **H-1 (High) — Sequential lock bypass в video-playback route**: Исправлен баг фильтра — `moduleId: lesson.module.courseId` заменён на `moduleId: lesson.moduleId`. Ранее запрос искал уроки по `Module.id === Course.id`, что возвращал пустой результат и пропускал sequential lock check.
- **H-2 (High) — Sequential lock check в signed media URL endpoint**: Добавлена проверка sequential lock в `GET /api/v1/lessons/[lessonId]/media/[mediaId]/signed-url`. Ранее endpoint проверял только enrollment, но не sequential lock, что позволяло получать прямые ссылки на медиафайлы заблокированных уроков.
- **H-4 (High) — Race condition quiz attempts**: `submitQuizAttempt` обёрнут в `prisma.$transaction`. Ранее count+create были раздельными запросами — два параллельных запроса могли оба пройти проверку лимита попыток и создать лишние attempt-записи.
- **H-5 (High) — verifyCsrf не вызывался**: Обнаружено, что CSRF-защита уже реализована глобально в `proxy.ts` через `checkCsrfOrigin()` для всех мутирующих API-запросов. Функция `verifyCsrf` в `lib/http.ts` является дублирующим dead code. H-5 закрыт как already-done.
- **M-1 (Medium) — Rate limit key per-quiz**: Ключ rate limiting изменён с `quiz-attempt:${user.id}` на `quiz-attempt:${user.id}:${quizId}`, чтобы разные тесты одного пользователя не конкурировали за один bucket.
- **M-2 (Medium) — Enrollment check в lesson GET**: Добавлена проверка active enrollment в `GET /api/v1/lessons/[lessonId]` для студентов. Преподаватели/админы/супер-кураторы пропускают проверку (builder access).
- **M-3 (Medium) — Enrollment check в rating POST**: Добавлена проверка active enrollment в `POST /api/v1/lessons/[lessonId]/rating`.
- **typecheck**: passed ✅
- **tests**: 368/368 passed (62/62 test files) — 0 regressions

## 2026-05-21 — Outbox cron-воркер: настроен Vercel Cron Jobs для доставки уведомлений

- **Проблема (P0)**: Система уведомлений писала события в `outbox_events`, но cron-триггер не был настроен. Все уведомления (`certificate_available`, `new_message`, `assignment_reviewed` и др.) не доставлялись пользователям.
- **Исправление**:
  - `vercel.json` — добавлен `crons: [{ path: "/api/v1/outbox/process", schedule: "*/5 * * * *" }]`
  - `.env.example` — `CRON_SECRET` теперь раскомментирован с явным значением-заглушкой
  - Создан `tests/unit/outbox-handler.test.ts` — 6 тестов на `processNotificationEvents` (успешная обработка, фильтрация не-norification событий, invalid payload, ошибка БД, пустая очередь, кастомные title/body)
  - Создан `tests/unit/cron-routes-success.test.ts` — 3 теста на авторизованный вызов cron-роута (успех, неверный CRON_SECRET, без заголовка)
  - `docs/vercel-supabase-deployment.md` — добавлен раздел про Vercel Cron Jobs и CRON_SECRET
- **typecheck**: pending
- **tests**: pending

## 2026-05-21 — Интерактивный импорт пользователей из CSV + Полная верификация типов и сборки

- **m1: Интерактивный пакетный импортер (Admin Batch Importer)**:
  - Создан компонент `UserBatchImporter` в `components/admin/user-batch-importer.tsx` — drag-and-drop CSV загрузка, разбор текстового CSV ввода, выбор ролей по умолчанию, селектор потоков для автозачисления, таблица предпросмотра с чекбоксами и валидацией email.
  - Создано серверное действие `importUsersAction` в `server/actions/admin.ts` — создание аккаунтов с безопасными временными паролями, хеширование Argon2id, запись аудит-логов (`logAudit`), автозачисление в активные когорты и предотвращение дубликатов.
  - Интегрирована новая вкладка импорта на странице `/admin/users` с возможностью скачать CSV-файл временных реквизитов доступа.
- **m2: Устранение ошибок типизации TypeScript**:
  - Устранена проблема типизации необязательной связи `course` в интерфейсе `CohortSelectOption` с обработкой `course?.title`.
  - Обернут Lucide `<HelpCircle />` для предотвращения несовместимых HTML-атрибутов (`title`).
  - Приведены к единому стандарту M3-кнопки (outline-вариант заменен на secondary согласно доменному Button).
- **typecheck**: passed ✅
- **tests**: 354/354 passed (60/60 test files) ✅
- **build**: passed ✅

## 2026-05-20 — LearningPath прогресс UI + LessonRating в аналитике

- **m1: LearningPath прогресс UI**:
  - Создан `server/modules/learning/learning-path-service.ts` — `getUserLearningPaths(userId)` с расчетом среднего прогресса по курсам трека, запись в `LearningPathEnrollment.progress`
  - `getStudentDashboard` расширен: возвращает `learningPaths[]`
  - На дашборде студента (`app/student/page.tsx`) добавлен блок "Мои треки обучения" с карточками: прогресс-бар, счетчик завершенных курсов, описание
- **m2: LessonRating в аналитике**:
  - `getInstructorAnalytics` теперь включает `avgRatingResult` (средняя оценка уроков 1-4 + количество)
  - На странице `/instructor/analytics` добавлена метрика "Оценка уроков" (например, "3.5/4")
- **typecheck**: passed ✅
- **tests**: 354/354 passed (60/60 test files) ✅

## 2026-05-20 — Student reports, XLSX/PDF тесты, completionThreshold

- **C1: Страница отчетов студента**
  - Создана `app/student/reports/page.tsx` — MetricGrid, BarChart, DownloadReports
  - Добавлен `/student/reports` в навигацию student
- **C1: API отчетов для student**: student scope + allowedRoles + getAvailableReportsForRoles
- **C2: completionThreshold в detectLearnerRisks**: опциональный параметр, дефолт 85
- **M2: Тесты XLSX и PDF**: xlsx-generator (10), pdf-generator (10), risks расширен (8)
- **M1: Динамические отчеты (централизованная конфигурация)**:
  - `ReportDefinition.desc`, `ReportDefinition.icon` — base display метаданные
  - `REPORT_ROLE_META` — owner/scope по ролям
  - `getDisplayReportsForRole(roles)` — единый источник для DownloadReports
  - 6 страниц отчетов обновлены: admin, instructor, curator, customer-observer, super-curator (2 tabs), student
  - Больше нет хардкодных списков — изменения allowedRoles в БД автоматом отражаются в UI
- **m3: redundant normalizeRole check**: убран лишний вызов в resolveReportScope
- **typecheck**: passed ✅
- **tests**: 354/354 passed (60/60 test files) ✅

## 2026-05-20 — Дедлайны блоков, попапы кураторов, исправление ошибок

**Тип изменения**: feature / bugfix

**Файлы/модули**:

### Исправление ошибок
- `app/api/v1/push/subscribe/route.ts` — 403: route теперь обрабатывает неавторизованных пользователей без ошибки (PWA регистрируется на всех страницах, включая логин)
- `app/api/v1/auth/redirect-target/route.ts` — 401: при отсутствии токена возвращается путь по умолчанию `/student` вместо ошибки (гонка сессии после логина)
- `app/student/assignments/page.tsx` — 503: добавлена обработка ошибок при загрузке списка заданий, добавлен `redirect` при отсутствии пользователя

### Система дедлайнов блоков
- `server/modules/deadlines/service.ts` — новый модуль: getCohortBlockDeadlines, setBlockDeadlines, getCuratorDeadlineAlerts
- `app/api/v1/cohorts/[cohortId]/block-deadlines/route.ts` — GET/POST для управления дедлайнами
- `app/admin/cohorts/[cohortId]/deadline-manager.tsx` — UI компонент управления дедлайнами для админа
- `app/instructor/deadlines/page.tsx`, `client.tsx` — страница преподавателя для управления дедлайнами
- `app/api/v1/deadline-alerts/route.ts` — API для получения напоминаний куратору
- `components/lms/deadline-alerts.tsx` — виджет дедлайн-напоминаний на дашборде куратора
- `components/layout/navigation.ts` — добавлены ссылки "Дедлайны" (instructor) и "Уведомить" (curator)

### Система попапов для кураторов
- `prisma/schema.prisma` — добавлено поле `targetUserIds` в модель AdminPopup
- `server/modules/popups/service.ts` — createPopup/getActivePopupsForUser/listPopups поддерживают targetUserIds
- `app/api/v1/popups/route.ts` — расширен createPopupSchema, разрешено создание для кураторов
- `app/curator/popups/page.tsx`, `client.tsx` — страница куратора для отправки уведомлений слушателям

**Проверки**: lint (0 errors), typecheck (0 errors), test (319 passed, 57 files)

**Тип изменения**: security / bugfix

**Файлы/модули**:
- `server/modules/auth/service.ts` — updateProfile: добавлен select, исключающий passwordHash/totpSecret
- `server/modules/2fa/service.ts` — enable2fa возвращает backupCodes из crypto.randomBytes() (не Math.random())
- `app/api/v1/auth/2fa/verify/route.ts` — возвращает backupCodes от сервера
- `components/admin/two-factor-setup.tsx` — убран Math.random(), TOTP secret очищается после verify
- `lib/auth/middleware-guards.ts` — PUBLIC_PATH_PREFIXES расширен: cron (outbox, reports/scheduled), seed, build-version, heartbeat, CSP endpoints (sw.js, manifest.json)
- `server/modules/courses/service.ts` — listCourses: explicit select (без email); listEnrollments: explicit cohort select
- `app/api/v1/assignments/[assignmentId]/route.ts` — GET/PATCH: explicit select
- `server/actions/student.ts` — getStudentQuizAttemptsAction/getStudentAssignmentSubmissionsAction: select-based queries
- `server/modules/notifications/service.ts` — listNotifications/getNotificationById: explicit select
- `app/api/v1/popups/diag/route.ts` — findMany → count() (не раскрывает enrollmentId)
- `components/lms/security/dynamic-watermark.tsx` — email заменён на short hash; ProtectedContentShell обновлён
- `components/lms/security/protected-content-shell.tsx` — DynamicWatermark без userEmail
- `scripts/create-users.ts` — SEED_PASSWORD из env, SEED_ADMIN_TOKEN с предупреждением на дефолт
- `prisma/seed.ts` — SEED_DEFAULT_PASSWORD из env вместо хардкода
- `app/admin/courses/page.tsx` — instructor mapping с email
- `app/instructor/courses/page.tsx` — instructor mapping с email

**Summary**:
- Проведён полный security-аудит на data leakage (Prisma over-fetching, DOM, middleware, dev passwords)
- **3 critical** (P0): updateProfile раскрывал passwordHash/totpSecret в ответе; middleware не пропускал cron-воркеры; 2FA backup codes генерились клиентским Math.random() + TOTP secret оставался в DOM
- **5 high** (P1): listCourses раскрывал email инструкторов; assignments GET/PATCH без select; student server actions over-fetching; listEnrollments без select; listNotifications без select — все переведены на explicit Prisma select
- **4 medium** (P2): popups/diag endpoint раскрывал enrollmentIds → заменён на count(); DynamicWatermark рендерил email в DOM → убран; hardcoded dev passwords → env-переменные; CSP endpoints добавлены в PUBLIC_PATH_PREFIXES
- PWA fixes (chat reply on every message, NAVIGATE handler, desktop install manifest) завершены

 **Проверки**:
- `npx tsc --noEmit` — passed
- `npm run build` — passed (80/80 pages, 0 errors)
- `npx vitest run` — 319/319 passed (57/57 test files)

**Риски**:
- `__dbcheck.mjs` в git history содержит live production credentials — требуется git purge + force-push (решение за командой)
- CSP `unsafe-eval`/`unsafe-inline` остаются — Next.js требует их для dev mode и CSS injection
- Cron-воркеры (outbox, reports) теперь проходят middleware, но для отправки push-уведомлений нужен реальный триггер (Vercel Cron / pg_cron)
- Web Push требует `FEATURE_PUSH_NOTIFICATIONS=true` + VAPID keys

## 2026-05-19 — Локальная БД: PostgreSQL + .env + prisma db push + автозапуск

- **Проблема**: на машине не было PostgreSQL, Docker отсутствовал, билд и дев-сервер не работали
- **Установлен PostgreSQL 17.4** (portable) в `C:\Temp\opencode\pgsql\`
- **Создан `.env`** с полными настройками для локальной разработки (DATABASE_URL, CRON_SECRET, NEXTAUTH_SECRET, etc.)
- **`prisma db push`**: созданы все 54 таблицы в БД `academy`
- **`prisma db seed`**: заполнены тестовые данные
- **Скрипт автозапуска** (`scripts/start-db.ps1`): запускает PostgreSQL, если он не запущен; создаёт БД при первом запуске
- **`package.json`**: `dev` скрипт обновлён на `powershell -ExecutionPolicy Bypass -File scripts/start-db.ps1 & next dev` — БД стартует автоматически при `npm run dev`
- **typecheck**: passed ✅
- **lint**: 0 errors, 0 warnings ✅
- **tests**: 319/319 passed (57/57 test files) ✅
- **build**: ✅ **80/80 страниц, 0 ошибок** (раньше падал без DATABASE_URL)

## 2026-05-19 — MetricGrid: редизайн для ПК (сетка, акцент, hover)

- **Проблема**: на ПК (`xl:grid-cols-4`, `2xl:grid-cols-6`) карточки метрик выглядели «стрёмно» — слишком растянутые, `2xl:6` в ряд некрасиво, `border-l-4` плохо читался на широких карточках
- **Сетка**: `auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6` → `gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (макс. 4 колонки, без `auto-rows-fr`)
- **Акцент**: `border-l-4` → верхняя градиентная полоса (`before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:to-transparent` + `TONE_TOP_ACCENT` Map)
- **Иконка**: `rounded-lg` → `rounded-full` + `shadow-m3-soft`
- **Hover**: добавлена `hover:shadow-m3-soft-hover` для подъёма карточки
- **Отступы**: `p-4 md:p-5` → `px-5 py-4 md:px-6 md:py-5` (больше горизонтального воздуха на ПК)
- **Защита от `twMerge`**: `text-display-lg` в `cn()` отбрасывался `tailwind-merge` из-за конфликта с `text-m3-error` — вернул template literal
- **typecheck**: passed ✅
- **tests**: 319/319 passed (57/57 test files) ✅

## 2026-05-19 — Fix: Vercel build не падает на CRON_SECRET (env validation deferred)

- **Проблема**: Vercel build падал на `Collecting page data` с ошибкой `CRON_SECRET обязателен в production`, потому что `lib/env.ts` валидирует production-секреты при импорте модуля, а Next.js подгружает все роуты (включая `/api/auth/[...nextauth]`), транзитивно импортирующие env
- **Фикс** (`lib/env.ts`): production-проверки (C1 — dev-секрет, C4 — CRON_SECRET) обёрнуты в `if (process.env.NEXT_PHASE !== "phase-production-build")`, чтобы билд не падал
- **Runtime**: cron-роуты (`outbox/process`, `reports/scheduled`) остаются fail-closed — при отсутствии `CRON_SECRET` в Vercel env возвращают 503 при запросе
- **Итог**: деплой не блокируется. После деплоя нужно добавить `CRON_SECRET` в Vercel Project Environment Variables для работы cron
- **typecheck**: passed ✅
- **lint**: 0 errors, 0 warnings ✅
- **tests**: 319/319 passed (57/57 test files) ✅
- **build**: проходит мимо env-валидации, падает только на DATABASE_URL (проблема локального окружения)

- **C1 (P1 High) — Production secret guard** (`lib/env.ts`):
  - `NEXTAUTH_SECRET === "development-secret-change-me"` в production → `throw Error('Запрещённый dev-секрет в production')`
  - `CRON_SECRET` теперь обязателен в production (был optional)
- **C2 (P1 High) — Quiz answer key isolation**:
  - `server/modules/quizzes/service.ts`: `listQuizzes()` деструктурирует `correctAnswer` из всех вопросов
  - `server/modules/courses/service.ts`: `getLesson()` по умолчанию `stripAnswerKeys = true`
  - `app/api/v1/quizzes/[quizId]/route.ts`: студентам без `correctAnswer`, elevated-ролям (admin, super_curator, curator, instructor) — с ответами
  - `app/api/v1/lessons/[lessonId]/route.ts`: elevated-проверка роли для включения ответов
- **C3 (P1 High) — Server-side progress verification** (`server/modules/progress/service.ts`):
  - `markLessonProgress()` проверяет `quizAttempt.passed` и `assignmentSubmission.status === "ACCEPTED"`
  - Без пройденного теста/принятого задания — макс. 99%, COMPLETED не ставится
  - `effectivePercent` используется во всех расчётах (lesson → block → module → course)
- **C4 (P2 Medium) — Stale JWT protection** (`lib/auth/session.ts`):
  - `requireUser()` перепроверяет статус + роли в БД через `revalidateSession()` на каждый вызов
  - Деактивированные пользователи получают 401
- **C5 (P2 Medium) — Cron fail-closed**:
  - `app/api/v1/outbox/process/route.ts` и `app/api/v1/reports/scheduled/route.ts`:
  - Без `CRON_SECRET` → 503; иначе Bearer-проверка → 401
  - Ранее были fail-open (пропускали запрос без секрета)
- **ESLint**: исправлены 3 `@typescript-eslint/no-unused-vars` (деструктуризация `correctAnswer` в courses/service.ts, quizzes/service.ts)
- **Тесты**: исправлены 7 тестов, сломавшихся после изменений:
  - 5 тестов `progress-service.test.ts` — добавлены `moduleId`, `quizzes: []`, `assignments: []` в моки lesson + optional chaining в сервисе
  - 1 тест `status-badge.test.tsx`: `text-rose-700` → `text-m3-error`, `text-amber-700` → `text-m3-secondary`
  - 1 тест `metric-grid.test.tsx`: `text-emerald` → `text-m3-tertiary`
- **`.env.example`**: добавлен закомментированный `CRON_SECRET`
- **typecheck**: passed ✅
- **lint**: 0 errors, 0 warnings ✅
- **tests**: 319/319 passed (57/57 test files) ✅
- **build**: compilation passed ✅ (Collecting page data требует DATABASE_URL — проблема среды, не кода) Старые записи не переписываются, кроме исправления явной опечатки. Каждая запись должна быть достаточно конкретной, чтобы следующий AI-агент или инженер понял, что изменилось и что проверено.

## 2026-05-19 — Уведомления: исправлены «блоки» — группировка по дате, убран virtualizer, улучшен дизайн

- **NotificationsList** (`components/lms/notifications-list.tsx`):
  - Убран `<TanStack Virtualizer>` с абсолютным позиционированием — он вызывал наложение карточек друг на друга, т.к. `estimateSize: 96` не учитывал реальную высоту контента (длинные тексты, кнопки действий)
  - Вместо виртуализации — обычный scroll с `space-y-2` между карточками, что исключает перекрытие
  - **Группировка «блоков» по дате**: Today / Yesterday / This week / Earlier с заголовками секций, разделительной линией и счётчиком
  - Unread-индикатор: точка у непрочитанных в заголовке группы + на каждой карточке
  - `estimateSize` (96) → каждая карточка занимает ровно столько, сколько нужно
  - Иконки, время, кнопка действия — всё как было, но в более читаемой структуре
- Удалён неиспользуемый `NOTIFICATION_ICON_MAP`
- Страницы всех ролей (`/student`, `/curator`, `/instructor`, `/super-curator`, `/admin`, `/notifications`) наследуют исправленный компонент — чинится везде
- **typecheck**: passed ✅
- **lint**: passed ✅

## 2026-05-19 — Аудит дизайна: исправление цветов, типографики, иконок, замена raw-инпутов на компоненты

- **StatusBadge** (`components/lms/status-badge.tsx`): хардкодные `emerald`/`amber`/`rose`/`sky` цвета заменены на M3-токены:
  - `success` → `m3-tertiary` (teal-green), `warning` → `m3-secondary` (purple), `danger` → `m3-error`, `info` → `m3-primary`
  - И light, и dark mode корректно отображаются через M3-палитру
- **Dialog** (`components/ui/dialog.tsx`):
  - `DialogTitle`: `text-lg font-bold` → `text-headline-sm font-headline-sm text-m3-on-surface`
  - `DialogFooter`: `bg-muted/20` → `bg-m3-surface-container`
  - `DialogContent`: `bg-card` → `bg-m3-surface-container-lowest`
- **Login form** (`components/auth/login-form.tsx`): все `material-symbols-outlined` span заменены на компонент `<Icon>` (mail, lock, arrow_forward, login, code)
- **DashboardWidgets** (`components/lms/dashboard-widgets.tsx`): `TONE_CLASSES`, `TONE_BG_CLASSES`, `TONE_BORDER_CLASSES` переведены с emerald/amber/sky на M3-токены (`m3-tertiary`, `m3-secondary`, `m3-on-surface-variant`)
- **CuratorOperationsBoard** (`components/lms/curator-operations-board.tsx`): `ACTION_TONE_CLASSES` — `amber-200/800` заменены на `m3-secondary-fixed-dim/container`
- **UserAccountNav** (`components/layout/user-account-nav.tsx`): Lucide-иконки (`LayoutDashboard`, `Settings`, `LogOut`) заменены на Material Symbols через `<Icon>` (dashboard, settings, logout); импорт lucide-react удалён
- **AdminSettings** (`app/admin/settings/page.tsx`):
  - Все raw `<input>` заменены на `<Input>`-компонент
  - Hand-rolled toggle заменён на `<Switch>`-компонент из Radix
  - Lucide-иконки (`Flag`, `Mail`, `Shield`, `RefreshCw`) заменены на `<Icon>` (flag, mail, verified, refresh)
  - `CardTitle` исправлен с `text-base` на `text-headline-sm`
  - `bg-muted/50` заменён на `bg-m3-surface-container-high`
- **typecheck**: passed ✅
- **lint**: passed ✅

## 2026-05-19 — Чат: двухпанельный layout + установка superpowers + аудит дизайна

- **Superpowers**: установлен plugin `obra/superpowers` в `opencode.json` (git+https)
- **Чат: двухпанельный layout** (`app/curator/chat/chat-list.tsx`):
  - Полностью переписан `CuratorChatList`: вместо списка карточек + Dialog-оверлея сделан split-pane layout
  - Левая панель: список диалогов («папки») с поиском, unread-badge на каждой папке, сводка внизу
  - Правая панель: активный диалог (ChatPanel) без наложения на список
  - На мобильных: либо список, либо чат с кнопкой «Назад» (ChevronLeft)
  - Пустое состояние: подсказка «Выберите диалог» с общим числом диалогов/непрочитанных
- **ChatPanel** (`components/lms/chat-panel.tsx`): добавлен prop `fullHeight` — при включении компонент занимает всю высоту контейнера (h-full, max-h-none)
- **Дизайн-аудит**:
  - Исправлены 12 сломанных CSS-классов `text-m3-headline-md`, `text-m3-headline-sm`, `text-m3-label-lg` → `text-headline-md`, `text-headline-sm`, `text-label-lg` (эти классы не существовали в tailwind.config.ts)
  - Файлы: `dashboard-widgets.tsx`, `super-curator-operations-board.tsx`, `curator-operations-board.tsx`, `course-builder-shell.tsx`
- **typecheck**: passed ✅
- **lint**: passed ✅

## 2026-05-18 — Fix: reply-to-message на каждом сообщении + PWA: NAVIGATE handler, manifest, desktop install

- **Кнопка «Ответить» на каждом сообщении** (`chat-panel.tsx`):
  - Проблема: кнопка была внутри блока `isLastInGroup`, поэтому появлялась только на последнем сообщении в группе (когда куратор писал 2+ сообщения подряд — ответить можно было только на последнее)
  - Фикс: кнопка вынесена наружу (после `isLastInGroup`), отображается на КАЖДОМ сообщении собеседника независимо от группировки
  - Время/статус остались только у последнего в группе (визуальная группировка сохранена)
  - `isMine ? "text-right" : "text-left"` упрощён до `text-left`

- **PWA: NAVIGATE handler** (`pwa-register.tsx`):
  - Проблема: при клике на push-уведомление SW отправлял `postMessage({ type: "NAVIGATE", url })` существующим окнам, но клиент не обрабатывал это сообщение — окно фокусировалось, но не переходило по URL
  - Фикс: добавлен обработчик `event.data?.type === "NAVIGATE"` → `window.location.href = targetUrl`

- **Manifest shortcut URL** (`public/manifest.json`):
  - Шорткат «Дашборд» вёл на `/login` — исправлено на `/`

- **Desktop Chrome PWA install** (`pwa-install-prompt.tsx`):
  - Проблема: условие `showBanner` исключало `platform === "other"` (desktop), хотя Chrome/Edge/Opera на десктопе тоже поддерживают `beforeinstallprompt`
  - Фикс: добавлено `(platform === "other" && installEvent)` — теперь баннер показывается и на десктопе

- **build**: passed ✅
- **tests**: 315/315 passed (54/54 test files) ✅

- **Группировка сообщений** (`chat-panel.tsx`): consecutive сообщения от одного отправителя теперь склеиваются — только первый/последний имеют полные скругления, между ними нет отступа (mt-0.5 вместо mt-3), время отображается только у последнего в группе
- **Ответ на сообщение** (`chat-panel.tsx` + `server/actions/chat.ts` + Prisma schema):
  - Добавлено поле `replyToId` в модель `Message` (самореференс)
  - При нажатии "Ответить" на сообщении куратора — над формой появляется плашка с текстом родителя
  - При отправке `lessonId` наследуется от родительского сообщения (если не указан явно)
  - В пузыре ответа отображается блок "В ответ на: {текст родителя}" (цитата)
  - Для студентов: ответ куратора с `replyToId` → `lessonId` наследуется → показывается в нужном уроке
  - Оптимистичные сообщения также содержат `replyTo`-контекст для мгновенного UI
- **Наложение уведомлений** (`notification-toast.tsx`): убран `unstyled: true` → sonner нормально стыкует тосты с отступом
- **`prisma db push`**: добавлена колонка `reply_to_id` в `messages`
- **build**: passed ✅
- **Последующие шаги**: UI для ответа на сообщения у студентов (чтобы они тоже могли отвечать на конкретное сообщение куратора), если потребуется

## 2026-05-18 — Fix: redirect-target race condition (все роли попадали на /student)

- **Проблема**: После логина `redirect-target` использовал `getServerSession(authOptions)`, который не успевал прочитать только что созданную сессионную куку. `requireUser()` кидал 401, клиент фолбечился на `/student` — **все роли видели меню слушателя**.
- **Фикс**: Заменён `getServerSession` → `getToken` из `next-auth/jwt`. `getToken` читает JWT напрямую из Cookie без полного Session pipeline, что исключает race condition.
- **build**: passed (ƒ Proxy (Middleware) — Next.js 16 корректно использует `proxy.ts` как middleware).

## 2026-05-18 — Material 3 редизайн: все P0-P2 компоненты

- **P0 (Foundation)**: Tailwind config + CSS-переменные M3 Deep Indigo (30+ токенов), M3-типографика (text-headline-lg/body-md/label-lg/mono-sm), M3-тени, Material Symbols + JetBrains Mono в layout.tsx
- **P0 (Login)**: `login-screen.tsx` + `login-form.tsx` — центрированная M3-карта, blur-блобы, M3-инпуты/кнопки
- **P1 (Navigation)**: `app-shell.tsx`, `nav-links.tsx` (active left border), `site-header.tsx`, `mobile-bottom-nav.tsx` — M3 surface/border/shadow/color токены
- **P1 (Cards)**: shadcn `card.tsx` — `border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft`, page-header с M3-типографикой
- **P2 (Lesson Player)**: `lesson-player-shell.tsx` — M3 top bar (backdrop-blur, M3 colors), progress bar в M3-стиле, блоки с M3-контейнерами, M3 badges/типографика
- **P2 (Course Catalog)**: `module-accordion.tsx` — M3 карточки модулей, M3 progress, hover-эффекты; `lesson-card.tsx` — M3 card/shadow/border/icon container; `course-hero-card.tsx` — M3 cover gradient, M3 badge/text/colors; `course-contents-drawer.tsx` — M3 sheet/colors/active accent
- **P2 (Content Blocks)**: `video-block.tsx` — M3 container/badge/border; `text-block.tsx` — M3 typography/colors; `file-block.tsx` — M3 card/shadow/icon; `quiz-block.tsx` — M3 card/options/progress/result/review; `assignment-block.tsx` — M3 card/status badges/forms; `lesson-navigation.tsx` — M3 button styling
- **P2 (System)**: `status-badge.tsx` — M3 variant classes (tertiary/secondary/error/surface); `notifications-list.tsx` — M3 card/colors/typography; `chat-panel.tsx` — M3 bubble/input/header; `breadcrumbs.tsx`; `empty-state.tsx`; `list-toolbar.tsx`; `settings-forms.tsx` — M3 во всех
- **type-check**: 0 ошибок | **tests**: 304/304 passed (53/53 test files)

## 2026-05-18 — P3.1: Lucide → Material Symbols (core components) + Icon wrapper

- **Создан** `components/ui/icon.tsx` — обёртка Material Symbols с поддержкой fontVariationSettings (`FILL`, `wght`, `GRAD`, `opsz`), кастомного размера и className
- **Заменены Lucide → Icon** во всех M3-компонентах (30+ файлов):
  - Layout: `site-header.tsx`, `nav-links.tsx`, `mobile-bottom-nav.tsx`, `navigation.ts`
  - Lesson player: `lesson-player-shell.tsx`, `lesson-card.tsx`, `lesson-navigation.tsx`, `video-block.tsx`, `file-block.tsx`, `quiz-block.tsx`, `assignment-block.tsx`, `course-contents-drawer.tsx`
  - Course catalog: `module-accordion.tsx`, `course-hero-card.tsx`, `breadcrumbs.tsx`
  - System: `notifications-list.tsx`, `chat-panel.tsx`, `list-toolbar.tsx`, `settings-forms.tsx`, `empty-state.tsx`
- `EmptyState` — type-safe: принимает как строку (Material Symbols name), так и LucideIcon для обратной совместимости
- **type-check**: 0 ошибок | **tests**: 304/304 passed (53/53 test files)

## 2026-05-18 — proxy.ts rate limiter unified with Vercel KV

- **`proxy.ts`** больше не использует собственный in-memory rate limiter
- Теперь использует `lib/rate-limit.ts` → `lib/cache.ts` → **Vercel KV (`@upstash/redis`)** при наличии `KV_URL` или `REDIS_URL`
- Если KV не настроен — автоматический fallback на in-memory (поведение не изменилось)
- **type-check**: 0 ошибок

## 2026-05-18 — Tests fixed + k6 load test + FK indexes

- **4 test files fixed**: `assignments.test.ts`, `courses-service.test.ts`, `certificates-service.test.ts`, `analytics-service.test.ts` — добавлен `outboxEvent: { create: vi.fn() }` в prisma mock
- **Все 304 теста проходят** (53/53 test files)
- **k6 smoke test** создан: `tests/load/smoke-test.js` — симуляция 2000 concurrent с ramp-up
- **Созданы FK индексы** для внешних ключей, отмеченных Supabase advisor (INFO-level)
- **RLS конфликт устранён**: удалён `deny_anon_all` policy с `messages` (там уже была легитимная policy "Users can subscribe to their messages")

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

## 2026-05-21 — Фикс: CSRF origin mismatch на Vercel (403 на builder snapshot)

- **Проблема**: На Vercel мутирующие API-запросы (PATCH/POST/DELETE) возвращали 403 с сообщением "CSRF: origin mismatch". Причина: `proxy.ts` сравнивает `origin` заголовок запроса с `APP_URL`, но на Vercel `APP_URL` не была задана, и fallback был `http://localhost:3000`, который не совпадает с `https://academic-silk-ten.vercel.app`.
- **Фикс**: В `checkCsrfOrigin` (proxy.ts) и `verifyCsrf` (lib/http.ts) добавлен fallback на `VERCEL_URL` — переменную, автоматически устанавливаемую Vercel для каждого деплоя (`https://${VERCEL_URL}`).
- **Затронутые файлы**: `proxy.ts`, `lib/http.ts`
- **Коммит**: `358c271`
