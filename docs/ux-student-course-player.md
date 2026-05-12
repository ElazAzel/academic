# Unified Student Course Player — UX Specification

## Purpose

Eliminate the fragmented student UX where the lesson page is a list of collapsible sections linking out to separate quiz and assignment pages. Replace with a unified course player where all learning — video, text, files, quizzes, assignments, curator questions, rating, and progress — happens inside a single course flow.

## Routes

| Route | Purpose | Priority |
|---|---|---|
| `/student/courses/[courseId]` | Course overview — hero card, module accordion, lesson cards | PR 2 |
| `/student/lessons/[lessonId]` | Lesson player — content blocks, quiz, assignment, navigation | PR 3 |

Secondary routes (aggregators, not primary flow):

| Route | Purpose | Fate |
|---|---|---|
| `/student/quizzes` | Quiz attempt history | Keep as aggregator |
| `/student/quizzes/[quizId]` | Standalone quiz | Keep but visually link to course context |
| `/student/quizzes/[quizId]/result` | Quiz result | Keep |
| `/student/assignments` | Assignment submissions list | Keep as aggregator |
| `/student/assignments/[assignmentId]` | Assignment detail | Keep but visually link to course context |
| `/student/modules/[moduleId]` | Module detail | ✅ Remove — merged into course page |
| `/student/my-courses` | My courses grid | Keep as launcher |

## Student dashboard (`/student`)

Primary block: **Продолжить обучение**

Shows:
- Course title, current module, current lesson
- Multi-level progress (course % + module %)
- Deadline if any
- Large CTA: "Продолжить" → `/student/courses/[courseId]` or directly to next lesson

Below:
- Active courses grid (max 4, with progress bars)
- Pending assignments count
- Quizzes to retake count
- Recent curator answers
- Upcoming deadlines
- Certificates available

## Student course page (`/student/courses/[courseId]`)

```
┌──────────────────────────────────────────────────────┐
│ ← Назад | Course title         [Hide completed] [☰] │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│ Course     │ Module 1 (завершён на 60%)              │
│ card       │ ┌─────────────────────────────────────┐ │
│ ┌────────┐ │ │ ✅ 1. Введение · 15 мин             │ │
│ │ cover  │ │ │ ▶ 2. Основные понятия · 20 мин    ← │ │
│ │        │ │ │ 🔒 3. Первый тест                    │ │
│ │  72%   │ │ └─────────────────────────────────────┘ │
│ │ 8/11   │ │                                         │
│ │ ур.    │ │ Module 2 (ещё не начат)                  │
│ │        │ │ ┌─────────────────────────────────────┐ │
│ │ [Серт] │ │ │ 🔒 4. Глубокое погружение · 25 мин  │ │
│ │        │ │ │ 🔒 5. Практика · 30 мин              │ │
│ │ Курат. │ │ └─────────────────────────────────────┘ │
│ │ [Зад.  │ │                                         │
│ │ вопрос]│ │                                         │
│ └────────┘ │                                         │
│            │                                         │
├────────────┴─────────────────────────────────────────┤
│ Footer: next lesson CTA                              │
└──────────────────────────────────────────────────────┘
```

### Left sticky course card

| Element | Source |
|---|---|
| Course cover image | `Course.coverUrl` |
| Course title | `Course.title` |
| Progress: "8/11 уроков" | Computed: completed required / total required |
| Progress bar | `CourseProgress.percent` |
| Certificate button | Enabled if `CourseProgress.percent >= completionThreshold` |
| Curator support | Assigned curator name, unanswered question count, CTA "Задать вопрос" |

### Right content — Module accordion

- Modules ordered by `Module.order`
- Each module header: number, title, progress bar (percent), deadline badge (if overdue → red), expand/collapse chevron
- Current module expanded by default, completed modules collapsed if "Hide completed" is on
- Inside module: lesson cards grid (or vertical list)

### Lesson card

```
┌──────────────────────────────────────────────┐
│ [🎬]  1. Введение             15 мин  ✅     │
│       Краткий обзор курса                    │
│       [Required] [Quiz: 5 вопросов]          │
│       ▶ Начать                              │
└──────────────────────────────────────────────┘
```

| Element | Source |
|---|---|
| Icon by type | `LessonType` → video, text, document, quiz, assignment, mixed |
| Lesson number | `Lesson.order` |
| Title | `Lesson.title` |
| Duration | `Lesson.durationMinutes` |
| Status badge | `LessonProgress.status`: NOT_STARTED / IN_PROGRESS / COMPLETED / BLOCKED |
| Required badge | If `Lesson.isRequired` |
| Quiz/assignment badges | If lesson has quizzes or assignments linked |
| Lock reason | If BLOCKED: "Сначала завершите предыдущий обязательный урок" |
| CTA | "Начать" / "Продолжить" / "Повторить" / 🔒 locked |

