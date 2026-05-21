# UI Polish Plan

**Дата:** 2026-05-16
**Автор:** Development Agent (opencode)
**Основание:** Anti-vibecoding audit — docs/anti-vibecoding-audit.md

---

## Design Principles

1. **Функциональность важнее декораций** — каждая карточка, метрика и кнопка должна решать задачу пользователя, а не заполнять экран
2. **Единая визуальная система** — одинаковые элементы (badge, card, button, empty state) выглядят одинаково во всех ролях
3. **Иерархия важнее плотности** — один главный action на страницу, вспомогательные элементы подчинены
4. **Консистентность важнее креативности** — импровизация в CSS допустима только в новых компонентах, legacy должен быть унифицирован
5. **Skillbox-like структура, не бренд** — берём паттерны навигации и иерархии, а не цвета/логотипы/шрифты

---

## Skillbox-inspired UX Patterns

### Что берём (структура):
- Course page: sticky sidebar + progress + module accordion + lesson cards
- Lesson player: clean center + right contents drawer
- Quiz: focused question card, one-at-a-time flow
- Text lesson: clean reading layout
- Hide completed toggle на модулях
- Back-to-course CTA на каждом шаге

### Что НЕ берём:
- Логотип Skillbox
- Цветовую схему
- Шрифты и типографику
- Точную сетку
- Иконки

---

## Component Standardization

### 1. `StatusBadge` — NEW unified component

```typescript
type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral" | "primary";
type BadgeStatus = 
  | "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "BLOCKED"
  | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "NEEDS_REVISION" | "IN_REVIEW"
  | "PUBLISHED" | "DRAFT" | "ARCHIVED"
  | "open" | "answered" | "forwarded"
  | "critical" | "high" | "medium" | "low";

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
}
```

**Цветовая карта (единая для всего проекта):**

| Variant | Border | Background | Text | Использование |
|---------|--------|------------|------|---------------|
| success | emerald-200 | emerald-50 | emerald-700 | COMPLETED, ACCEPTED, PUBLISHED, answered |
| warning | amber-200 | amber-50 | amber-700 | IN_REVIEW, NEEDS_REVISION, DRAFT, forwarded |
| danger | rose-200 | rose-50 | rose-700 | REJECTED, critical, overdue |
| info | sky-200 | sky-50 | sky-700 | IN_PROGRESS, SUBMITTED, open |
| neutral | gray-200 | gray-50 | gray-500 | NOT_STARTED, BLOCKED, archived |
| primary | primary/20 | primary/5 | primary | required, active |

### 2. `PageHeader` — already exists, keep

`components/lms/page-header.tsx` — хороший, использовать везде.

### 3. `EmptyState` — already exists, use everywhere

`components/lms/empty-state.tsx` — хороший, но не везде используется.

**Добавить использование:**
- `/student/quizzes/page.tsx` — заменить inline на `EmptyState`
- `/student/assignments/page.tsx` — заменить inline на `EmptyState`
- `/student/my-courses/page.tsx` — заменить inline на `EmptyState`
- `/student/certificates/page.tsx` — проверить

### 4. `PageSkeleton` — already exists, keep

`components/lms/page-skeleton.tsx` — универсальный skeleton.

### 5. `PageError` — already exists, keep

`components/lms/page-error.tsx` — универсальный error boundary.

### 6. `MetricCard` — standardize

Сейчас `MetricGrid` в `dashboard-widgets.tsx:45-69` с inline `TONE_CLASSES`.
Вынести в отдельный `MetricCard` компонент с пропсами `label`, `value`, `tone`, `change`.

### 7. `CourseCard` — unify

Сейчас 2 варианта:
- `CourseProgressGrid` (dashboard-widgets.tsx:119-162) — для студента
- `CourseManageGrid` (dashboard-widgets.tsx:165-213) — для инструктора/админа

Объединить в один `CourseCard` с пропсом `variant: "student" | "manage"`.

### 8. `LessonCard` — already exists, good

`components/lms/lesson-card.tsx` — хорошо сделан с картами иконок и статусов.

### 9. `ModuleAccordion` — already exists, good

`components/lms/module-accordion.tsx` — well done, keep.

### 10. `QuizBlock` / `AssignmentBlock` — embed in lesson

Сейчас quizzes и assignments отображаются в `lesson-player-shell.tsx` как встроенные блоки.
Убедиться, что `QuizBlock` и `AssignmentBlock` имеют:
- Back-to-lesson link
- Embedded flow (не отправляет на отдельную страницу)
- Completion sync с прогрессом урока

---

## Student Flow Redesign

### `/student` — Dashboard

**Сейчас:**
- Continue Learning card (хорошо)
- MetricGrid (4 карточки)
- My Courses (слайс 3)
- Deadlines + Curator answers в 2 колонки
- Redirect на курс если 1 активный

**Проблемы:**
- `data?.metrics` fallback через `DashboardUnavailable` — должно быть graceful degradation
- Deadline card цвета захардкожены
- Нет loading state (страница серверная, но skeleton был бы лучше)
- Redirect на курс если 1 — неочевидное поведение

**Polish:**
- Убрать `DashboardUnavailable` компонент, показывать `PageSkeleton` при загрузке
- Заменить inline deadline цвета на `StatusBadge`
- Сделать redirect опциональным (comment, можно убрать)
- Добавить `EmptyState` для каждого блока

### `/student/courses/[courseId]` — Course Page

**Сейчас:**
- Breadcrumbs
- Back button + Next lesson CTA
- Paused banner
- Two-column: sidebar (CourseHeroCard) + ModuleAccordion
- Certificate CTA при 100%

