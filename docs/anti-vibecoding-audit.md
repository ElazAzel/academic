# Anti-Vibecoding Audit

**Дата:** 2026-05-16
**Аудитор:** Development Agent (opencode)
**Область:** Весь код — компоненты, server actions, сервисы, страницы, типы, валидация, UI
**Метод:** Ручной обзор ~50+ ключевых файлов + анализ архитектуры по слоям

---

## Executive Summary

| Критерий | Оценка |
|----------|--------|
| **Общее здоровье кода** | 🟡 75% — код работает, но есть архитектурный и нейминговый долг |
| **Зрелость UI** | 🟡 60% — функционально, но выглядит как набор независимых дашбордов |
| **Самые большие риски** | Дублирование progress/access логики, слабая типизация контента, размножение CSS-классов статусов |
| **Самые большие возможности** | Выделить `StatusBadge`, ввести роут-константы, убрать дублирование access-map, типизировать блоки контента |
| **Рекомендация** | 8 PR-ов по нарастающей сложности — от безопасного рефакторинга до тестов |

### Сравнение с предыдущим аудитом

| Аспект | `full-project-audit.md` (2026-05-13) | Anti-vibecoding audit |
|--------|---------------------------------------|----------------------|
| Фокус | Безопасность, схема, scope | Качество кода, нейминг, дубли, UI/UX, архитектура |
| `any`/`as any` | 0 в production source | Обнаружено `as Record<string, unknown>` в 6+ местах |
| Дубликаты | ~200 строк (course-builder) | + progress access-map, badge CSS, error handling |
| Магические значения | Не проверялись | ~20 констант/строк/чисел |
| UI consistency | 90% maturity оценка | Реальная: 60% — дублированные паттерны |

---

## 7 Principles Applied

### 1. Naming — 🟡 6/10

**Хорошо:**
- `getStudentCoursePlayerDetail`, `getStudentLessonPlayerDetail` — самодокументируемые
- `submitAssignmentAction`, `submitQuizAction` — понятные server actions
- `CourseHeroCard`, `ModuleAccordion`, `LessonCard` — компоненты с ясной ответственностью

**Плохо:**
- `safeQuery` — generic, не говорит что делает (try-catch с fallback)
- `data` — переменная в `app/student/page.tsx:21,37,42-45` — `data?.metrics`, `data?.continueLearning` без контекста
- `getStudentDashboard` в `server/actions/dashboard/student.ts` содержит также `getEnrollmentData` (admin-only)
- `toJsonValue` — не говорит зачем (Prisma InputJsonValue конвертация)
- `asRecord` — generic, не говорит что возвращает `Record<string, unknown>`

### 2. Duplication — 🟡 5/10

**Дубликаты бизнес-логики:**
1. **Sequential access map** — `buildLessonAccessMap` (learning/service.ts:97-132) и ручная сборка в `buildCoursePlayerDetail` (learning/service.ts:265-290) — ~80% одинаковой логики блокировки предыдущими required-уроками
2. **Progress calculation** — `buildCourseLearningDetail` считает `modulePercent` (строка 143), `buildCoursePlayerDetail` считает то же самое (строка 313), и `progress/service.ts` считает в третий раз в `markLessonProgress`
3. **Badge CSS classes** — одни и те же `emerald`/`sky`/`amber`/`rose` цветовые паттерны повторяются в ~10 местах

**Дубликаты UI:**
1. `dashboard-widgets.tsx:129-137`, `dashboard-widgets.tsx:176-183`, `dashboard-widgets.tsx:240-249`, `dashboard-widgets.tsx:289-295` — каждое место переопределяет badge CSS
2. Empty states: `EmptyState` компонент используется в 3 местах, inline карточки в 4+ местах
3. Error handling: паттерн `if (error instanceof ApiError && ...) notFound()/redirect()` повторяется на каждой странице

### 3. Formatting — 🟢 8/10

- ESLint настроен, 0 warnings
- Import order консистентный (`@/` сначала, потом `@/components`, потом `lucide-react`)
- Единый стиль компонентов (стрелочные функции, named exports)
- Server actions единообразно используют `"use server"` + `requireRole`

**Проблемы:**
- `server/actions/curator.ts` использует `getPrisma()` вместо `prisma` из `@/lib/prisma`
- `server/actions/quiz-assignment.ts` использует `getPrisma()` через `const prisma = getPrisma()`

### 4. Constants — 🔴 3/10

**Магические числа и строки (неполный список):**