### States

| State | Behavior |
|---|---|
| Not enrolled | 403 page with "У вас нет доступа к этому курсу" |
| Enrollment paused | Banner: "Ваше обучение приостановлено" + resume CTA |
| Course empty | Empty state: "В этом курсе пока нет модулей" |
| All completed | Confetti effect (optional), certificate CTA prominently shown |
| No modules visible | If all hidden by "Hide completed" toggle, show "Все модули пройдены" |

## Student lesson player (`/student/lessons/[lessonId]`)

```
┌──────────────────────────────────────────────────────┐
│ ← Курс   Имя модуля   Название урока  [≡] [◀] [▶]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│              ┌────────────────────────┐              │
│              │   Video player / Text  │              │
│              │   / File content       │              │
│              │                        │              │
│              └────────────────────────┘              │
│                                                      │
│              ┌────────────────────────┐              │
│              │   Quiz block           │              │
│              │   (if embedded)        │              │
│              └────────────────────────┘              │
│                                                      │
│              ┌────────────────────────┐              │
│              │   Assignment block     │              │
│              │   (if embedded)        │              │
│              └────────────────────────┘              │
│                                                      │
│              [Оценить занятие] [Вопрос куратору]     │
│                                                      │
│              ◀ Предыдущий    ▶ Следующий урок       │
├──────────────────────────────────────────────────────┤
│ Right drawer (≡): Course contents tree              │
└──────────────────────────────────────────────────────┘
```

### Top bar

- Back button → `/student/courses/[courseId]` or `/student`
- Breadcrumbs: Course title / Module title
- Lesson title (truncated)
- Icons: Toggle contents drawer | Previous lesson | Next lesson

### Center content — Block renderer

The lesson renders blocks in order from `Lesson.content.blocks` JSON array. If blocks array is empty, falls back to existing `Lesson.content` format.

#### Video block

```typescript
{ type: "video", data: { videoUrl, thumbnail?, duration? } }
```

- Responsive 16:9 iframe (YouTube URLs normalized to embed)
- Below video: title, duration badge
- If no videoUrl: fallback to Lesson.videoUrl

#### Text block

```typescript
{ type: "text", data: { html } }
```

- Clean reading layout
- Max-width 720px centered
- Prose styling (headings, paragraphs, lists, callouts)

#### File block

```typescript
{ type: "file", data: { mediaId, title? } }
```

- Card with file icon, title, size, download button
- If media is PDF: inline preview (optional, if viewer available)
- Uses existing LessonMedia table

#### Quiz block

```typescript
{ type: "quiz", data: { quizId } }
```

- Renders `QuizBlock` component (see below)
- Quiz is embedded directly in lesson flow — no page navigation

#### Assignment block

```typescript
{ type: "assignment", data: { assignmentId } }
```

- Renders `AssignmentBlock` component (see below)
- Submit inline, no page navigation

#### Rating block

```typescript
{ type: "rating", data: {} }
```

- Emoji scale (😡 😐 😊 🤩) or 1-5 stars
- Optional comment textarea
- Submits via `POST /api/v1/lessons/[id]/rating` (new endpoint)
- Only shown after lesson content is completed

#### Curator question block

```typescript
{ type: "curator_question", data: { prompt? } }
```

- Shows existing questions and answers for this lesson
- "Задать вопрос" textarea + send button
- Uses existing `POST /api/v1/lessons/[id]/questions`

#### Completion block

```typescript
{ type: "completion", data: { mode: "manual" | "auto" } }
```

- If manual: "Отметить пройденным" button
- If auto: marked complete automatically when:
  - Video watched to X% (future)
  - Quiz passed
  - Assignment accepted
  - All above blocks completed

### Right drawer — Course contents

```
┌─────────────────────┐
│ Содержание курса    │
│                     │
│ Module 1 (60%)      │
│  ✅ 1. Введение     │
│  ▶ 2. Основное    ← │
│  🔒 3. Тест         │
│  📝 4. Задание      │
│                     │
│ Module 2 (0%)       │
│  🔒 5. Тема         │
│  🔒 6. Тема         │
│                     │
│ Всего: 6/11 уроков  │
└─────────────────────┘
```

- Opens from top bar ≡ button
- Slides in from right (300px width)
- Overlay backdrop
- Close on outside click or ✕ button
- Current lesson highlighted
- Completed lessons with ✅ icon
- Locked lessons with 🔒 icon and tooltip reason on hover
- Click unlocked lesson → navigate to it
- Progress per module shown

### Quiz block (embedded)

#### Before start