**Проблемы:**
- "Назад" ведёт на `/student`, не на `/student/my-courses`
- Empty state использует `EmptyState` компонент ✅
- Всё остальное хорошо

**Polish:**
- Исправить "Назад" на `/student/my-courses`
- Done.

### `/student/lessons/[lessonId]` — Lesson Player

**Сейчас:**
- Sticky top bar с breadcrumbs и contents drawer
- Sticky progress bar
- Title + badges
- Legacy video/text OR block-based content
- Materials
- Embedded quizzes
- Embedded assignments
- Rating
- Chat with curator
- Navigation

**Проблемы:**
- 3 параллельных code path (legacy video, blocks, legacy text) — контринтуитивно
- Quizzes/assignments отдельные блоки без "mark as complete" синхронизации
- Нет loading state при сохранении прогресса (кроме disabled button)
- Chat panel лениво загружается — хорошо, но визуально дёргается

**Polish:**
- Consolidate rendering: blocks only, drop legacy paths
- Добавить "Тест пройден" / "Задание сдано" чекбокс в QuizBlock/AssignmentBlock
- Добавить optimistic update для markCompleted
- Добавить минимальную анимацию появления контента

### `/student/quizzes/[quizId]` — Quiz Page

**Сейчас:**
- Full-page quiz с back-to-lesson link
- Radio button questions
- Submit с confirm если не все ответили
- Redirect на result page

**Проблемы:**
- Отдельная страница, вырвана из контекста урока
- Нет explanation после ответа (для review mode)
- Нет таймера

**Polish:**
- Оставить как standalone aggregator, но усилить back-link
- Добавить review mode (показать правильные ответы после submission)
- Добавить QuizResultView inline (не отдельная страница)

### `/student/assignments/[assignmentId]` — Assignment Page

**Сейчас:**
- Full-page assignment с back-to-lesson link
- Текст задания + форма ответа
- Статус submission

**Проблемы:**
- Отдельная страница
- Нет preview загруженного файла
- Нет истории попыток

**Polish:**
- Оставить как standalone, усилить back-link
- Добавить preview загруженного файла

---

## Course Builder Redesign

### `/admin|courses/[courseId]/builder` — Builder

**Сейчас:**
- `CourseBuilderShell` — top bar + 3 колонки
- `CourseOutline` — left panel (course → modules → lessons)
- `LessonEditor` / `ModuleEditor` — center panel
- `CourseSettingsPanel` — right panel
- `LessonBlockEditor` + `QuizBlockEditor` + `AssignmentBlockEditor`

**Проблемы:**
- Builder существует, но quizzes/assignments создаются и отдельно через `/instructor/quizzes/create` и `/instructor/assignments/create`
- Нет preview-as-student режима
- Нет drag-and-drop reorder в UI (API есть)

**Polish:**
- Сделать создание quiz/assignment только через builder (убрать отдельные create actions или сделать redirect в builder)
- Добавить preview-as-student кнопку
- Добавить drag-and-drop reorder

---

## Page-by-Page Fixes

### Student Routes

| Route | Priority | Fixes |
|-------|----------|-------|
| `/student` | P1 | Убрать DashboardUnavailable, StatusBadge для дедлайнов, EmptyState для блоков |
| `/student/my-courses` | P2 | Использовать EmptyState |
| `/student/courses/[courseId]` | P1 | Исправить back link |
| `/student/lessons/[lessonId]` | P1 | Consolidate content rendering |
| `/student/quizzes` | P2 | Использовать EmptyState + StatusBadge |
| `/student/quizzes/[quizId]` | P2 | Добавить review mode |
| `/student/assignments` | P2 | Использовать EmptyState + StatusBadge |
| `/student/assignments/[assignmentId]` | P2 | Добавить file preview |
| `/student/notifications` | P3 | — |
| `/student/certificates` | P3 | — |
| `/student/settings` | P3 | — |

### Instructor Routes

| Route | Priority | Fixes |
|-------|----------|-------|
| `/instructor` | P2 | StatusBadge для виджетов |
| `/instructor/courses` | P2 | Unified CourseCard |
| `/instructor/courses/new` | P3 | — |
| `/instructor/courses/[id]/builder` | P1 | Redirect quiz/assignment create into builder |
| `/instructor/quizzes` | P2 | StatusBadge, EmptyState |
| `/instructor/assignments` | P2 | StatusBadge, EmptyState |

### Curator Routes

| Route | Priority | Fixes |
|-------|----------|-------|
| `/curator` | P2 | StatusBadge для виджетов |
| `/curator/questions` | P2 | EmptyState |
| `/curator/students` | P3 | — |
| `/curator/assignments` | P2 | StatusBadge для SubmissionBadge |

### Admin Routes

| Route | Priority | Fixes |
|-------|----------|-------|
| `/admin` | P2 | StatusBadge |
| `/admin/users` | P3 | — |
| `/admin/courses` | P2 | Unified CourseCard |
| `/admin/enrollments` | P2 | Zod for formData |
| `/admin/audit` | P3 | — |

---

## Acceptance Criteria

UI polish PR проходит если:

- [ ] Все `StatusBadge` используются единообразно (нет inline badge классов)
- [ ] Все empty states используют компонент `EmptyState`
- [ ] Все loading states используют `PageSkeleton`
- [ ] Все error states используют `PageError`
- [ ] `PageHeader` используется на всех страницах
- [ ] Нет двух разных стилей для одного и того же UI-элемента
- [ ] Студенческий dashboard не показывает `DashboardUnavailable`
- [ ] Quiz/assignment страницы имеют работающий back-to-lesson link
- [ ] `npm run lint -- --max-warnings=0` проходит
- [ ] `npm run build` проходит
- [ ] Визуально: нельзя угадать какой AI-агент писал какой компонент
