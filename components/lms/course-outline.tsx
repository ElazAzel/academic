"use client";

import { useState, useCallback, useRef } from "react";
import { Plus, ChevronRight, ChevronDown, FileText, Video, HelpCircle, CheckSquare, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BuilderModuleDetail, BuilderBlockDetail } from "@/types/domain";

type SelectedNode =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "block"; moduleId: string; blockId: string }
  | { type: "lesson"; moduleId: string; blockId?: string; lessonId: string };

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  VIDEO: Video,
  TEXT: FileText,
  DOCUMENT: FileText,
  VIDEO_DOCUMENT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: CheckSquare,
  LIVE: Video,
  RECORDING: Video,
  MIXED: FileText,
};

export function CourseOutline({
  modules,
  selected,
  onSelect,
  courseId,
  onModulesChange,
}: {
  modules: BuilderModuleDetail[];
  selected: SelectedNode;
  onSelect: (node: SelectedNode) => void;
  courseId: string;
  onModulesChange: (modules: BuilderModuleDetail[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dragItem = useRef<{ type: "module" | "block" | "lesson"; moduleIndex: number; blockIndex?: number; lessonIndex?: number } | null>(null);
  void dragItem; // used for future drag-and-drop

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── API helpers ────────────────────────────────────────────────

  const addModule = useCallback(async () => {
    const title = `Модуль ${modules.length + 1}`;
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, order: modules.length, recommendedDays: 7 }),
      });
      if (res.ok) {
        const data = await res.json();
        const newModule: BuilderModuleDetail = {
          id: data.data?.id ?? data.id, order: modules.length, title, description: null,
          recommendedDays: 7, status: "DRAFT", blocks: [], lessons: [],
        };
        onModulesChange([...modules, newModule]);
      }
    } catch {}
  }, [courseId, modules, onModulesChange]);

  const addBlock = useCallback(async (moduleId: string, moduleIndex: number) => {
    const title = `Блок ${(modules[moduleIndex]?.blocks?.length ?? 0) + 1}`;
    try {
      const res = await fetch(`/api/v1/modules/${moduleId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, order: modules[moduleIndex]?.blocks?.length ?? 0 }),
      });
      if (res.ok) {
        const data = await res.json();
        const newBlock: BuilderBlockDetail = {
          id: data.data?.id ?? data.id, order: modules[moduleIndex]?.blocks?.length ?? 0,
          title, description: null, lessons: [],
        };
        const updated = [...modules];
        updated[moduleIndex] = {
          ...updated[moduleIndex],
          blocks: [...(updated[moduleIndex].blocks ?? []), newBlock],
        };
        onModulesChange(updated);
      }
    } catch {}
  }, [modules, onModulesChange]);

  const addLesson = useCallback(async (moduleId: string, moduleIndex: number, blockId?: string) => {
    const blocks = modules[moduleIndex]?.blocks ?? [];
    const block = blockId ? blocks.find((b) => b.id === blockId) : null;
    const lessonsInTarget = block ? block.lessons : (modules[moduleIndex]?.lessons ?? []);
    const title = `Урок ${lessonsInTarget.length + 1}`;
    try {
      const res = await fetch(`/api/v1/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, type: "MIXED", order: lessonsInTarget.length,
          durationMinutes: 30, isRequired: true, blockId: blockId ?? null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newLesson = {
          id: data.data?.id ?? data.id, order: lessonsInTarget.length, title,
          type: "MIXED" as const, summary: null, durationMinutes: 30, isRequired: true,
          content: {}, videoUrl: null, quizzes: [], assignments: [], blockId: blockId ?? null,
        };
        const updated = [...modules];
        if (blockId) {
          const bi = blocks.findIndex((b) => b.id === blockId);
          updated[moduleIndex] = {
            ...updated[moduleIndex],
            blocks: blocks.map((b, idx) => idx === bi ? { ...b, lessons: [...b.lessons, newLesson] } : b),
          };
        } else {
          updated[moduleIndex] = {
            ...updated[moduleIndex],
            lessons: [...(updated[moduleIndex].lessons ?? []), newLesson],
          };
        }
        onModulesChange(updated);
      }
    } catch {}
  }, [modules, onModulesChange]);

  const deleteModule = useCallback(async (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить этот модуль со всеми блоками и уроками?")) return;
    try {
      await fetch(`/api/v1/modules/${moduleId}`, { method: "DELETE" });
      onModulesChange(modules.filter((m) => m.id !== moduleId));
    } catch {}
  }, [modules, onModulesChange]);

  const deleteBlock = useCallback(async (moduleIndex: number, blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить этот блок со всеми уроками?")) return;
    try {
      await fetch(`/api/v1/blocks/${blockId}`, { method: "DELETE" });
      const updated = [...modules];
      updated[moduleIndex] = {
        ...updated[moduleIndex],
        blocks: (updated[moduleIndex].blocks ?? []).filter((b) => b.id !== blockId),
      };
      onModulesChange(updated);
    } catch {}
  }, [modules, onModulesChange]);

  const deleteLesson = useCallback(async (lessonId: string, moduleIndex: number, blockId: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/v1/lessons/${lessonId}`, { method: "DELETE" });
      const updated = [...modules];
      if (blockId) {
        updated[moduleIndex] = {
          ...updated[moduleIndex],
          blocks: (updated[moduleIndex].blocks ?? []).map((b) =>
            b.id === blockId ? { ...b, lessons: b.lessons.filter((l) => l.id !== lessonId) } : b
          ),
        };
      } else {
        updated[moduleIndex] = {
          ...updated[moduleIndex],
          lessons: updated[moduleIndex].lessons.filter((l) => l.id !== lessonId),
        };
      }
      onModulesChange(updated);
    } catch {}
  }, [modules, onModulesChange]);

  return (
    <div className="p-3 space-y-1">
      {/* Course root */}
      <button
        onClick={() => onSelect({ type: "course" })}
        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors ${
          selected.type === "course" ? "bg-primary/10 text-primary" : "hover:bg-muted"
        }`}
      >
        Курс
      </button>

      {/* Modules */}
      {modules.map((mod, mi) => (
        <div key={mod.id} className="ml-2">
          {/* Module header */}
          <div
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
              selected.type === "module" && selected.moduleId === mod.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            <button onClick={() => toggleCollapse(mod.id)} className="p-0.5">
              {collapsed.has(mod.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => onSelect({ type: "module", moduleId: mod.id })}
              className="flex-1 text-left truncate font-medium"
            >
              {mod.title}
            </button>
            <button onClick={(e) => deleteModule(mod.id, e)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Удалить модуль">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {!collapsed.has(mod.id) && (
            <div className="ml-3 space-y-0.5 border-l border-border/50 pl-2">
              {/* Blocks */}
              {(mod.blocks ?? []).map((block) => (
                <div key={block.id}>
                  <div
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors ${
                      selected.type === "block" && selected.blockId === block.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <button onClick={() => toggleCollapse(`block-${block.id}`)} className="p-0.5">
                      {collapsed.has(`block-${block.id}`) ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <button
                      onClick={() => onSelect({ type: "block", moduleId: mod.id, blockId: block.id })}
                      className="flex-1 text-left truncate text-xs"
                    >
                      {block.title}
                    </button>
                    <button onClick={(e) => deleteBlock(mi, block.id, e)} className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" title="Удалить блок">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  {!collapsed.has(`block-${block.id}`) && (
                    <div className="ml-3 space-y-0.5">
                      {block.lessons.map((lesson) => {
                        const Icon = TYPE_ICONS[lesson.type] ?? FileText;
                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-1 rounded-lg px-2 py-0.5 transition-colors group"
                          >
                            <button
                              onClick={() => onSelect({ type: "lesson", moduleId: mod.id, blockId: block.id, lessonId: lesson.id })}
                              className={`flex items-center gap-1.5 flex-1 text-xs py-0.5 ${
                                selected.type === "lesson" && selected.lessonId === lesson.id
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Icon className="h-3 w-3 shrink-0" />
                              <span className="truncate">{lesson.title}</span>
                            </button>
                            <button onClick={(e) => deleteLesson(lesson.id, mi, block.id, e)} className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" title="Удалить урок">
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                      <Button
                        size="sm" variant="ghost"
                        className="w-full justify-start text-[10px] text-muted-foreground h-6"
                        onClick={() => addLesson(mod.id, mi, block.id)}
                      >
                        <Plus className="h-2.5 w-2.5 mr-1" />
                        Урок в блок
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add block button */}
              <Button
                size="sm" variant="ghost"
                className="w-full justify-start text-[10px] text-muted-foreground h-6"
                onClick={() => addBlock(mod.id, mi)}
              >
                <Plus className="h-2.5 w-2.5 mr-1" />
                Блок
              </Button>

              {/* Lessons without block (root level) */}
              {(mod.lessons ?? []).map((lesson) => {
                const Icon = TYPE_ICONS[lesson.type] ?? FileText;
                return (
                  <div key={lesson.id} className="flex items-center gap-1 rounded-lg px-2 py-0.5 transition-colors group">
                    <button
                      onClick={() => onSelect({ type: "lesson", moduleId: mod.id, lessonId: lesson.id })}
                      className={`flex items-center gap-1.5 flex-1 text-xs py-0.5 ${
                        selected.type === "lesson" && selected.lessonId === lesson.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lesson.title}</span>
                    </button>
                    <button onClick={(e) => deleteLesson(lesson.id, mi, undefined, e)} className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" title="Удалить урок">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}

              {/* Add root lesson button */}
              <Button
                size="sm" variant="ghost"
                className="w-full justify-start text-[10px] text-muted-foreground h-6"
                onClick={() => addLesson(mod.id, mi)}
              >
                <Plus className="h-2.5 w-2.5 mr-1" />
                Урок (без блока)
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button size="sm" variant="ghost" className="w-full justify-start text-xs mt-2" onClick={addModule}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Добавить модуль
      </Button>
    </div>
  );
}
