# Unified Course Builder — UX Specification

## Purpose

Eliminate the fragmented instructor/admin UX where course settings, modules, lessons, quizzes, assignments, and materials are managed across separate pages. Replace with a single Course Builder where the entire course is composed as one tree.

## Routes

| Role | Route | Priority |
|---|---|---|
| Instructor | `/instructor/courses/[courseId]/builder` | PR 5 |
| Admin | `/admin/courses/[courseId]/builder` | PR 5 |

Old routes that remain but become secondary/redirect:

| Old route | Fate |
|---|---|
| `/instructor/courses/[courseId]/edit` | Keep as settings shortcut, may redirect to builder |
| `/instructor/courses/[courseId]/curriculum` | Remove — merged into builder |
| `/instructor/lessons/[lessonId]/edit` | Remove — merged into builder |
| `/instructor/modules/[moduleId]/edit` | Remove — merged into builder |
| `/instructor/quizzes/[quizId]/edit` | Keep as archive view; primary creation goes through builder |
| `/instructor/assignments/[assignmentId]/edit` | Keep as archive view; primary creation goes through builder |

## Layout

```
┌─────────────────────────────────────────────────────────┐
│ Top bar: Back | Course title | Status | Preview | Save │ Publish | ⋮ │
├──────────┬──────────────────────────────────┬───────────┤
│          │                                  │           │
│ Outline  │   Center editor                  │ Settings  │
│          │                                  │ panel     │
│ Course   │   (depends on selected node):    │           │
│ settings │   - Course: title, desc, cover   │ - status  │
│          │   - Module: title, order, days   │ - req     │
│ Module 1 │   - Lesson: title, type, blocks  │ - lock    │
│  L 1.1   │                                  │ - deadln  │
│  L 1.2   │                                  │ - attmpt  │
│  Q       │                                  │ - score   │
│  A       │                                  │ - cert    │
│ Module 2 │                                  │ - notif   │
│  L 2.1   │                                  │           │
│  L 2.2   │                                  │           │
│          │                                  │           │
├──────────┴──────────────────────────────────┴───────────┤
│ Footer: Last saved | Unsaved changes indicator         │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. `course-builder-shell.tsx`
- Top bar with course name, status badge, last saved timestamp
- Preview as student button (opens `/student/courses/[courseId]` in new tab)
- Save button (auto-save debounced 5s + manual save)
- Publish / Unpublish / Archive in More menu
- Three-column layout: outline | editor | settings
- Manages selected node state (course / module / lesson)
- Keyboard shortcuts: `Ctrl+S` save, `Escape` close settings

### 2. `course-outline.tsx`
- Recursive tree: `Course > Modules > Lessons`
- Each lesson shows type badges: `[V]` `[T]` `[F]` `[Q]` `[A]`
- Drag-and-drop reorder (modules, lessons)
- Add module button at bottom
- Collapse/expand module children
- Right-click context menu: duplicate, delete, move up/down
- Selected node highlighted

### 3. `course-settings-panel.tsx`
Right sidebar that shows context-sensitive settings:

**Course-level:**
- Status (Draft / Published / Archived)
- Traversal mode (Sequential / Open)
- Completion threshold (0-100%)
- Certificate settings (enable/disable, template)
- Visibility (visible to enrolled students only / hidden)

**Module-level:**
- Status (Draft / Published)
- Required recommended days
- Deadline rules per cohort
- Completion rule (all required lessons / any lesson)

**Lesson-level:**
- Required / Optional toggle
- Locking: always unlocked / unlocked after previous required completed / unlocked after date
- Quiz: pass threshold, max attempts, show correct answers
- Assignment: max attempts, max score, review required, allow revision
- Completion rule: manual / after quiz passed / after assignment accepted / mixed
- Certificate impact: counts toward completion / does not count

### 4. `module-editor.tsx`
- Title (text input)
- Description (rich text, compact)
- Recommended days (number)
- Order (number, auto-managed by drag-drop)
- Lessons list summary (count, required count, total duration)

### 5. `lesson-editor.tsx`
- Title (text input)
- Summary (textarea)
- Lesson type badge (auto-detected from blocks)
- Duration minutes (computed from video + estimated reading)
- Required / Optional toggle
- Thumbnail URL
- Block-based editor (see lesson-block-editor below)

### 6. `lesson-block-editor.tsx`
Block-based canvas. Each lesson is a vertical list of blocks that can be:

| Block type | Editor UI | Persistence |
|---|---|---|
| Video | URL input + thumbnail + duration | `Lesson.content.blocks[{type:"video",videoUrl,thumbnail,duration}]` |
| Text | Rich text (heading, paragraph, callout, list, quote) | `Lesson.content.blocks[{type:"text",html,format}]` |
| File | Media picker (from existing LessonMedia or new upload) | `Lesson.content.blocks[{type:"file",mediaId}]` |
| Quiz | Inline quiz builder or link to existing quiz | `Lesson.content.blocks[{type:"quiz",quizId}]` |
| Assignment | Inline assignment builder or link to existing | `Lesson.content.blocks[{type:"assignment",assignmentId}]` |
| Rating | Enabled/disabled toggle | `Lesson.content.blocks[{type:"rating"}]` |
| Curator question | Enabled/disabled + prompt text | `Lesson.content.blocks[{type:"curator_question",prompt}]` |
| Completion | Button label, auto-complete rule | `Lesson.content.blocks[{type:"completion",mode:"manual"|"auto"}]` |

Blocks can be:
- Added via "+" button between blocks
- Reordered via drag handle
- Deleted via "×" button
- Edited inline (click to expand)

### 7. `quiz-block-editor.tsx`
- Quiz title
- Questions list (reorderable)
- Each question:
  - Type: single_choice, multiple_choice, true_false, text
  - Prompt (rich text)
  - Options (for choice types)
  - Correct answer
  - Points (default 1)
  - Explanation (shown after quiz)
- Pass threshold (0-100%)
- Max attempts (1-10)
- Show correct answers toggle
- Shuffle questions toggle

### 8. `assignment-block-editor.tsx`
- Assignment title
- Instructions (rich text)
- Answer type: text / file / both
- Max attempts (1-10)
- Max score (1-1000)
- Review required toggle
- Allow revision toggle
- Deadline (optional, relative to enrollment start)

### 9. `preview-as-student.tsx`
- Opens `/student/courses/[courseId]` with preview flag
- Shows the course exactly as the student would see it
- Preview flag bypasses enrollment check for the author
- Close preview returns to builder

## Data persistence

### Lesson.content.blocks schema

```typescript
interface ContentBlock {
  id: string; // uuid
  type: "video" | "text" | "file" | "quiz" | "assignment" | "rating" | "curator_question" | "completion";
  data: Record<string, unknown>;
}

