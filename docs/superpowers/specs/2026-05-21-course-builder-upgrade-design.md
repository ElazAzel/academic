# Course Builder Upgrade — Design Spec

**Date**: 2026-05-21
**Status**: Approved for implementation
**Areas**: Course Builder Outline, Quiz Builder, Lesson Content Editor

---

## 1. Course Builder — Outline & Navigation

### 1.1 Drag-and-drop module reorder

**Current**: Modules are reordered only by saving a snapshot with new order values. No drag feedback.

**Target**: Drag modules by their header in the outline tree. On drop, update local state + debounced API call to `PATCH /api/v1/courses/{courseId}/modules/reorder` with `{ moduleIds: [ordered ids] }`.

**Implementation**:
- Use native HTML5 drag (already used for blocks). Add `draggable` on module header.
- On drag over module header — show drop indicator line between modules.
- Track `dragModuleId` + `dropModuleIndex` in refs.
- Debounce reorder API call by 500ms (prevent rapid-fire on multiple drags).
- Update local `modules` array order immediately for responsive UX.

### 1.2 Clone module

**New API**: `POST /api/v1/modules/{id}/clone`

**Backend** (`server/modules/course-builder/service.ts`):
- Authorize: `assertInstructorOfCourse` via module's `courseId`
- Deep-clone: module → blocks → lessons (all with new UUIDs, same order/title/type/content)
- Do NOT clone quizzes/assignments (they reference courseId and lessonId — too coupled). Instead, clone lessons without quiz/assignment links.
- Log audit: `module.cloned`
- Return new `BuilderModuleDetail`

**Frontend** (`CourseOutline.tsx`):
- Add "Копировать" button in module header dropdown (or secondary click action)
- On clone success: insert new module after current in the modules array
- Select the new module

### 1.3 Inline rename

**Current**: Renaming requires selecting node → editing in central editor panel → saving.

**Target**: Double-click on module/block/lesson title in outline → inline `<input>` replaces the label. Blur or Enter commits via `PATCH /api/v1/modules/{id}`, `PATCH /api/v1/blocks/{id}`, `PATCH /api/v1/lessons/{id}`.

**Implementation**:
- Track `renaming: { type: "module" | "block" | "lesson", id: string } | null`
- On double-click: set renaming state, render `<input>` with current title, auto-focus
- On blur/Enter: call API, update local state, clear renaming
- On Escape: cancel rename (revert to original title)

### 1.4 Collapse all / Expand all

- Add buttons in the outline header area: "Свернуть всё" / "Развернуть всё"
- Uses same `collapsed` Set — either add all IDs or clear the Set

---

## 2. Quiz Builder — Question Editor

### 2.1 Auto-save questions

**Current**: `QuestionEditorItem` requires explicit "Сохранить вопрос" button. This causes data loss if user navigates away.

**Target**: Debounced auto-save (1.5s after last change). Same `PATCH /api/v1/quizzes/{quizId}/questions/{questionId}` endpoint.

**Implementation**:
- Remove the explicit save button from edit mode
- Add `useEffect` with `setTimeout(1.5s)` on `data` changes
- Track `isDirty` per question; skip API call if not dirty
- Show subtle "Сохранено" / "Ошибка сохранения" indicator per question
- On unmount: flush pending saves for dirty questions (synchronous fetch with `keepalive: true`)

### 2.2 Support TEXT (short answer) in inline QuizCreator

**Current**: `QuizCreator` only supports `single` / `multiple` question types.

**Target**: Add `text` option in type dropdown. When `text` is selected: hide options list, show "Правильный ответ" text input (same as `QuestionEditorItem`).

### 2.3 Question bank

**New UI**: Button "Из банка вопросов" in the quiz editor → opens a dialog listing all questions from all quizzes in the same course.

**Backend**: `GET /api/v1/courses/{courseId}/questions` — returns flat list of `{ id, prompt, type, points, quizTitle }`.

**Frontend**: Dialog with search, pagination (10 per page), checkbox selection, "Добавить выбранные (N)" button. On confirm: `POST /api/v1/quizzes/{quizId}/questions/import` with `{ questionIds: string[] }`.

**Backend import**: For each source question, create a clone in the target quiz with a new ID.

### 2.4 Collapsed preview & keyboard navigation

**Collapsed preview**: In the non-expanded question card, show:
- Question type icon + label
- Points badge
- Truncated prompt (1 line)
- Correct answer preview ("✓ Вариант 2" or "✓ Краткий ответ: ...")

**Keyboard navigation**:
- `Enter` on focused question → expand it
- `Escape` on expanded → collapse + save
- `Tab` between questions (when collapsed)
- `Shift+Tab` on first option of a question → collapse it

---

## 3. Lesson Content Editor — Content Blocks

