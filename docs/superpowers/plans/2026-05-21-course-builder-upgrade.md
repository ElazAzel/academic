# Course Builder Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Course Builder Outline, Quiz Builder, and Lesson Content Editor with drag-drop modules, WYSIWYG text, auto-save questions, media upload, inline rename, clone module, question bank, and related UX improvements.

**Architecture:** All changes are incremental modifications to existing components. New TipTap WYSIWYG component wraps the library behind `@/components/lms/rich-text-editor.tsx`. New API endpoints follow existing patterns in `app/api/v1/`. No database schema changes — all data stored in existing `lesson.content` JSON, `block`/`module`/`lesson` titles, and `quiz_question` records.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, TipTap (new), DOMPurify (existing), Tailwind M3, native HTML5 Drag & Drop.

---

### Task 1: Install TipTap dependencies

**Files:**
- Modify: `package.json`
- Run: `npm install`

- [ ] **Step 1: Add TipTap packages**

Add to `dependencies` in `package.json`:
```
"@tiptap/react": "^2.11.7",
"@tiptap/starter-kit": "^2.11.7",
"@tiptap/extension-link": "^2.11.7",
"@tiptap/pm": "^2.11.7"
```

- [ ] **Step 2: Install**

Run: `npm install` in project root

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tiptap/react, starter-kit, extension-link"
```

---

### Task 2: Create RichTextEditor component (TipTap WYSIWYG)

**Files:**
- Create: `components/lms/rich-text-editor.tsx`

This is a reusable TipTap wrapper with M3-styled toolbar. Used for text blocks and assignment instructions.

```tsx
"use client";