// Example
{
  "blocks": [
    { "id": "b1", "type": "text", "data": { "html": "<h2>Введение</h2><p>Текст урока...</p>" } },
    { "id": "b2", "type": "video", "data": { "videoUrl": "https://youtube.com/embed/...", "duration": 15 } },
    { "id": "b3", "type": "file", "data": { "mediaId": "media_xxx", "title": "Презентация.pdf" } },
    { "id": "b4", "type": "quiz", "data": { "quizId": "quiz_xxx" } },
    { "id": "b5", "type": "assignment", "data": { "assignmentId": "assign_xxx" } },
    { "id": "b6", "type": "rating", "data": {} },
    { "id": "b7", "type": "curator_question", "data": { "prompt": "Есть вопросы по этому уроку?" } },
    { "id": "b8", "type": "completion", "data": { "mode": "manual" } }
  ]
}
```

### Existing models preserved

- `Quiz`, `QuizQuestion`, `QuizAttempt` — unchanged
- `Assignment`, `AssignmentSubmission` — unchanged
- `LessonMedia` — unchanged
- `Lesson.content` JSON — extended with `blocks` array

New quizzes and assignments created via the builder create rows in the existing tables, linked to the lesson via `lessonId`.

## Backend service

New file: `server/modules/course-builder/service.ts`

Functions:

```typescript
// Fetch full course for builder
getCourseForBuilder(courseId: string, actorId: string): Promise<CourseBuilderDetail>

// Course-level
updateCourseSettings(courseId: string, input: CourseSettingsInput, actorId: string): Promise<void>

// Module CRUD
createModule(courseId: string, input: CreateModuleInput, actorId: string): Promise<Module>
updateModule(moduleId: string, input: UpdateModuleInput, actorId: string): Promise<void>
deleteModule(moduleId: string, actorId: string): Promise<void>
reorderModules(courseId: string, moduleIds: string[], actorId: string): Promise<void>

// Lesson CRUD  
createLesson(moduleId: string, input: CreateLessonInput, actorId: string): Promise<Lesson>
updateLesson(lessonId: string, input: UpdateLessonInput, actorId: string): Promise<void>
deleteLesson(lessonId: string, actorId: string): Promise<void>
reorderLessons(moduleId: string, lessonIds: string[], actorId: string): Promise<void>

// Blocks
updateLessonBlocks(lessonId: string, blocks: ContentBlock[], actorId: string): Promise<void>

// Quiz/Assignment inline creation
createQuizInline(lessonId: string, input: CreateQuizInput, actorId: string): Promise<Quiz>
createAssignmentInline(lessonId: string, input: CreateAssignmentInput, actorId: string): Promise<Assignment>
```

## Access control

| Action | Admin | Instructor |
|---|---|---|
| View any course builder | ✅ | Only assigned courses |
| Edit course settings | ✅ | Only assigned courses |
| Create/update/delete modules | ✅ | Only assigned courses |
| Create/update/delete lessons | ✅ | Only assigned courses |
| Create/update/delete quizzes | ✅ | Only assigned courses |
| Create/update/delete assignments | ✅ | Only assigned courses |
| Publish course | ✅ | If permission allows |
| Archive course | ✅ | ❌ |
| Preview as student | ✅ | Only assigned courses |

## Role-based capabilities in builder

- Admin: full access, can edit any course
- Instructor: scoped to `CourseInstructor` relationship
- If instructor tries to open builder for unassigned course → 403
- Preview as student uses `preview: true` flag in session check

## Validation gates

- `npm run typecheck` — no type errors
- `npm run lint -- --max-warnings=0` — no lint warnings
- `npm run test` — all 93+ tests pass
- `npm run build` — production build succeeds
- Role access verified for admin and instructor
- Preview as student shows correct lesson state
- Quiz/assignment creation creates rows in existing tables
- Lesson blocks can be saved and retrieved