- Quiz title
- Question count
- Pass threshold badge
- Attempts remaining
- "Начать тест" button

#### During quiz

- Focused overlay within lesson (or full-page focused mode)
- Question numbers at top (1 2 3 4 5)
- Current question card:
  - Question text
  - Answer options
  - "Ответить" button
  - "Пропустить" button (if allowed)
- Progress: question X of Y

#### Result

- Score circle (large number + percent)
- Passed / Failed badge
- Brief explanation text
- CTAs:
  - "Продолжить урок" (if passed or no retries left)
  - "Посмотреть ответы"
  - "Повторить тест" (if attempts remaining)

#### Review answers

- List all questions
- Each shows: question, selected answer, correct answer, explanation
- Correct: green border ✅
- Incorrect: red border ❌

### Assignment block (embedded)

#### Before submission

- Assignment title
- Full instructions (rich text)
- Deadline badge (if any)
- Max attempts, max score info
- Answer textarea (if text type enabled)
- File upload (if file type enabled)
- "Отправить" button

#### After submission

- Status badge: Submitted / In Review / Accepted / Needs Revision / Rejected
- Submitted answer shown
- Score (if reviewed)
- Feedback from curator/instructor
- "Отправить на доработку" button (if needs revision and attempts remain)

## Navigation

### Student primary navigation (sidebar)

| Item | Route | Icon |
|---|---|---|
| Главная | `/student` | LayoutDashboard |
| Мои курсы | `/student/my-courses` | BookOpen |
| Уведомления | `/student/notifications` | Bell |
| Сертификаты | `/student/certificates` | ShieldCheck |
| Настройки | `/student/settings` | Settings |

### Student secondary navigation (optional footer links)

| Item | Route | Note |
|---|---|---|
| Задания | `/student/assignments` | Aggregator — each item links to lesson context |
| Тесты | `/student/quizzes` | Aggregator — each item links to lesson context |

### Breadcrumbs

Consistent pattern across all course/lesson pages:

```
Главная / Название курса / Название модуля
```

Each breadcrumb segment is a link except the current page.

## Data flow

### `server/modules/learning/service.ts` additions

```typescript
getStudentCoursePlayerDetail(
  courseId: string,
  userId: string
): Promise<StudentCoursePlayerDetail>

getStudentLessonPlayerDetail(
  lessonId: string,
  userId: string
): Promise<StudentLessonPlayerDetail>
```

### Types (`types/domain.ts`) additions

```typescript
interface StudentCoursePlayerDetail {
  course: CourseSummary;
  enrollment: EnrollmentStatus;
  progress: { completed: number; total: number; percent: number };
  modules: ModulePlayerDetail[];
  nextLessonId?: string;
  curator?: { name: string; unansweredCount: number };
  certificateEligible: boolean;
}

interface ModulePlayerDetail {
  id: string;
  order: number;
  title: string;
  progressPercent: number;
  lessons: LessonPlayerCard[];
  deadline?: { date: string; overdue: boolean };
}

interface LessonPlayerCard {
  id: string;
  order: number;
  title: string;
  type: LessonType;
  durationMinutes: number;
  isRequired: boolean;
  status: ProgressStatus;
  lockReason?: string;
  hasQuiz: boolean;
  hasAssignment: boolean;
  completionCta: "start" | "continue" | "repeat" | "locked";
}

interface StudentLessonPlayerDetail {
  lesson: LessonDetail;
  blocks: ContentBlock[];
  progress: { percent: number; status: ProgressStatus };
  prevLesson?: { id: string; title: string };
  nextLesson?: { id: string; title: string; locked: boolean; lockReason?: string };
}
```

## Progressive enhancement

PR 2 delivers:
- `/student/courses/[courseId]` redesign with sidebar + accordion + lesson cards
- No change to lesson player yet

PR 3 delivers:
- `/student/lessons/[lessonId]` redesign with player shell + blocks + drawer
- Quiz and assignment still link to separate pages (existing sections in lesson page)

PR 4 delivers:
- Quiz and assignment blocks embedded directly in lesson flow
- Separate quiz/assignment pages still work but are secondary

## Acceptance criteria

1. Student sees course page with hero card, module accordion, lesson cards
2. Student can expand/collapse modules
3. Student sees lesson status (completed/in-progress/locked)
4. Student sees lock reasons for blocked lessons
5. Completed modules can be hidden
6. Student opens lesson — sees video/text/files
7. Student opens contents drawer — sees full course tree
8. Student navigates prev/next lesson
9. Student takes quiz inside lesson (embedded or focused mode)
10. Student submits assignment inside lesson
11. Student asks curator question inside lesson
12. Student rates lesson
13. Student marks lesson complete
14. Progress updates on course page
15. Certificate CTA appears when eligible
