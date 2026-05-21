# Unified UX — Route Map

## Migration status legend

| Status | Meaning |
|---|---|
| ✅ Keep | Route stays as-is |
| 🆕 New | Route to be created |
| 🔄 Redesign | Route exists, needs UX rework |
| ❌ Remove | Route to be removed (merged into another) |
| 📎 Aggregate | Route stays but becomes secondary aggregator |

---

## Student routes

| Route | Status | PR | Notes |
|---|---|---|---|
| `/student` | 🔄 Redesign | PR 3 | Add "Продолжить обучение" hero block |
| `/student/my-courses` | ✅ Keep | — | Grid of enrolled courses |
| `/student/courses/[courseId]` | 🔄 Redesign | PR 2 | New sidebar + accordion + lesson cards |
| `/student/modules/[moduleId]` | ❌ Remove | PR 2 | Merged into course page |
| `/student/lessons/[lessonId]` | 🔄 Redesign | PR 3 | New block-based player + contents drawer |
| `/student/quizzes` | 📎 Aggregate | PR 6 | Link each item to lesson context |
| `/student/quizzes/[quizId]` | 🔄 Redesign | PR 4 | Focused mode but visually part of course |
| `/student/quizzes/[quizId]/result` | 🔄 Redesign | PR 4 | Continue course CTA prominent |
| `/student/assignments` | 📎 Aggregate | PR 6 | Link each item to lesson context |
| `/student/assignments/[assignmentId]` | 🔄 Redesign | PR 4 | Embedded in lesson flow |
| `/student/notifications` | ✅ Keep | — | No change planned |
| `/student/certificates` | ✅ Keep | — | No change planned |
| `/student/settings` | ✅ Keep | — | No change planned |

---

## Instructor routes

| Route | Status | PR | Notes |
|---|---|---|---|
| `/instructor` | ✅ Keep | — | Dashboard |
| `/instructor/courses` | 🔄 Redesign | PR 5 | Grid with "Открыть в builder" CTA prominence |
| `/instructor/courses/new` | ✅ Keep | — | Create course form |
| `/instructor/courses/[courseId]/edit` | ❌ Remove | PR 5 | Redirect to builder or keep as settings shortcut |
| `/instructor/courses/[courseId]/curriculum` | ❌ Remove | PR 5 | Merged into builder |
| `/instructor/lessons/[lessonId]/edit` | ❌ Remove | PR 5 | Merged into builder |
| `/instructor/modules/[moduleId]/edit` | ❌ Remove | PR 5 | Merged into builder |
| `/instructor/courses/[courseId]/builder` | 🆕 New | PR 5 | Main builder page |
| `/instructor/quizzes` | 📎 Aggregate | PR 6 | Archive — primary creation in builder |
| `/instructor/quizzes/[quizId]/edit` | 📎 Aggregate | PR 6 | Archive — can stay but builder is primary |
| `/instructor/assignments` | 📎 Aggregate | PR 6 | Archive |
| `/instructor/assignments/[assignmentId]/edit` | 📎 Aggregate | PR 6 | Archive |
| `/instructor/questions` | ✅ Keep | — | Forwarded questions from curators |
| `/instructor/reports` | ✅ Keep | — | No change planned |
| `/instructor/analytics` | ✅ Keep | — | No change planned |
| `/instructor/settings` | ✅ Keep | — | No change planned |

---

## Admin routes

| Route | Status | PR | Notes |
|---|---|---|---|
| `/admin` | ✅ Keep | — | Dashboard |
| `/admin/courses` | 🔄 Redesign | PR 5 | Grid with "Открыть в builder" CTA |
| `/admin/courses/[courseId]/builder` | 🆕 New | PR 5 | Same component as instructor builder |
| `/admin/users` | ✅ Keep | — | No change planned |
| `/admin/cohorts` | ✅ Keep | — | No change planned |
| `/admin/enrollments` | ✅ Keep | — | No change planned |
| `/admin/invites` | ✅ Keep | — | No change planned |
| `/admin/analytics` | ✅ Keep | — | Already has "По слушателям" tab |
| `/admin/reports` | ✅ Keep | — | No change planned |
| `/admin/audit` | ✅ Keep | — | No change planned |
| `/admin/roles` | ✅ Keep | — | No change planned |
| `/admin/settings` | ✅ Keep | — | No change planned |

---

## Curator routes

| Route | Status | PR | Notes |
|---|---|---|---|
| `/curator` | ✅ Keep | — | Dashboard |
| `/curator/students` | ✅ Keep | — | Student list |
| `/curator/questions` | ✅ Keep | — | Questions queue |
| `/curator/assignments` | ✅ Keep | — | Submissions review |
| `/curator/risks` | ✅ Keep | — | Risk list |
| `/curator/reports` | ✅ Keep | — | No change planned |
| `/curator/analytics` | ✅ Keep | — | Already has student analytics table |
| `/curator/settings` | ✅ Keep | — | No change planned |