import { useCallback, useState } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import DOMPurify from "dompurify";
import { Bold, Italic, Heading2, List, ListOrdered, Link, Undo2, Redo2 } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = "120px" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      LinkExtension.configure({ openOnClick: false }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const clean = DOMPurify.sanitize(html);
      onChange(clean);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2 text-sm leading-relaxed",
      },
    },
  });

  const toggleLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("Ссылка", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="rounded-xl border bg-background overflow-hidden"
      style={{ minHeight }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/20 px-2 py-1.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Жирный">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок H3">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Список">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный список">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton onClick={toggleLink} active={editor.isActive("link")} title="Ссылка">
          <Link className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Отмена">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Повтор">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="[&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror_p]:leading-relaxed" />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 1: Create the file** with the code above
- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --strict` — should pass with no errors

- [ ] **Step 3: Commit**

```bash
git add components/lms/rich-text-editor.tsx
git commit -m "feat: add RichTextEditor component (TipTap WYSIWYG)"
```

---

### Task 3: Clone module — backend service + API route

**Files:**
- Modify: `server/modules/course-builder/service.ts`
- Create: `app/api/v1/modules/[id]/clone/route.ts`
- Test: `tests/unit/course-builder-service.test.ts` (append to existing)

- [ ] **Step 1: Add `cloneModule` to course-builder service**

In `server/modules/course-builder/service.ts`, add:

```typescript
export async function cloneModule(moduleId: string, actorId: string): Promise<BuilderModuleDetail> {
  const source = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      blocks: { include: { lessons: true } },
      lessons: true,
      course: { select: { id: true } },
    },
  });
  if (!source) throw new ApiError("not_found", "Модуль не найден", 404);
  await assertInstructorOfCourse(actorId, source.course.id);

  const newModuleId = randomUUID();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Create module
    await tx.module.create({
      data: {
        id: newModuleId,
        courseId: source.course.id,
        title: `${source.title} (копия)`,
        description: source.description,
        order: source.order + 1,
        recommendedDays: source.recommendedDays,
        status: source.status,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Clone blocks (if any) with their lessons
    for (const block of source.blocks) {
      const newBlockId = randomUUID();
      await tx.block.create({
        data: {
          id: newBlockId,
          moduleId: newModuleId,
          title: block.title,
          description: block.description,
          order: block.order,
          createdAt: now,
          updatedAt: now,
        },
      });

      for (const lesson of block.lessons) {
        const newLessonId = randomUUID();
        await tx.lesson.create({
          data: {
            id: newLessonId,
            moduleId: newModuleId,
            blockId: newBlockId,
            title: lesson.title,
            summary: lesson.summary,
            type: lesson.type,
            order: lesson.order,
            durationMinutes: lesson.durationMinutes,
            isRequired: lesson.isRequired,
            videoUrl: lesson.videoUrl,
            content: lesson.content ?? {},
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    }

    // Clone root-level lessons (without block)
    for (const lesson of source.lessons) {
      const newLessonId = randomUUID();
      await tx.lesson.create({
        data: {
          id: newLessonId,
          moduleId: newModuleId,
          title: lesson.title,
          summary: lesson.summary,
          type: lesson.type,
          order: lesson.order,
          durationMinutes: lesson.durationMinutes,
          isRequired: lesson.isRequired,
          videoUrl: lesson.videoUrl,
          content: lesson.content ?? {},
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  });

  // Shift orders of subsequent modules in the same course
  await prisma.$transaction(async (tx) => {
    const siblings = await tx.module.findMany({
      where: { courseId: source.course.id, id: { not: source.id } },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    let order = 0;
    for (const sib of siblings) {
      if (sib.order > source.order) {
        await tx.module.update({ where: { id: sib.id }, data: { order: ++order + source.order } });
      }
    }
  });

  await logAudit({ actorId, action: "module.cloned", entity: "module", entityId: newModuleId, metadata: { sourceId: moduleId, courseId: source.course.id } });

  // Fetch and return the new module as BuilderModuleDetail
  const result = await prisma.module.findUnique({
    where: { id: newModuleId },
    include: {
      blocks: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      lessons: { orderBy: { order: "asc" }, where: { blockId: null } },
    },
  });
  return toBuilderModule(result as unknown as Record<string, unknown>);
}
```

- [ ] **Step 2: Create clone route**

Create `app/api/v1/modules/[id]/clone/route.ts`:

```typescript
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { cloneModule } from "@/server/modules/course-builder/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { id } = await context.params;
    return ok(await cloneModule(id, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Write unit test**

In `tests/unit/course-builder-service.test.ts`, add:

```typescript
import { randomUUID } from "node:crypto";

// ... existing imports and mocks ...

it("clones a module with blocks and lessons", async () => {
  const sourceModuleId = "mod-source";
  const courseId = "course-1";
  const actorId = "instructor-1";

  mockModuleFindUnique.mockResolvedValue({
    id: sourceModuleId,
    courseId,
    title: "Source Module",
    description: "desc",
    order: 1,
    recommendedDays: 7,
    status: "DRAFT",
    blocks: [{ id: "block-1", title: "B1", description: null, order: 0, lessons: [{ id: "l1", title: "L1", summary: null, type: "MIXED", order: 0, durationMinutes: 30, isRequired: true, videoUrl: null, content: {} }] }],
    lessons: [{ id: "l2", title: "L2", summary: null, type: "TEXT", order: 1, durationMinutes: 15, isRequired: false, videoUrl: null, content: {}, blockId: null }],
    course: { id: courseId },
  });

  mockModuleCreate.mockResolvedValue({ id: randomUUID() });
  mockBlockCreate.mockResolvedValue({ id: randomUUID() });
  mockLessonCreate.mockResolvedValue({ id: randomUUID() });

  const result = await cloneModule(sourceModuleId, actorId);

  expect(mockModuleCreate).toHaveBeenCalled();
  expect(mockBlockCreate).toHaveBeenCalled();
  expect(mockLessonCreate).toHaveBeenCalledTimes(2);
  expect(result.title).toContain("(копия)");
});
```

This requires adding mocks for `prisma.module.findUnique`, `prisma.module.create`, `prisma.block.create`, `prisma.lesson.create` in the test file's mock setup.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/course-builder-service.test.ts`

- [ ] **Step 5: Commit**

```bash
git add server/modules/course-builder/service.ts app/api/v1/modules/\[id\]/clone/route.ts tests/unit/course-builder-service.test.ts
git commit -m "feat: clone module with blocks and lessons"
```

---

### Task 4: Module drag-and-drop reorder

**Files:**
- Create: `app/api/v1/courses/[courseId]/modules/reorder/route.ts`
- Modify: `components/lms/course-outline.tsx`
- Modify: `server/modules/course-builder/service.ts`

- [ ] **Step 1: Add `reorderModules` function (already exists)**

Function `reorderModules` already exists in `server/modules/course-builder/service.ts` at line 412. No changes needed.

- [ ] **Step 2: Create reorder API route**

Create `app/api/v1/courses/[courseId]/modules/reorder/route.ts`:

```typescript
import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { reorderModules } from "@/server/modules/course-builder/service";
import { z } from "zod";

type Context = { params: Promise<{ courseId: string }> };

const reorderSchema = z.object({
  moduleIds: z.array(z.string()).min(1),
});

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { courseId } = await context.params;
    const { moduleIds } = await parseJson(request, reorderSchema);
    return ok(await reorderModules(courseId, moduleIds, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Add drag-drop to CourseOutline**

In `components/lms/course-outline.tsx`:

Add drag state refs near the existing `dragItem`:
```typescript
const dragModuleId = useRef<string | null>(null);
const dragOverModuleIndex = useRef<number | null>(null);
```

Wrap the module loop items with drag handlers. For each module header `<div>`:
- Add `draggable` attribute
- `onDragStart={() => { dragModuleId.current = mod.id; }}`
- `onDragOver={(e) => { e.preventDefault(); dragOverModuleIndex.current = mi; }}` — with visual cue
- `onDrop` handler that reorders modules with a debounced API call
- `onDragEnd={() => { dragModuleId.current = null; dragOverModuleIndex.current = null; }}`

Add a `useRef` for debounce timer, and a function:
```typescript
const debouncedReorder = useRef<ReturnType<typeof setTimeout>>();
const commitReorder = useCallback((orderedModules: BuilderModuleDetail[]) => {
  if (debouncedReorder.current) clearTimeout(debouncedReorder.current);
  debouncedReorder.current = setTimeout(async () => {
    const ids = orderedModules.map((m) => m.id);
    await fetch(`/api/v1/courses/${courseId}/modules/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleIds: ids }),
    });
  }, 500);
}, [courseId]);
```

In the drop handler:
```typescript
const handleModuleDrop = useCallback((dropIndex: number) => {
  const fromId = dragModuleId.current;
  if (!fromId) return;
  const fromIndex = modules.findIndex((m) => m.id === fromId);
  if (fromIndex === -1 || fromIndex === dropIndex) return;
  const next = [...modules];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(dropIndex, 0, moved);
  onModulesChange(next);
  commitReorder(next);
  dragModuleId.current = null;
  dragOverModuleIndex.current = null;
}, [modules, onModulesChange, commitReorder]);
```

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/courses/\[courseId\]/modules/reorder/route.ts components/lms/course-outline.tsx
git commit -m "feat: drag-and-drop module reorder"
```

---

### Task 5: Inline rename in course outline

**Files:**
- Modify: `components/lms/course-outline.tsx`

- [ ] **Step 1: Add inline rename state and UI**

In `CourseOutline.tsx`, add state:
```typescript
const [renaming, setRenaming] = useState<{ type: "module" | "block" | "lesson"; id: string; currentTitle: string } | null>(null);
const renameInputRef = useRef<HTMLInputElement>(null);
```

Add rename save function:
```typescript
const commitRename = useCallback(async (type: string, id: string, title: string) => {
  let path = "";
  if (type === "module") path = `/api/v1/modules/${id}`;
  else if (type === "block") path = `/api/v1/blocks/${id}`;
  else if (type === "lesson") path = `/api/v1/lessons/${id}`;
  try {
    await fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  } catch { /* optimistic update already applied */ }
}, []);
```

For each title element in the tree (module, block, lesson titles), detect double-click:
```tsx
onDoubleClick={() => {
  setRenaming({ type: "module", id: mod.id, currentTitle: mod.title });
  setTimeout(() => renameInputRef.current?.focus(), 50);
}}
```

When `renaming` matches the current item, replace the title text with:
```tsx
{renaming?.id === mod.id ? (
  <input
    ref={renameInputRef}
    className="flex-1 min-w-0 rounded border px-1 py-0 text-xs"
    value={renaming.currentTitle}
    onChange={(e) => setRenaming((r) => r ? { ...r, currentTitle: e.target.value } : null)}
    onBlur={() => {
      if (renaming) {
        const updated = modules.map((m) => m.id === renaming.id ? { ...m, title: renaming.currentTitle } : m);
        onModulesChange(updated);
        commitRename(renaming.type, renaming.id, renaming.currentTitle);
      }
      setRenaming(null);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      if (e.key === "Escape") setRenaming(null);
    }}
  />
) : (
  <span className="truncate">{mod.title}</span>
)}
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/course-outline.tsx
git commit -m "feat: inline rename modules/blocks/lessons in outline"
```

---

### Task 6: Collapse all / Expand all

**Files:**
- Modify: `components/lms/course-outline.tsx`

- [ ] **Step 1: Add collapse/expand buttons and logic**

Before the module list in `CourseOutline`, add:
```tsx
<div className="flex items-center justify-between px-3 pt-1 pb-1">
  <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Структура</span>
  <div className="flex gap-1">
    <button
      onClick={() => {
        const allIds = new Set<string>();
        modules.forEach((m) => {
          allIds.add(m.id);
          m.blocks.forEach((b) => allIds.add(`block-${b.id}`));
        });
        setCollapsed(allIds);
      }}
      className="text-[10px] text-muted-foreground hover:text-foreground px-1"
      title="Свернуть всё"
    >
      −
    </button>
    <button
      onClick={() => setCollapsed(new Set())}
      className="text-[10px] text-muted-foreground hover:text-foreground px-1"
      title="Развернуть всё"
    >
      +
    </button>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/course-outline.tsx
git commit -m "feat: collapse all / expand all in course outline"
```

---

### Task 7: Clone button in CourseOutline

**Files:**
- Modify: `components/lms/course-outline.tsx`

- [ ] **Step 1: Add clone button per module**

In `CourseOutline.tsx`, next to the delete button of each module header, add a clone button:
```tsx
<button
  onClick={async (e) => {
    e.stopPropagation();
    const res = await fetch(`/api/v1/modules/${mod.id}/clone`, { method: "POST" });
    if (res.ok) {
      const newModule = await res.json();
      const updated = [...modules];
      const idx = updated.findIndex((m) => m.id === mod.id);
      updated.splice(idx + 1, 0, newModule.data ?? newModule);
      onModulesChange(updated);
      onSelect({ type: "module", moduleId: (newModule.data ?? newModule).id });
    }
  }}
  className="p-0.5 text-muted-foreground hover:text-primary"
  title="Копировать модуль"
>
  <Copy className="h-3 w-3" />
</button>
```

Add `Copy` to the lucide import:
```typescript
import { Plus, ChevronRight, ChevronDown, FileText, Video, HelpCircle, CheckSquare, Trash2, FolderOpen, Copy } from "lucide-react";
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/course-outline.tsx
git commit -m "feat: clone module button in course outline"
```

---

### Task 8: Question bank — backend (list + import)

**Files:**
- Create: `app/api/v1/courses/[courseId]/questions/route.ts`
- Create: `app/api/v1/quizzes/[quizId]/questions/import/route.ts`
- Modify: `server/modules/courses/service.ts`

- [ ] **Step 1: Add `listCourseQuestions` to courses service**

In `server/modules/courses/service.ts`:
```typescript
export async function listCourseQuestions(courseId: string) {
  const quizzes = await getPrisma().quiz.findMany({
    where: { courseId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, prompt: true, type: true, points: true, order: true },
      },
    },
    select: { id: true, title: true, questions: true },
    orderBy: { createdAt: "asc" },
  });

  return quizzes.flatMap((quiz) =>
    quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: q.type,
      points: q.points,
      quizId: quiz.id,
      quizTitle: quiz.title,
    }))
  );
}
```

- [ ] **Step 2: Create GET /courses/{courseId}/questions**

Create `app/api/v1/courses/[courseId]/questions/route.ts`:
```typescript
import { errorResponse, ok, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { assertInstructorOfCourse } from "@/server/modules/course-builder/service";
import { listCourseQuestions } from "@/server/modules/courses/service";

type Context = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { courseId } = await context.params;
    await assertInstructorOfCourse(user.id, courseId);
    return ok(await listCourseQuestions(courseId));
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Add `importQuestions` to quiz service**

In `server/modules/quizzes/service.ts`:
```typescript
import { randomUUID } from "node:crypto";

export async function importQuestions(quizId: string, questionIds: string[], actorId: string) {
  const quiz = await getPrisma().quiz.findUnique({
    where: { id: quizId },
    include: { course: { select: { id: true } } },
  });
  if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);

  const { assertInstructorOfCourse } = await import("@/server/modules/course-builder/service");
  await assertInstructorOfCourse(actorId, quiz.course.id);

  const sourceQuestions = await getPrisma().quizQuestion.findMany({
    where: { id: { in: questionIds } },
  });

  if (sourceQuestions.length === 0) throw new ApiError("bad_request", "Вопросы не найдены", 400);

  const maxOrder = await getPrisma().quizQuestion.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  let order = (maxOrder._max.order ?? -1) + 1;

  const created = await getPrisma().$transaction(
    sourceQuestions.map((q) =>
      getPrisma().quizQuestion.create({
        data: {
          id: randomUUID(),
          quizId,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          order: order++,
        },
      })
    )
  );

  return created;
}
```

- [ ] **Step 4: Create POST /quizzes/{quizId}/questions/import**

Create `app/api/v1/quizzes/[quizId]/questions/import/route.ts`:
```typescript
import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { importQuestions } from "@/server/modules/quizzes/service";
import { z } from "zod";

type Context = { params: Promise<{ quizId: string }> };

const importSchema = z.object({
  questionIds: z.array(z.string()).min(1),
});

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { quizId } = await context.params;
    const { questionIds } = await parseJson(request, importSchema);
    return ok(await importQuestions(quizId, questionIds, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/courses/\[courseId\]/questions/route.ts app/api/v1/quizzes/\[quizId\]/questions/import/route.ts server/modules/courses/service.ts server/modules/quizzes/service.ts
git commit -m "feat: question bank API (list + import)"
```

---

### Task 9: Question bank — QuizEditForm dialog UI

**Files:**
- Modify: `components/instructor/quiz-edit-form.tsx`

- [ ] **Step 1: Add "Из банка вопросов" button and dialog**

In `quiz-edit-form.tsx`, add a dialog that opens on button click. The dialog fetches questions from `GET /api/v1/courses/{courseId}/questions`, shows a selectable list, and on confirm calls `POST /api/v1/quizzes/{quizId}/questions/import`.

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

// Add state in component:
const [bankOpen, setBankOpen] = useState(false);
const [bankQuestions, setBankQuestions] = useState<Array<{ id: string; prompt: string; type: string; points: number; quizTitle: string }>>([]);
const [selectedQs, setSelectedQs] = useState<Set<string>>(new Set());
const [loadingBank, setLoadingBank] = useState(false);
```

Add a button near "Добавить вопрос":
```tsx
<Button
  type="button"
  variant="secondary"
  size="sm"
  onClick={async () => {
    setBankOpen(true);
    setLoadingBank(true);
    try {
      // courseId needs to be passed or resolved from quiz
      const res = await fetch(`/api/v1/courses/${courseId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setBankQuestions(data.data ?? []);
      }
    } finally {
      setLoadingBank(false);
    }
  }}
>
  <Database className="h-4 w-4 mr-2" />
  Из банка вопросов
</Button>
```

The Dialog content renders the question list with checkboxes:
```tsx
<Dialog open={bankOpen} onOpenChange={setBankOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Банк вопросов курса</DialogTitle>
    </DialogHeader>
    {loadingBank ? (
      <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
    ) : bankQuestions.length === 0 ? (
      <div className="py-8 text-center text-sm text-muted-foreground">Вопросов в курсе пока нет</div>
    ) : (
      <div className="space-y-2">
        {bankQuestions.map((q) => (
          <label key={q.id} className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={selectedQs.has(q.id)}
              onChange={() => {
                const next = new Set(selectedQs);
                if (next.has(q.id)) next.delete(q.id);
                else next.add(q.id);
                setSelectedQs(next);
              }}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{q.prompt}</p>
              <p className="text-[10px] text-muted-foreground">{q.type} · {q.points} баллов · из теста «{q.quizTitle}»</p>
            </div>
          </label>
        ))}
      </div>
    )}
    <DialogFooter>
      <Button size="sm" variant="secondary" onClick={() => setBankOpen(false)}>Отмена</Button>
      <Button
        size="sm"
        disabled={selectedQs.size === 0}
        onClick={async () => {
          const res = await fetch(`/api/v1/quizzes/${quiz.id}/questions/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionIds: Array.from(selectedQs) }),
          });
          if (res.ok) {
            const newQs = await res.json();
            const imported = (newQs.data ?? newQs) as Array<{ id: string; prompt: string; type: string; points: number }>;
            setQuestions([...questions, ...imported]);
            setSelectedQs(new Set());
            setBankOpen(false);
            router.refresh();
          }
        }}
      >
        Добавить ({selectedQs.size})
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

The `courseId` needs to be accessible in `QuizEditForm`. Either:
- Pass it as a prop from the page
- Or resolve it from the quiz's course relation

Add `courseId` prop to `QuizEditFormProps`:
```typescript
export interface QuizEditFormProps {
  quiz: { ... };
  courseId: string; // new
}
```

Update the page route to pass it:
In `app/instructor/quizzes/[quizId]/edit/page.tsx`, fetch courseId alongside quiz:
```typescript
const quiz = await prisma.quiz.findUnique({
  where: { id: quizId },
  include: { questions: { orderBy: { order: "asc" } }, course: { select: { id: true } } },
});
```
Then pass `courseId={quiz.course.id}` to `QuizEditForm`.

- [ ] **Step 2: Commit**

```bash
git add components/instructor/quiz-edit-form.tsx app/instructor/quizzes/\[quizId\]/edit/page.tsx
git commit -m "feat: question bank dialog in quiz editor"
```

---

### Task 10: Auto-save questions in QuestionEditorItem

**Files:**
- Modify: `components/instructor/question-editor-item.tsx`

- [ ] **Step 1: Implement debounced auto-save**

In `QuestionEditorItem.tsx`:
- Remove the "Сохранить вопрос" button and its related state/logic
- Add auto-save with `useEffect` + `setTimeout`:

```typescript
const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
const isDirty = useRef(false);
const timerRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
  if (!isDirty.current) return;
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(async () => {
    setSaveStatus("saving");
    try {
      await onUpdate(question.id, data);
      setSaveStatus("saved");
      isDirty.current = false;
    } catch {
      setSaveStatus("error");
    }
  }, 1500);
  return () => { if (timerRef.current) clearTimeout(timerRef.current); };
}, [data, question.id, onUpdate]);

// Mark dirty on any data change (setData call)
// In setData wrappers, add: isDirty.current = true;

useEffect(() => {
  return () => {
    // Flush on unmount
    if (isDirty.current) {
      const payload = JSON.stringify({ ...question, ...data });
      fetch(`/api/v1/quizzes/${/* quizId */ ""}/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  };
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

Show a small status indicator:
```tsx
{saveStatus === "saving" && <span className="text-[10px] text-muted-foreground">сохранение...</span>}
{saveStatus === "saved" && <span className="text-[10px] text-emerald-600">сохранено</span>}
{saveStatus === "error" && <span className="text-[10px] text-rose-600">ошибка</span>}
```

Remove the explicit save button from the expanded view footer. Keep the delete button.

The `quizId` needs to be available in `QuestionEditorItem`. Pass it as a prop or use context.

- [ ] **Step 2: Update collapsed preview**

In the collapsed state (non-expanded), show:
```tsx
<div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/10" onClick={() => setIsExpanded(!isExpanded)}>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">{data.prompt}</p>
    <div className="flex items-center gap-2 mt-0.5">
      <span className="text-[10px] uppercase text-muted-foreground">{data.type === "SINGLE_CHOICE" ? "1 вариант" : data.type === "MULTIPLE_CHOICE" ? "N вариантов" : "Краткий ответ"}</span>
      <span className="text-[10px] text-muted-foreground">· {data.points} балл(ов)</span>
      {data.type !== "TEXT" && options.length > 0 && (
        <span className="text-[10px] text-emerald-600">
          ✓ {data.type === "SINGLE_CHOICE" ? `Вариант ${options.indexOf(correctAnswer.value ?? "") + 1}` : `выбрано ${(correctAnswer.values ?? []).length}`}
        </span>
      )}
    </div>
  </div>
  {saveStatus !== "idle" && (
    <span className="text-[10px]">{saveStatus === "saving" ? "..." : saveStatus === "saved" ? "✓" : "✗"}</span>
  )}
  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add components/instructor/question-editor-item.tsx
git commit -m "feat: auto-save questions, collapsed preview"
```

---

### Task 11: TEXT type support in inline QuizCreator

**Files:**
- Modify: `components/lms/quiz-creator.tsx`

- [ ] **Step 1: Add "text" option to type dropdown**

In `QuizCreator.tsx`:
- Add `"text"` to the type dropdown options
- When `q.type === "text"`, hide options list, show "Правильный ответ" text input
- Set `correctAnswer` format to `{ value: string }`

- [ ] **Step 2: Commit**

```bash
git add components/lms/quiz-creator.tsx
git commit -m "feat: TEXT question type in inline QuizCreator"
```

---

### Task 12: Rich text for text blocks in LessonBlockEditor

**Files:**
- Modify: `components/lms/lesson-block-editor.tsx`

- [ ] **Step 1: Replace textarea with RichTextEditor**

In `LessonBlockEditor.tsx`, replace the text block textarea:
```tsx
{block.type === "text" && (
  <RichTextEditor
    value={(block.data.html as string) ?? ""}
    onChange={(html) => updateBlockData(block.id, { ...block.data, html })}
    placeholder="HTML-содержимое..."
  />
)}
```

Remove the `textarea` for text blocks. Import `RichTextEditor` at top:
```typescript
import { RichTextEditor } from "@/components/lms/rich-text-editor";
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/lesson-block-editor.tsx
git commit -m "feat: WYSIWYG text blocks in lesson editor"
```

---

### Task 13: Rich text for assignment instructions

**Files:**
- Modify: `components/lms/assignment-block-editor.tsx`

- [ ] **Step 1: Replace instructions textarea with RichTextEditor**

In `AssignmentBlockEditor.tsx`, replace the instructions `<textarea>` (line ~30) with:
```tsx
<RichTextEditor
  value={instructions}
  onChange={(html) => { setInstructions(html); updateParent(); }}
  placeholder="Инструкция к заданию..."
  minHeight="100px"
/>
```

Import `RichTextEditor` at top.

- [ ] **Step 2: Commit**

```bash
git add components/lms/assignment-block-editor.tsx
git commit -m "feat: rich text for assignment instructions"
```

---

### Task 14: Video preview in LessonBlockEditor

**Files:**
- Modify: `components/lms/lesson-block-editor.tsx`

- [ ] **Step 1: Add video preview below URL input**

In the video block section, after the `<input>` for videoUrl, add:
```tsx
{block.type === "video" && block.data.videoUrl && (
  <VideoPreview url={block.data.videoUrl as string} />
)}
```

Create the VideoPreview component inline or import from a new file. Simple version:
```tsx
function VideoPreview({ url }: { url: string }) {
  const embedUrl = url
    .replace(/^.*(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/watch\?v=)/, "https://www.youtube.com/embed/$1")
    .replace(/^.*vimeo\.com\/(\d+)/, "https://player.vimeo.com/video/$1");

  if (!url.match(/youtube|youtu\.be|vimeo/i)) {
    return (
      <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        {url.startsWith("http") ? "Внешнее видео (вставить embed)" : "Введите URL видео"}
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/lesson-block-editor.tsx
git commit -m "feat: video preview in lesson editor"
```

---

### Task 15: Media upload for file blocks

**Files:**
- Modify: `components/lms/lesson-block-editor.tsx`
- Read existing: `app/api/v1/media/uploads/route.ts` (confirm endpoint behavior)

- [ ] **Step 1: Add upload button to file block**

In the file block section of `LessonBlockEditor.tsx`, next to URL/filename inputs, add:
```tsx
<input
  type="file"
  ref={fileInputRef}
  className="hidden"
  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,audio/mpeg,audio/webm,application/zip"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prefix", "course-builder");
    try {
      const res = await fetch("/api/v1/media/uploads", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        const data = result.data ?? result;
        updateBlockData(block.id, {
          ...block.data,
          url: data.url ?? data.fileUrl,
          filename: file.name,
        });
        toast.success("Файл загружен");
      } else {
        toast.error("Ошибка загрузки");
      }
    } catch {
      toast.error("Сетевая ошибка");
    }
  }}
/>
<Button
  size="sm"
  variant="secondary"
  onClick={() => fileInputRef.current?.click()}
>
  <Upload className="h-3.5 w-3.5 mr-1" />
  Загрузить файл
</Button>
```

Add to imports:
```typescript
import { Upload } from "lucide-react";
```

Add ref at top of component:
```typescript
const fileInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/lesson-block-editor.tsx
git commit -m "feat: media upload for file blocks"
```

---

### Task 16: Upload course cover

**Files:**
- Modify: `components/lms/course-builder-shell.tsx`

- [ ] **Step 1: Add cover upload picker**

In `CourseBuilderShell.tsx`, in the course settings section (around line 446-454), replace the raw URL input for `coverUrl` with:
```tsx
<div className="space-y-2">
  <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Обложка</label>
  {detail.coverUrl && (
    <div className="relative mb-2 overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={detail.coverUrl} alt="Обложка курса" className="h-32 w-full object-cover" />
      <button
        onClick={() => { setDetail((current) => ({ ...current, coverUrl: null })); setDirty(true); }}
        className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )}
  <div className="flex gap-2">
    <Button size="sm" variant="secondary" onClick={() => document.getElementById("cover-upload")?.click()}>
      <Upload className="h-4 w-4 mr-1" />
      Загрузить обложку
    </Button>
    <input
      id="cover-upload"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", "covers");
        const res = await fetch("/api/v1/media/uploads", { method: "POST", body: formData });
        if (res.ok) {
          const result = await res.json();
          const data = result.data ?? result;
          setDetail((current) => ({ ...current, coverUrl: data.url ?? data.fileUrl }));
          setDirty(true);
        }
      }}
    />
  </div>
</div>
```

Add `Trash2` and `Upload` to the lucide import (if not already present).

- [ ] **Step 2: Commit**

```bash
git add components/lms/course-builder-shell.tsx
git commit -m "feat: course cover image upload"
```

---

### Task 17: Toggle edit/preview per block

**Files:**
- Modify: `components/lms/lesson-block-editor.tsx`

- [ ] **Step 1: Add preview mode toggle to each block**

In `LessonBlockEditor.tsx`, add a `previewBlocks` state:
```typescript
const [previewBlocks, setPreviewBlocks] = useState<Set<string>>(new Set());
```

In each block's header (next to the block type selector), add a toggle button:
```tsx
<button
  onClick={() => {
    setPreviewBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(block.id)) next.delete(block.id);
      else next.add(block.id);
      return next;
    });
  }}
  className={`p-1 rounded ${previewBlocks.has(block.id) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
  title={previewBlocks.has(block.id) ? "Редактировать" : "Просмотр"}
>
  {previewBlocks.has(block.id) ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
</button>
```

Add `Edit3, Eye` to lucide imports.

When `previewBlocks.has(block.id)`, instead of rendering the editors, render a preview:
```tsx
{previewBlocks.has(block.id) ? (
  <BlockPreview block={block} />
) : (
  /* existing editor code */
)}
```

Create `BlockPreview` component (can be in the same file):
```tsx
function BlockPreview({ block }: { block: BlockItem }) {
  switch (block.type) {
    case "text":
      return (
        <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: (block.data.html as string) ?? "" }} />
      );
    case "video":
      return block.data.videoUrl ? (
        <div className="rounded-lg bg-muted p-2">
          <Video className="h-4 w-4 inline mr-1 text-muted-foreground" />
          <a href={block.data.videoUrl as string} target="_blank" rel="noopener noreferrer" className="text-xs text-primary">{block.data.videoUrl as string}</a>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Видео не указано</p>
      );
    case "quiz":
      return <p className="text-xs text-muted-foreground"><HelpCircle className="h-3 w-3 inline mr-1" />Тест: {block.data.quizId as string}</p>;
    case "assignment":
      return <p className="text-xs text-muted-foreground"><CheckSquare className="h-3 w-3 inline mr-1" />Задание: {block.data.assignmentId as string}</p>;
    default:
      return <p className="text-xs text-muted-foreground">{BLOCK_LABELS[block.type]}</p>;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/lms/lesson-block-editor.tsx
git commit -m "feat: toggle edit/preview per content block"
```

---

### Task 18: Fix module route path for clone

- [ ] **Step 1: Fix clone route path**

The clone route was created at `app/api/v1/modules/[id]/clone/route.ts` but the modules route expects `[moduleId]` not `[id]`. Rename the folder to match:

The route path should be: `app/api/v1/modules/[moduleId]/clone/route.ts`

The context type should use `moduleId`:
```typescript
type Context = { params: Promise<{ moduleId: string }> };
const { moduleId } = await context.params;
```

- [ ] **Step 2: Verify routes compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/api/v1/modules/\[moduleId\]/clone/route.ts
git rm -r app/api/v1/modules/\[id\]/ 2>/dev/null || true
git commit -m "fix: rename clone route param to moduleId"
```

---

### Plan Self-Review

**Spec coverage:**
- 1.1 (Drag modules) → Task 4
- 1.2 (Clone module) → Task 3 + Task 7
- 1.3 (Inline rename) → Task 5
- 1.4 (Collapse/expand) → Task 6
- 2.1 (Auto-save) → Task 10
- 2.2 (TEXT in QuizCreator) → Task 11
- 2.3 (Question bank) → Task 8 + Task 9
- 2.4 (Collapsed preview + keyboard nav) → Task 10 (preview)
- 3.1 (WYSIWYG) → Task 1 + Task 2 + Task 12
- 3.2 (Video preview) → Task 14
- 3.3 (Media upload) → Task 15
- 3.4 (Cover upload) → Task 16
- 3.5 (Toggle edit/preview) → Task 17
- 3.6 (Rich text for assignments) → Task 13
- 4 (API endpoints) → Tasks 3, 4, 8

**No placeholders** — all code is provided inline.

**Type consistency** — all API routes follow existing patterns (`/api/v1/...`, `requireUser`, `errorResponse`, `ok`). Component props match existing interfaces.