| Значение | Где | Должно быть |
|----------|-----|-------------|
| `passThreshold: 80` | `quiz-assignment.ts:16` | `DEFAULT_QUIZ_PASS_THRESHOLD` |
| `maxAttempts: 3` | `quiz-assignment.ts:17,39` | `DEFAULT_QUIZ_MAX_ATTEMPTS` |
| `"in_app"` | `curator.ts:68,119,175` и др. | `NOTIFICATION_CHANNEL.IN_APP` |
| `100` MB | `media/uploads/route.ts` | `MAX_UPLOAD_FILE_SIZE` (требование: 20MB) |
| `take: 10` | `dashboard/student.ts:38` | `QUESTIONS_PAGE_SIZE` |
| `take: 100` | `notifications/service.ts:166` | `NOTIFICATIONS_PAGE_SIZE` |
| `take: 5` | `progress/service.ts:242` | `RECENT_PROGRESS_COUNT` |
| `/student/lessons/` | 15+ мест | `STUDENT_ROUTES.lessons` |
| `/student/courses/` | 10+ мест | `STUDENT_ROUTES.courses` |
| `"sequential"` | 5+ мест | `TRAVERSAL_MODE.SEQUENTIAL` |
| `requireRole(["student"])` | 10+ страниц | `REQUIRED_ROLES.student` как константа |

### 5. Modern TypeScript — 🟡 5/10

**Слабая типизация:**

```typescript
// domain.ts:145 — content без discriminated union
content: Record<string, unknown>;
// domain.ts:158 — data тоже Record<string, unknown>
data: Record<string, unknown>;
// learning/service.ts:86-91 — asRecord возвращает as Record<string, unknown>
function asRecord(value: Prisma.JsonValue): Record<string, unknown>
// learning/service.ts:395-403 — parseContentBlocks с as-кастами
type: (["video", "text", "file" /*...*/].includes(block.type) ? block.type : "text") as ContentBlock["type"]
// learning/service.ts:629 — options с as-кастом
(q.options as Array<{ id?: string; label?: string }>)
```

**Проблемы:**
- `lesson.content` должен быть discriminated union: `{ blocks: ContentBlock[] } | { text: string } | {}`
- `quiz.options` должен быть `{ id: string; label: string; isCorrect: boolean }[]`
- `formData.get(...) as string` в 2 server actions без Zod-валидации
- `satisfies Prisma.EnrollmentInclude` — хорошо, но типы возврата не проверяются

### 6. Conditional Simplification — 🟡 6/10

**Упростить:**
- `curator.ts:14-27` → `assertCuratorStudentAccess` — длинная конструкция, можно упростить early return
- `course-hero-card.tsx:67-79` — дублированный блок "Задать вопрос" с/без active enrollment
- `module-accordion.tsx:90-99` — deadline badge с вложенными тернарниками
- `lesson-player-shell.tsx:163-184` — switch по типу блока можно вынести в `ContentBlockRenderer`

**Нормально:**
- Guard clauses в `rbac.ts:43-47` — хороший паттерн
- Ранние return в `getStudentCoursePlayerDetail`
- `DashboardMetric.tone` — good use of typed map

### 7. Declarative Code — 🟡 6/10

**Хорошо:**
- `LESSON_ICONS` (lesson-card.tsx:8-18) — декларативная карта иконок
- `STATUS_BADGE` (lesson-card.tsx:27-32) — декларативная карта
- `RISK_LABELS` (domain.ts:450-456) — константы
- `templates` (notifications/service.ts:58-78) — декларативные шаблоны

**Можно улучшить:**
- `module-accordion.tsx:90-99` — deadline badge с тернарниками → вынести в `getDeadlineBadgeProps()`
- Сборка nav items и sidebars — ручная, можно сделать config-driven
- `course-hero-card.tsx` — curator block можно вынести в отдельный компонент

---

## Code Smell Matrix