---

## Super-curator routes

| Route | Status | PR | Notes |
|---|---|---|---|
| `/super-curator` | ✅ Keep | — | Dashboard |
| `/super-curator/curators` | ✅ Keep | — | Curator load |
| `/super-curator/questions` | ✅ Keep | — | Questions queue |
| `/super-curator/distribution` | ✅ Keep | — | Assignment management |
| `/super-curator/users` | ✅ Keep | — | Role management |
| `/super-curator/risks` | ✅ Keep | — | Aggregated risks |
| `/super-curator/reports` | ✅ Keep | — | No change planned |
| `/super-curator/analytics` | ✅ Keep | — | Already has student analytics table |
| `/super-curator/settings` | ✅ Keep | — | No change planned |

---

## Customer observer routes

| Route | Status | PR | Notes |
|---|---|---|---|
| `/customer-observer` | ✅ Keep | — | Dashboard |
| `/customer-observer/reports` | ✅ Keep | — | No change planned |
| `/customer-observer/certificates` | ✅ Keep | — | No change planned |
| `/customer-observer/settings` | ✅ Keep | — | No change planned |

---

## Component migration map

### New components to create

| Component | Route | PR |
|---|---|---|
| `course-builder-shell.tsx` | `/instructor/courses/[id]/builder` | PR 5 |
| `course-outline.tsx` | Used by builder | PR 5 |
| `course-settings-panel.tsx` | Used by builder | PR 5 |
| `module-editor.tsx` | Used by builder | PR 5 |
| `lesson-editor.tsx` | Used by builder | PR 5 |
| `lesson-block-editor.tsx` | Used by builder | PR 5 |
| `quiz-block-editor.tsx` | Used by builder | PR 5 |
| `assignment-block-editor.tsx` | Used by builder | PR 5 |
| `preview-as-student.tsx` | Used by builder | PR 5 |
| `course-hero-card.tsx` | `/student/courses/[id]` | PR 2 |
| `course-sidebar.tsx` | `/student/courses/[id]` | PR 2 |
| `module-accordion.tsx` | `/student/courses/[id]` | PR 2 |
| `lesson-card.tsx` | `/student/courses/[id]` | PR 2 |
| `lesson-player-shell.tsx` | `/student/lessons/[id]` | PR 3 |
| `course-contents-drawer.tsx` | `/student/lessons/[id]` | PR 3 |
| `video-block.tsx` | `/student/lessons/[id]` | PR 3 |
| `text-block.tsx` | `/student/lessons/[id]` | PR 3 |
| `file-block.tsx` | `/student/lessons/[id]` | PR 3 |
| `quiz-block.tsx` | `/student/lessons/[id]` | PR 4 |
| `assignment-block.tsx` | `/student/lessons/[id]` | PR 4 |
| `lesson-rating.tsx` | `/student/lessons/[id]` | PR 3 |
| `ask-curator-question.tsx` | `/student/lessons/[id]` | PR 3 |
| `lesson-navigation.tsx` | `/student/lessons/[id]` | PR 3 |

### Existing components to refactor

| Component | Change | PR |
|---|---|---|
| `student-lesson-view.tsx` | Replace with `lesson-player-shell.tsx` | PR 3 |
| `navigation.ts` | Update nav items per role | PR 6 |
| `dashboard-widgets.tsx` | Add continue learning hero block | PR 3 |

### Backend services

| Service | Action | PR |
|---|---|---|
| `server/modules/learning/service.ts` | Add `getStudentCoursePlayerDetail`, `getStudentLessonPlayerDetail` | PR 2-3 |
| `server/modules/course-builder/service.ts` | New service with all builder operations | PR 5 |

---

## PR dependency graph

```
PR 1 (docs, no code)
  │
  ├──► PR 2 (student course page)
  │       │
  │       └──► PR 3 (student lesson player)
  │               │
  │               └──► PR 4 (embed quiz + assignment)
  │
  └──► PR 5 (course builder)
          │
          └──► PR 6 (navigation cleanup)
                  │
                  └──► PR 7 (E2E smoke tests)
```

PRs 2-3-4 form the **student track** and can be done sequentially.
PR 5 is on the **builder track** and can be done in parallel with PR 2-3-4 after PR 1.
PR 6 depends on PR 5 (builder) and PR 4 (embedded quiz/assignment).
PR 7 depends on all previous PRs.
