"use client";

import { useState, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
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
import { uploadMedia } from "@/lib/upload-with-compress";
import { getCourseBuilderPublishChecks, isCourseBuilderReadyToPublish } from "@/lib/course-builder-readiness";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

function normalizeModules(modules: BuilderModuleDetail[]): BuilderModuleDetail[] {
  return modules.map((m) => ({
    ...m,
    blocks: (m.blocks ?? []).map((b) => ({
      ...b,
      lessons: b.lessons ?? [],
    })),
    lessons: m.lessons ?? [],
  }));
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
  const [detail, setDetail] = useState<CourseBuilderDetail>({ ...initial, modules: normalizeModules(initial.modules) });
  const [selected, setSelected] = useState<CourseBuilderSelectedNode>(initialSelected ?? { type: "course" });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [mobilePanel, setMobilePanel] = useState<"outline" | "editor" | "settings">("editor");
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  const isMobile = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );

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
    setDetail({ ...next, modules: normalizeModules(next.modules) });
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

  const handleChecklistNavigation = useCallback((target?: { type: "course" | "module" | "block" | "lesson"; moduleId?: string; blockId?: string; lessonId?: string }) => {
    if (!target) return;
    if (target.type === "course") {
      setSelected({ type: "course" });
    } else if (target.type === "module" && target.moduleId) {
      setSelected({ type: "module", moduleId: target.moduleId });
    } else if (target.type === "lesson" && target.moduleId && target.lessonId) {
      setSelected({
        type: "lesson",
        moduleId: target.moduleId,
        lessonId: target.lessonId,
        blockId: target.blockId,
      });
    }
    setIsChecklistOpen(false);
    if (isMobile) {
      setMobilePanel("editor");
    }
  }, [isMobile]);

  const handlePublish = useCallback(async () => {
    if (!readyToPublish) {
      setIsChecklistOpen(true);
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
            blocks: (mod.blocks ?? []).map((block) =>
              block.id === selected.blockId
                ? { ...block, lessons: (block.lessons ?? []).map((lesson) => (lesson.id === selected.lessonId ? { ...lesson, ...updates } : lesson)) }
                : block,
            ),
          };
        }
        return {
          ...mod,
          lessons: (mod.lessons ?? []).map((lesson) => (lesson.id === selected.lessonId ? { ...lesson, ...updates } : lesson)),
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
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-m3-surface">
      {/* Top bar — M3 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-m3-outline-variant px-3 py-2 md:px-6 md:py-3 bg-m3-surface-container-lowest">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Button size="icon" variant="ghost" asChild>
            <Link href={backHref} aria-label="Назад к курсам">
              <Icon name="arrow_back" className="text-[20px]" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="max-w-[30vw] md:max-w-[42vw] truncate text-title-md md:text-headline-sm text-m3-on-surface">{detail.title}</h1>
              <Badge variant={detail.status === "PUBLISHED" ? "default" : "secondary"}>{statusLabel(detail.status)}</Badge>
            </div>
            <p className="hidden md:block font-body-sm text-body-sm text-m3-on-surface-variant">
              Course → Module → Block → Lesson · единый builder
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 md:gap-2">
          <Button size="sm" variant={mode === "edit" ? "primary" : "secondary"} onClick={() => setMode("edit")}>
            <Icon name="edit" className="text-[16px] md:text-[18px]" />
            <span className="hidden md:inline">Редактор</span>
          </Button>
          <Button size="sm" variant={mode === "preview" ? "primary" : "secondary"} onClick={() => setMode("preview")}>
            <Icon name="visibility" className="text-[16px] md:text-[18px]" />
            <span className="hidden md:inline">Предпросмотр</span>
          </Button>
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={!dirty || saving}>
            <Icon name={saving ? "hourglass_top" : "save"} className="text-[16px] md:text-[18px]" />
          </Button>
          {detail.status === "PUBLISHED" ? (
            <Button size="sm" variant="secondary" onClick={handleUnpublish} disabled={publishing}>
              <span className="hidden md:inline">В черновик</span>
              <Icon name="unpublished" className="text-[16px] md:hidden" />
            </Button>
          ) : (
            <Button size="sm" onClick={handlePublish} disabled={publishing}>
              <Icon name="rocket_launch" className="text-[16px] md:text-[18px]" />
            </Button>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="flex border-b border-m3-outline-variant bg-m3-surface-container-lowest">
          {(["outline", "editor", "settings"] as const).map((panel) => (
            <button
              key={panel}
              onClick={() => setMobilePanel(panel)}
              className={`flex-1 py-2 text-center text-label-md font-label-md transition-colors ${
                mobilePanel === panel
                  ? "border-b-2 border-m3-primary text-m3-primary"
                  : "text-m3-on-surface-variant hover:text-m3-on-surface"
              }`}
            >
              {panel === "outline" ? "Структура" : panel === "editor" ? "Редактор" : "Свойства"}
            </button>
          ))}
        </div>
      )}

      {/* 3-column layout — M3 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Course Outline — hidden on mobile unless selected */}
        {(!isMobile || mobilePanel === "outline") && (
          <div className={`${isMobile ? "w-full" : "w-72 shrink-0"} overflow-y-auto border-r border-m3-outline-variant bg-m3-surface-container-low`}>
            <CourseOutline
              modules={detail.modules}
              selected={selected}
              onSelect={(node) => { setSelected(node); if (isMobile) setMobilePanel("editor"); }}
              courseId={detail.id}
              onModulesChange={(modules) => {
                setDetail((current) => ({ ...current, modules: normalizeModules(modules) }));
                setDirty(true);
              }}
            />
          </div>
        )}

        {/* Center: Editor Canvas — hidden on mobile unless selected */}
        {(!isMobile || mobilePanel === "editor") && (
          <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-m3-surface">
            {mode === "preview" ? (
              <CourseBuilderPreview detail={detail} lesson={selectedLesson} />
            ) : (
              <>
                {selected.type === "course" && (
                  <div className="mx-auto max-w-3xl space-y-4 md:space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="courseTitle" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Название курса</label>
                      <input
                        id="courseTitle"
                        name="courseTitle"
                        className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                        value={detail.title}
                        onChange={(event) => { setDetail((current) => ({ ...current, title: event.target.value })); setDirty(true); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="description" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Описание</label>
                      <textarea
                        id="description"
                        name="description"
                        className="min-h-[100px] md:min-h-[120px] w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                        value={detail.description}
                        onChange={(event) => { setDetail((current) => ({ ...current, description: event.target.value })); setDirty(true); }}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="goal" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Цель</label>
                        <input
                          id="goal"
                          name="goal"
                          className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                          value={detail.goal ?? ""}
                          onChange={(event) => { setDetail((current) => ({ ...current, goal: event.target.value })); setDirty(true); }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="durationHours" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Длительность, часов</label>
                        <input
                          id="durationHours"
                          name="durationHours"
                          type="number"
                          className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                          value={detail.durationHours}
                          onChange={(event) => { setDetail((current) => ({ ...current, durationHours: Number(event.target.value) })); setDirty(true); }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="traversalMode" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Режим прохождения</label>
                        <select
                          id="traversalMode"
                          name="traversalMode"
                          className="h-10 w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-3 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                          value={detail.traversalMode}
                          onChange={(event) => { setDetail((current) => ({ ...current, traversalMode: event.target.value as "sequential" | "open" })); setDirty(true); }}
                        >
                          <option value="sequential">Последовательный</option>
                          <option value="open">Свободный</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="completionThreshold" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Порог завершения, %</label>
                        <input
                          id="completionThreshold"
                          name="completionThreshold"
                          type="number"
                          className="w-full rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2.5 font-body-md text-body-md text-m3-on-surface outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 transition-all"
                          value={detail.completionThreshold}
                          onChange={(event) => { setDetail((current) => ({ ...current, completionThreshold: Number(event.target.value) })); setDirty(true); }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="cover-upload" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Обложка</label>
                      {detail.coverUrl && (
                        <div className="relative mb-2 overflow-hidden rounded-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detail.coverUrl} alt="Обложка курса" className="h-32 w-full object-cover" />
                          <button
                            onClick={() => { setDetail((current) => ({ ...current, coverUrl: null })); setDirty(true); }}
                            className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Icon name="delete" className="text-[16px]" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => document.getElementById("cover-upload")?.click()}>
                          <Icon name="upload" className="text-[16px] mr-1" />
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
                             try {
                               const result = await uploadMedia(file, "covers");
                               setDetail((current) => ({ ...current, coverUrl: result.publicUrl }));
                               setDirty(true);
                               toast.success("Обложка загружена");
                             } catch {
                               toast.error("Ошибка при загрузке обложки");
                             }
                           }}
                        />
                      </div>
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
                      <label htmlFor="blockTitle" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Название блока</label>
                      <input
                        id="blockTitle"
                        name="blockTitle"
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
                      <label htmlFor="blockDescription" className="font-label-md text-label-md text-m3-on-surface-variant uppercase tracking-wider">Описание</label>
                      <textarea
                        id="blockDescription"
                        name="blockDescription"
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
                    <div className="rounded-lg bg-m3-surface-container-low p-4 font-body-md text-body-md text-m3-on-surface-variant">
                      Уроков в блоке: {selectedBlock.lessons?.length ?? 0}
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
        )}

        {/* Right: Settings Panel — hidden on mobile unless selected */}
        {!isMobile && settingsOpen && (
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
        {isMobile && mobilePanel === "settings" && (
          <div className="w-full overflow-y-auto bg-m3-surface-container-low p-4">
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
      <div className="hidden md:flex flex-wrap items-center justify-between gap-2 border-t border-m3-outline-variant px-4 py-2 font-body-sm text-body-sm text-m3-on-surface-variant lg:px-6 bg-m3-surface-container-lowest">
        <span>{dirty ? "Есть несохраненные изменения" : "Все изменения сохранены"}</span>
        <span className="inline-flex items-center gap-2">
          <Icon name={readyToPublish ? "check_circle" : "warning"} className={readyToPublish ? "text-emerald-600" : "text-amber-600"} />
          {readyToPublish ? "Курс готов к публикации" : "Публикация требует доработки"}
        </span>
        <span>Ctrl+S — сохранить · Esc — панель свойств</span>
      </div>
      {/* Mobile footer — compact */}
      <div className="md:hidden flex items-center justify-between border-t border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface-variant bg-m3-surface-container-lowest">
        <span className="truncate max-w-[50%]">{dirty ? "Есть изменения" : "Сохранено"}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <Icon name={readyToPublish ? "check_circle" : "warning"} className={readyToPublish ? "text-emerald-600" : "text-amber-600"} size={14} />
          <span>{readyToPublish ? "Готово" : "Требует доработки"}</span>
        </span>
      </div>

      {/* Checklist Dialog for non-ready publication attempts */}
      <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
        <DialogContent className="max-w-md bg-m3-surface-container-lowest text-m3-on-surface">
          <DialogHeader>
            <DialogTitle className="text-title-lg font-headline-sm">Требования для публикации</DialogTitle>
            <DialogDescription className="text-body-md text-m3-on-surface-variant">
              Пожалуйста, исправьте следующие замечания, чтобы опубликовать курс:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {publishChecks.map((check, idx) => (
              <div
                key={idx}
                onClick={() => handleChecklistNavigation(check.target)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleChecklistNavigation(check.target); } }}
                role="button"
                tabIndex={0}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  check.passed
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300 hover:bg-rose-500/20"
                }`}
              >
                <Icon
                  name={check.passed ? "check_circle" : "error"}
                  className={`mt-0.5 shrink-0 text-[18px] ${check.passed ? "text-emerald-600" : "text-rose-600"}`}
                />
                <div className="space-y-0.5">
                  <p className="font-title-sm text-title-sm">{check.label}</p>
                  <p className="text-body-sm text-m3-on-surface-variant/80">{check.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsChecklistOpen(false)}>Понятно</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