| # | Area | File | Smell | Severity | Why vibe-coded | Fix | Priority |
|---|------|------|-------|----------|----------------|-----|----------|
| 1 | Duplication | `learning/service.ts:97-132, 265-290` | Sequential access map duplicated | **High** | Копипаст с минимальными изменениями | Extract `buildSequenceAccessMap()` | PR-5 |
| 2 | Duplication | 10+ files | Badge CSS classes | **High** | Каждый разработчик копировал цвета | ✅ `StatusBadge` created with presets, 6 files updated | PR-2 ✅ |
| 3 | Typing | `domain.ts:145,158` | `Record<string, unknown>` | **High** | Быстро "заткнуть" TypeScript | Discriminated union for content blocks | PR-7 |
| 4 | Constants | 15+ files | Route paths hardcoded | **Medium** | Лень выносить, копипаст | `STUDENT_ROUTES`, `ADMIN_ROUTES` maps | PR-3 |
| 5 | Constants | 8+ files | Threshold limits hardcoded | **Low** | Не задумывались о конфигурации | Domain constants file | PR-3 |
| 6 | Naming | `shared.ts` | `safeQuery` | **Medium** | Generic wrapper name | Rename to `withQueryFallback` | PR-4 |
| 7 | Layer | `app/student/quizzes/page.tsx:13` | Prisma import in page | **High** | Быстрый query без сервиса | Add server action | PR-5 |
| 8 | Layer | `lesson-player-shell.tsx:43-59` | Client component calls API route | **Medium** | fetch удобнее server action | Use `markLessonProgressAction` | PR-5 |
| 9 | God | `dashboard-widgets.tsx` | 449 lines, 8+ widgets | **Medium** | Всё в одном файле | Split by role | PR-2 |
| 10 | Dead | `demo-mode.ts` + `DashboardUnavailable` | Mock fallback | **Low** | Заглушка для демо | Remove or gate | PR-8 |
| 11 | Typing | `curator.ts:192-193` | `formData.get(...) as string` | **Medium** | Быстрая обработка формы | Zod validation | PR-7 |
| 12 | Formatting | `curator.ts:5` vs `admin.ts:6` | Несколько импортов `getPrisma` | **Low** | Два способа импорта | Unify to `@/lib/prisma` | PR-4 |
| 13 | Duplication | `server/actions/courses.ts:155-181` | `askCuratorQuestion` дублирует `learning/service.ts:552-594` | **Medium** | Server action дублирует сервис | Remove server action copy, re-export | PR-5 |
| 14 | Constants | `server/actions/dashboard/student.ts:174-177` | Fallback empty arrays | **Low** | Не константы, а литералы | `EMPTY_ENROLLMENT_DATA` | PR-3 |
| 15 | Conditional | `quiz-view.tsx:22-30` | `handleSubmit` с ручной проверкой | **Low** | Императивный стиль | Extract `validateAnswersBeforeSubmit` | PR-7 |

---

## UI Smell Matrix

| # | Route | Problem | Why vibe-coded | Fix | Priority |
|---|-------|---------|----------------|-----|----------|
| 1 | `/student` | `data?.metrics` fallback, `DashboardUnavailable` | Mock fallback | Remove demo mode, handle error gracefully | PR-8 |
| 2 | `/student` | Deadlines/answers cards have inline badge colors | Не единый компонент | Use `StatusBadge` | PR-2 |
| 3 | `/student/courses/[id]` | "Назад" кнопка ведёт на `/student` а не `/student/my-courses` | Копипаст навигации | Fix breadcrumb | PR-2 |
| 4 | `/student/lessons/[id]` | Legacy video + legacy media + legacy text 3 параллельных code path | Эволюция без рефакторинга | Consolidate content rendering | PR-6 |
| 5 | `/student/quizzes` | Встроенные badge классы, нет `EmptyState` компонента | Быстрая верстка | Use `StatusBadge` + `EmptyState` | PR-2 |
| 6 | `/student/quizzes/[id]` | Отдельный full-page flow, слабая связь с уроком | Тесты как отдельная фича | Back-link to lesson, embed mode | PR-6 |
| 7 | `/student/assignments` | Same — отдельная страница без `EmptyState` | Same | Same | PR-2 |
| 8 | `/student/my-courses` | Inline empty state вместо `EmptyState` | Не замели существующий компонент | Use `EmptyState` | PR-2 |
| 9 | `/instructor/courses` | `CourseManageGrid` с inline badge | Дубликат из student | Use shared course card | PR-2 |
| 10 | `/admin/enrollments` | FormData без валидации | Быстрая форма | Zod | PR-7 |
| 11 | `/student` | ContinueLearningCard имеет deadlineDaysLeft но скрывает | Dead code | Remove or wire | PR-6 |

---

## Architecture Drift

| Ожидаемый слой | Текущая реализация | Проблема | Исправление |
|---------------|-------------------|----------|-------------|
| `app/*` → только страницы + error/loading | `app/student/quizzes/page.tsx:11` импортирует Prisma напрямую | Нарушение изоляции слоёв | Вынести query в `server/actions/` |
| `components/*` → только рендеринг | `components/lms/lesson-player-shell.tsx:43-59` вызывает API fetch | Компонент содержит бизнес-логику | Использовать server action |
| `server/actions/*` → тонкие диспетчеры | `server/actions/courses.ts:155-181` содержит полную реализацию `askCuratorQuestion` | Дублирует логику из `server/modules/learning/service.ts:552-594` | Удалить дубликат, re-export |
| `server/modules/*` → бизнес-логика | `learning/service.ts:196-245` — `getStudentCourses` + `getContinueLearning` + `getStudentCourseCards` | Микс query-хелперов | Разделить query-сервисы и command-сервисы |
| `lib/*` → инфраструктура | `lib/prisma.ts:5-10` дублирует `loadEnvFile` из `lib/env.ts:3-8` | Дублирование | Вынести loadEnvFile в отдельный хелпер |

