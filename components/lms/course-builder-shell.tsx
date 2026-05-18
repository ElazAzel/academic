"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { CourseOutline } from "@/components/lms/course-outline";
import { CourseSettingsPanel } from "@/components/lms/course-settings-panel";
import { ModuleEditor } from "@/components/lms/module-editor";
import { LessonEditor } from "@/components/lms/lesson-editor";
import { CourseBuilderPreview } from "@/components/lms/course-builder-preview";
import { useBeforeUnload } from "@/components/lms/use-before-unload";
import { getCourseBuilderPublishChecks, isCourseBuilderReadyToPublish } from "@/lib/course-builder-readiness";
import type {
  AssignmentSummary,
  BuilderBlockDetail,
  BuilderLessonDetail,
  BuilderModuleDetail,
  ContentBlock,
  CourseBuilderDetail,
  QuizSummary,
} from "@/types/domain";

type BuilderRole = "instructor" | "admin";

export type CourseBuilderSelectedNode =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "block"; moduleId: string; blockId: string }
  | { type: "lesson"; moduleId: string; lessonId: string; blockId?: string };

function statusLabel(status: CourseBuilderDetail["status"]) {
  if (status === "PUBLISHED") return "Опубликован";
  if (status === "ARCHIVED") return "Архив";
  return "Черновик";
}

function snapshotPayload(detail: CourseBuilderDetail) {
  return {
    title: detail.title,
    description: detail.description,
    goal: detail.goal,
    coverUrl: detail.coverUrl,
    durationHours: detail.durationHours,
    traversalMode: detail.traversalMode,
    completionThreshold: detail.completionThreshold,
    modules: detail.modules.map((mod, moduleIndex) => {
      let nextLessonOrder = 0;
      return {
        id: mod.id,
        order: moduleIndex,
        title: mod.title,
        description: mod.description,
        recommendedDays: mod.recommendedDays,
        status: mod.status,
        blocks: mod.blocks.map((block, blockIndex) => ({
          id: block.id,
          order: blockIndex,
          title: block.title,
          description: block.description,
          lessons: block.lessons.map((lesson) => ({
            id: lesson.id,
            order: nextLessonOrder++,
            title: lesson.title,
            summary: lesson.summary,
            type: lesson.type,
            videoUrl: lesson.videoUrl,
            durationMinutes: lesson.durationMinutes,
            isRequired: lesson.isRequired,
            blockId: block.id,
          })),
        })),
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,
          order: nextLessonOrder++,
          title: lesson.title,
          summary: lesson.summary,
          type: lesson.type,
          videoUrl: lesson.videoUrl,
          durationMinutes: lesson.durationMinutes,
          isRequired: lesson.isRequired,
          blockId: null,
        })),
      };
    }),
  };
}

function createContentBlockId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function appendContentBlock(content: Record<string, unknown> | undefined, block: ContentBlock) {
  const current = content ?? {};
  const existingBlocks = Array.isArray(current.blocks) ? current.blocks : [];
  return {
    ...current,
    blocks: [...existingBlocks, block],
  };
}