### 3.1 WYSIWYG for text blocks

**New dependency**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`

**Implementation** (`components/lms/rich-text-editor.tsx` — new component):
- Wraps TipTap editor with M3-styled toolbar
- Toolbar: Bold, Italic, Heading (H3/H4), Bullet List, Ordered List, Link, Undo, Redo
- Output: HTML string stored in `block.data.html`
- Sanitization: `DOMPurify.sanitize(html)` on save (already `dompurify` in deps)
- Styling: consistent with M3 theme (font, spacing, colors)
- Replace `<textarea>` in `LessonBlockEditor`'s text block with this component

**Trade-off**: TipTap adds ~30KB gzip. Alternative: `contentEditable` + execCommand (less robust, inconsistent cross-browser). TipTap recommended.

### 3.2 Video preview

**In `LessonBlockEditor`**: When a video URL is entered in a video block, show a small embedded preview below the input.
- Detect YouTube/Vimeo from URL patterns
- Render `<iframe>` or thumbnail preview
- Show error state for invalid URLs

### 3.3 Media upload for file blocks

**Current**: File block has URL + filename text inputs.

**Target**: Add "Загрузить файл" button that opens native file picker, uploads via `POST /api/v1/media/uploads`, fills URL + filename automatically on success.

**Implementation**:
- Accept file types per `UPLOAD.ALLOWED_MIME_TYPES` (image, pdf, video, audio, zip)
- Show upload progress (or spinner for simplicity)
- On success: set `block.data.url` and `block.data.filename` from response
- On error: toast with error message

### 3.4 Upload course cover

**In `CourseBuilderShell.tsx`** (course settings section): Replace plain URL input for `coverUrl` with:
- File picker button "Загрузить обложку"
- Same upload flow as file blocks
- Preview thumbnail after upload
- "Удалить обложку" button to reset

### 3.5 Toggle edit/preview per block

**In `LessonBlockEditor`**: Each block gets a small toggle "Редактировать" / "Просмотр".

- Edit mode: current editor UI
- Preview mode: renders the block as the student would see it (using existing `video-block.tsx`, `text-block.tsx`, etc. display components)
- Default: edit mode
- Remember per-block state in local state (not persisted)

### 3.6 Rich text for assignment instructions

Replace the instructions textarea in `AssignmentBlockEditor` with the same TipTap WYSIWYG component.

---

## 4. New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/modules/{id}/clone` | Deep-clone module (without quiz/assignment links) |
| `PATCH` | `/api/v1/courses/{courseId}/modules/reorder` | Reorder modules by ordered ID list |
| `GET` | `/api/v1/courses/{courseId}/questions` | List all questions across course quizzes |
| `POST` | `/api/v1/quizzes/{quizId}/questions/import` | Clone questions into quiz from bank |
| `PATCH` | `/api/v1/modules/{id}` | Update module title (for inline rename) |
| `PATCH` | `/api/v1/blocks/{id}` | Update block title |
| `PATCH` | `/api/v1/lessons/{id}` | Update lesson title |

---

## 5. Testing

- **Unit tests** for clone module service
- **Unit tests** for question import service
- **Component tests** for auto-save behavior (mock fetch, verify debounced calls)
- **Component tests** for upload flow in LessonBlockEditor
- Manual: full flow test in preview environment

---

## 6. Files Changed / Created

**New files**:
- `components/lms/rich-text-editor.tsx` — TipTap WYSIWYG wrapper
- `app/api/v1/modules/[id]/clone/route.ts` — Clone module endpoint
- `app/api/v1/courses/[courseId]/modules/reorder/route.ts` — Module reorder
- `app/api/v1/courses/[courseId]/questions/route.ts` — Question bank
- `app/api/v1/quizzes/[quizId]/questions/import/route.ts` — Import questions
- `app/api/v1/modules/[id]/route.ts` — PATCH module (inline rename)

**Modified files**:
- `components/lms/course-outline.tsx` — Module drag, clone, inline rename, collapse all
- `components/lms/course-builder-shell.tsx` — Cover upload
- `components/lms/lesson-block-editor.tsx` — Rich text, video preview, file upload, toggle preview
- `components/lms/lesson-editor.tsx` — Pass upload handler
- `components/lms/quiz-creator.tsx` — TEXT type support
- `components/instructor/question-editor-item.tsx` — Auto-save
- `components/instructor/quiz-edit-form.tsx` — Question bank integration
- `components/lms/assignment-block-editor.tsx` — Rich text instructions
- `server/modules/course-builder/service.ts` — Clone module, reorder modules
- `server/modules/courses/service.ts` — Question list query
- `package.json` — Add @tiptap/react, @tiptap/starter-kit, @tiptap/extension-link