---

## Unsafe Actions

| Action | Проблема | Риск | Фикс |
|--------|----------|------|------|
| `answerForwardedQuestionAction(formData: FormData)` | formData.get() без Zod-валидации | Можно отправить пустой/вредоносный answer | Zod validation |
| `enrollStudentAction(formData: FormData)` | formData.get() без Zod-валидации | Можно передать произвольные ID | Zod validation |
| `createQuizAction()` | Создаёт quiz без courseId/lessonId | Quiz висит в нигде | Требовать lessonId |
| `createAssignmentAction()` | Создаёт assignment без courseId/lessonId | Assignment висит в нигде | Требовать lessonId |
| `markLessonProgress` в `progress/service.ts` | Percent принимается от клиента без валидации что урок действительно можно завершить | Манипуляция прогрессом | Уже проверяется sequential access |

---

## Duplicated Logic

### Sequential Access Map

Дважды строится карта доступа к урокам с одинаковой логикой:

1. `learning/service.ts:97-132` — `buildLessonAccessMap(enrollment)` для `StudentCourseLearningDetail`
2. `learning/service.ts:265-290` — ручная сборка для `StudentCoursePlayerDetail`

Обе функции:
- Проходят по orderedLessons flatMap
- Проверяют `enrollment.course.traversalMode === "sequential"` и `previousRequiredLessonOpen`
- Строят Map `lessonId → { locked, status, progressPercent }`

**Fix:** Вынести `buildSequenceAccessMap` как shared helper.

### Progress Percent Calculation

Процент вычисляется в 3 местах:
1. `learning/service.ts:143` — `computedPercent` для ModuleLearningDetail
2. `learning/service.ts:313` — `computedPercent` для ModulePlayerDetail  
3. `progress/service.ts:101,138,165` — в `markLessonProgress`

Все используют формулу: `completedCount / totalCount * 100`.

**Fix:** Вынести `calculateProgressPercent` helper.

### Badge CSS Classes

Одни и те же Tailwind классы для статусов определены в:
- `dashboard-widgets.tsx:129-137, 176-183, 240-249, 289-295, 337-344, 360-365, 424-441`
- `lesson-card.tsx:27-32`
- `course-hero-card.tsx:85-88`
- `app/student/courses/[courseId]/page.tsx:64-70, 99-108`
- `app/student/page.tsx:92-113, 127-141`

**Fix:** Создать компонент `StatusBadge` с пропсами `status: BadgeStatus` и картой цветов.

---

## God Components

### 1. `dashboard-widgets.tsx` (449 строк)

Содержит 8+ независимых виджетов:
- `MetricGrid` — student/curator/instructor/admin
- `ContinueLearningCard` — student
- `CourseProgressGrid` — student
- `CourseManageGrid` — instructor/admin
- `QuestionsQueue` — curator/instructor
- `SubmissionsQueue` — curator
- `RisksList` — curator
- `CuratorLoadTable` — super_curator

**Fix:** Разделить по папкам `widgets/student/`, `widgets/curator/`, `widgets/admin/`.

### 2. `lesson-player-shell.tsx` (235 строк)

Отвечает за:
- Top bar с навигацией
- Progress bar с кнопкой "Отметить пройденным"
- Title блок с badges
- Legacy video/text rendering
- Block-based content rendering
- Materials section
- Embedded quizzes
- Embedded assignments
- Lesson rating
- Chat with curator
- Lesson navigation

**Fix:** Вынести секции в отдельные компоненты, `LessonPlayerShell` — только контейнер.

---

## Weak Typing