export function CourseBuilderShell({
  detail: initial,
  role = "instructor",
  initialSelected,
}: {
  detail: CourseBuilderDetail;
  role?: BuilderRole;
  initialSelected?: CourseBuilderSelectedNode;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<CourseBuilderDetail>(initial);
  const [selected, setSelected] = useState<CourseBuilderSelectedNode>(initialSelected ?? { type: "course" });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  useBeforeUnload(dirty);

  const backHref = role === "admin" ? "/admin/courses" : "/instructor/courses";
  const publishChecks = useMemo(() => getCourseBuilderPublishChecks(detail), [detail]);
  const readyToPublish = useMemo(() => isCourseBuilderReadyToPublish(detail), [detail]);

  const selectedModule: BuilderModuleDetail | undefined =
    selected.type === "module" ? detail.modules.find((mod) => mod.id === selected.moduleId)
    : selected.type === "block" || selected.type === "lesson" ? detail.modules.find((mod) => mod.id === selected.moduleId)
    : undefined;

  const selectedBlock: BuilderBlockDetail | undefined =
    selected.type === "block"
      ? (selectedModule?.blocks ?? []).find((block) => block.id === selected.blockId)
      : undefined;

  const selectedLesson: BuilderLessonDetail | undefined =
    selected.type === "lesson"
      ? selected.blockId
        ? (selectedModule?.blocks ?? []).find((block) => block.id === selected.blockId)?.lessons.find((lesson) => lesson.id === selected.lessonId)
        : selectedModule?.lessons.find((lesson) => lesson.id === selected.lessonId)
      : undefined;

  const replaceDetail = useCallback((next: CourseBuilderDetail) => {
    setDetail(next);
    setDirty(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/courses/${detail.id}/builder/snapshot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshotPayload(detail)),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        replaceDetail(payload.data ?? payload);
        toast.success("Изменения сохранены");
        router.refresh();
        return true;
      }
      toast.error(payload.error?.message || "Ошибка при сохранении курса");
      return false;
    } catch {
      toast.error("Сетевая ошибка при сохранении");
      return false;
    } finally {
      setSaving(false);
    }
  }, [detail, replaceDetail, router]);

  const handlePublish = useCallback(async () => {
    if (!readyToPublish) {
      toast.error("Закройте пункты checklist перед публикацией");
      return;
    }
    setPublishing(true);
    try {
      if (dirty) {
        const saved = await handleSave();
        if (!saved) return;
      }
      const res = await fetch(`/api/v1/courses/${detail.id}/builder/publish`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (res.ok) {
        setDetail((current) => ({ ...current, status: "PUBLISHED" }));
        setDirty(false);
        toast.success("Курс опубликован");
        router.refresh();
      } else {
        toast.error(payload.error?.message || "Курс не готов к публикации");
      }
    } catch {
      toast.error("Сетевая ошибка при публикации");
    } finally {
      setPublishing(false);
    }
  }, [detail.id, dirty, handleSave, readyToPublish, router]);

  const handleUnpublish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/v1/courses/${detail.id}/builder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      if (res.ok) {
        setDetail((current) => ({ ...current, status: "DRAFT" }));
        toast.success("Курс возвращен в черновик");
        router.refresh();
      } else {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error?.message || "Не удалось вернуть курс в черновик");
      }
    } catch {
      toast.error("Сетевая ошибка");
    } finally {
      setPublishing(false);
    }
  }, [detail.id, router]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        if (dirty) void handleSave();
      }
      if (event.key === "Escape") setSettingsOpen((open) => !open);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, handleSave]);

  const updateSelectedLesson = useCallback((updates: Partial<BuilderLessonDetail>) => {
    if (selected.type !== "lesson") return;
    setDetail((current) => ({
      ...current,
      modules: current.modules.map((mod) => {
        if (mod.id !== selected.moduleId) return mod;
        if (selected.blockId) {
          return {
            ...mod,
            blocks: mod.blocks.map((block) =>
              block.id === selected.blockId
                ? { ...block, lessons: block.lessons.map((lesson) => (lesson.id === selected.lessonId ? { ...lesson, ...updates } : lesson)) }
                : block,
            ),
          };
        }
        return {
          ...mod,
          lessons: mod.lessons.map((lesson) => (lesson.id === selected.lessonId ? { ...lesson, ...updates } : lesson)),
        };
      }),
    }));
    setDirty(true);
  }, [selected]);

  const appendQuiz = useCallback((quiz: QuizSummary) => {
    updateSelectedLesson({
      quizzes: [...(selectedLesson?.quizzes ?? []), quiz],
      content: appendContentBlock(selectedLesson?.content, {
        id: createContentBlockId("quiz"),
        type: "quiz",
        data: { quizId: quiz.id },
      }),
    });
  }, [selectedLesson?.content, selectedLesson?.quizzes, updateSelectedLesson]);

  const appendAssignment = useCallback((assignment: AssignmentSummary) => {
    updateSelectedLesson({
      assignments: [...(selectedLesson?.assignments ?? []), assignment],
      content: appendContentBlock(selectedLesson?.content, {
        id: createContentBlockId("assignment"),
        type: "assignment",
        data: { assignmentId: assignment.id },
      }),
    });
  }, [selectedLesson?.assignments, selectedLesson?.content, updateSelectedLesson]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-m3-surface">
      {/* Top bar — M3 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-m3-outline-variant px-4 py-3 lg:px-6 bg-m3-surface-container-lowest">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href={backHref} aria-label="Назад к курсам">
              <Icon name="arrow_back" className="text-[20px]" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="max-w-[42vw] truncate text-m3-headline-sm text-m3-on-surface">{detail.title}</h1>
              <Badge variant={detail.status === "PUBLISHED" ? "default" : "secondary"}>{statusLabel(detail.status)}</Badge>
            </div>
            <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
              Course → Module → Block → Lesson · единый builder
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={mode === "edit" ? "primary" : "secondary"} onClick={() => setMode("edit")}>
            <Icon name="edit" className="text-[18px]" />
            Редактор
          </Button>
          <Button size="sm" variant={mode === "preview" ? "primary" : "secondary"} onClick={() => setMode("preview")}>
            <Icon name="visibility" className="text-[18px]" />
            Предпросмотр
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={!dirty || saving}>
            <Icon name={saving ? "hourglass_top" : "save"} className="text-[18px]" />
            {saving ? "Сохраняем..." : "Сохранить"}
          </Button>
          {detail.status === "PUBLISHED" ? (
            <Button size="sm" variant="secondary" onClick={handleUnpublish} disabled={publishing}>
              Вернуть в черновик
            </Button>
          ) : (
            <Button size="sm" onClick={handlePublish} disabled={!readyToPublish || publishing}>
              <Icon name="rocket_launch" className="text-[18px]" />
              Опубликовать
            </Button>
          )}
        </div>
      </div>

      {/* 3-column layout — M3 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Course Outline */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-m3-outline-variant bg-m3-surface-container-low">
          <CourseOutline
            modules={detail.modules}
            selected={selected}
            onSelect={setSelected}
            courseId={detail.id}
            onModulesChange={(modules) => {
              setDetail((current) => ({ ...current, modules }));
              setDirty(true);
            }}
          />
        </div>

        {/* Center: Editor Canvas */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-m3-surface">
          {mode === "preview" ? (
            <CourseBuilderPreview detail={detail} lesson={selectedLesson} />
          ) : (
            <>
              {selected.type === "course" && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Название курса</label>
                    <input
                      className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                      value={detail.title}
                      onChange={(event) => { setDetail((current) => ({ ...current, title: event.target.value })); setDirty(true); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Описание</label>
                    <textarea
                      className="min-h-[120px] w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                      value={detail.description}
                      onChange={(event) => { setDetail((current) => ({ ...current, description: event.target.value })); setDirty(true); }}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Цель</label>
                      <input
                        className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                        value={detail.goal ?? ""}
                        onChange={(event) => { setDetail((current) => ({ ...current, goal: event.target.value })); setDirty(true); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Длительность, часов</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                        value={detail.durationHours}
                        onChange={(event) => { setDetail((current) => ({ ...current, durationHours: Number(event.target.value) })); setDirty(true); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Режим прохождения</label>
                      <select
                        className="h-10 w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                        value={detail.traversalMode}
                        onChange={(event) => { setDetail((current) => ({ ...current, traversalMode: event.target.value as "sequential" | "open" })); setDirty(true); }}
                      >
                        <option value="sequential">Последовательный</option>
                        <option value="open">Свободный</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Порог завершения, %</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                        value={detail.completionThreshold}
                        onChange={(event) => { setDetail((current) => ({ ...current, completionThreshold: Number(event.target.value) })); setDirty(true); }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Обложка</label>
                    <input
                      className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                      value={detail.coverUrl ?? ""}
                      onChange={(event) => { setDetail((current) => ({ ...current, coverUrl: event.target.value || null })); setDirty(true); }}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {selected.type === "module" && selectedModule && (
                <ModuleEditor
                  module={selectedModule}
                  onChange={(updates) => {
                    setDetail((current) => ({
                      ...current,
                      modules: current.modules.map((mod) => (mod.id === selectedModule.id ? { ...mod, ...updates } : mod)),
                    }));
                    setDirty(true);
                  }}
                />
              )}

              {selected.type === "block" && selectedBlock && (
                <div className="mx-auto max-w-2xl space-y-6">
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Название блока</label>
                    <input
                      className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                      value={selectedBlock.title}
                      onChange={(event) => {
                        setDetail((current) => ({
                          ...current,
                          modules: current.modules.map((mod) =>
                            mod.id === selected.moduleId
                              ? { ...mod, blocks: mod.blocks.map((block) => (block.id === selectedBlock.id ? { ...block, title: event.target.value } : block)) }
                              : mod,
                          ),
                        }));
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Описание</label>
                    <textarea
                      className="min-h-[80px] w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                      value={selectedBlock.description ?? ""}
                      onChange={(event) => {
                        setDetail((current) => ({
                          ...current,
                          modules: current.modules.map((mod) =>
                            mod.id === selected.moduleId
                              ? { ...mod, blocks: mod.blocks.map((block) => (block.id === selectedBlock.id ? { ...block, description: event.target.value } : block)) }
                              : mod,
                          ),
                        }));
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="rounded-xl bg-m3-surface-container-low p-4 font-body-md text-body-md text-m3-on-surface-variant">
                    Уроков в блоке: {selectedBlock.lessons.length}
                  </div>
                </div>
              )}

              {selected.type === "lesson" && selectedLesson && (
                <LessonEditor
                  lesson={selectedLesson}
                  courseId={detail.id}
                  onChange={updateSelectedLesson}
                  onQuizCreated={appendQuiz}
                  onAssignmentCreated={appendAssignment}
                />
              )}
            </>
          )}
        </div>

        {/* Right: Settings Panel */}
        {settingsOpen && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-m3-outline-variant bg-m3-surface-container-low p-5">
            <CourseSettingsPanel
              selected={selected}
              detail={detail}
              module={selectedModule}
              lesson={selectedLesson}
              publishChecks={publishChecks}
            />
          </div>
        )}
      </div>

      {/* Footer status bar — M3 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-m3-outline-variant px-4 py-2 font-body-sm text-body-sm text-m3-on-surface-variant lg:px-6 bg-m3-surface-container-lowest">
        <span>{dirty ? "Есть несохраненные изменения" : "Все изменения сохранены"}</span>
        <span className="inline-flex items-center gap-2">
          <Icon name={readyToPublish ? "check_circle" : "warning"} className={readyToPublish ? "text-emerald-600" : "text-amber-600"} />
          {readyToPublish ? "Курс готов к публикации" : "Публикация требует доработки"}
        </span>
        <span>Ctrl+S — сохранить · Esc — панель свойств</span>
      </div>
    </div>
  );
}