| Файл | Строка | Проблема |
|------|--------|----------|
| `types/domain.ts` | 145 | `content: Record<string, unknown>` — нет discriminated union |
| `types/domain.ts` | 158 | `data: Record<string, unknown>` — нет типов для блоков |
| `types/domain.ts` | 153 | `ContentBlockType` определён, но не используется как discriminated |
| `lib/validation.ts` | 30 | `content: z.record(z.unknown())` — нет схемы для блоков |
| `lib/validation.ts` | 98 | `data: z.record(z.unknown())` — нет схемы данных блока |
| `learning/service.ts` | 86-91 | `asRecord` кастует Prisma.JsonValue |
| `learning/service.ts` | 395-403 | `as ContentBlock["type"]` cast |
| `learning/service.ts` | 629 | `as Array<{ id?: string; label?: string }>` cast для options |
| `lesson-player-shell.tsx` | 168,170,172 | `as string`, `as number` для block.data |

---

## Dead Code

| Файл | Что | Почему dead |
|------|-----|-------------|
| `lib/demo-mode.ts` | `isDemoModeEnabled()` | Заглушка для демо, не используется в production |
| `components/lms/dashboard-unavailable.tsx` | `DashboardUnavailable` | Только с demo mode |
| `lesson-player-shell.tsx:63` | `legacyVideoUrl` | Только для обратной совместимости |
| `lesson-player-shell.tsx:159-183` | Legacy video/text rendering без blocks | Old content format |
| `app/instructor/courses/[id]/edit/page.tsx` | Redirect only | deprecated |
| `app/instructor/courses/[id]/curriculum/page.tsx` | Redirect only | deprecated |
| `app/instructor/lessons/[id]/edit/page.tsx` | Redirect only | deprecated |
| `app/instructor/modules/[id]/edit/page.tsx` | Redirect only | deprecated |

---

## Missing Tests

| Логика | Файл | Почему нужно тестировать | Сейчас |
|--------|------|--------------------------|--------|
| Progress calculation | `progress/service.ts:12-15` | `getCompletionBasis` — ключевая логика required-only | ❌ Нет тестов |
| Sequential access map | `learning/service.ts:97-132` | Логика блокировки уроков | ❌ Нет тестов |
| Content block parsing | `learning/service.ts:394-412` | Парсинг legacy и нового формата | ❌ Нет тестов |
| Quiz scoring | `quizzes/service.ts` | Подсчёт баллов, проходной порог | ❌ Нет тестов |
| YouTube URL normalization | (проверить наличие) | Нормализация ссылок | ❌ Не проверено |
| File validation | `media/uploads/route.ts` | MIME allowlist, размер | ❌ Нет тестов |
| Notification channel logic | `notifications/service.ts:84-160` | Фильтрация по preferences | ❌ Нет тестов |

---

## Recommended PR Sequence

| PR | Title | Risk | Effort | Files affected |
|----|-------|------|--------|---------------|
| 1 | 📄 Anti-vibecoding audit (docs only) | ✅ None | ~30 min | 3 docs | ✅ Done |
| 2 | 🎨 Shared UI: StatusBadge, standardize empty/error/loading | 🟡 Low | 2h | ~15 files | ✅ Done |
| 3 | 🔧 Constants: route maps, upload limits, status maps | 🟡 Low | 2h | ~20 files | 🟡 Partial (`lib/constants.ts` created, quiz defaults, notification channel constants, route partial) |
| 4 | 🏷️ Naming cleanup: safeQuery→withFallback, split mixed concerns | 🟡 Low | 1h | ~8 files | ✅ Done |
| 5 | 🧹 Server action cleanup: deduplicate, remove Prisma from pages | 🟡 Medium | 3h | ~12 files | ✅ Done |
| 6 | 🎯 Student lesson flow: consolidate content, embed quiz/assignment | 🟡 Medium | 4h | ~8 files | ❌ Pending |
| 7 | 🔒 TypeScript & validation: discriminated unions, Zod for formData | 🟡 Medium | 3h | ~10 files | ❌ Pending |
| 8 | 🧪 Security & tests: access finalize, integration tests | 🟡 Medium | 3h | ~10 files | ❌ Pending |

### PR Dependencies

```
PR 1 (docs) — no deps
  │
  ├──► PR 2 (shared UI) — after PR 1
  │
  ├──► PR 3 (constants) — after PR 1
  │
  ├──► PR 4 (naming) — after PR 1
  │
  ├──► PR 5 (actions cleanup) — after PR 3 (needs constants)
  │       │
  │       └──► PR 6 (lesson flow) — after PR 5 (actions stable)
  │
  └──► PR 7 (types) — after PR 5 (actions stable)

PR 8 (tests) — after PR 5, PR 6, PR 7
```

### Do Not Do Yet

- ❌ Полный UI redesign / перекраска
- ❌ Миграция enum (UserAccountStatus, QuestionStatus)
- ❌ Выделение микросервисов
- ❌ Real-time notifications
- ❌ SCORM/xAPI import
