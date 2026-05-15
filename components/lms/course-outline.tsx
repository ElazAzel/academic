"use client";

import { useState, useCallback, useRef } from "react";
import { GripVertical, Plus, ChevronRight, ChevronDown, FileText, Video, HelpCircle, CheckSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BuilderModuleDetail } from "@/types/domain";

type SelectedNode =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "lesson"; moduleId: string; lessonId: string };

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

const LESSON_TYPE_OPTIONS = [
  { value: "MIXED", label: "Смешанный" },
  { value: "VIDEO", label: "Видео" },
  { value: "TEXT", label: "Текст" },
  { value: "DOCUMENT", label: "Документ" },
  { value: "QUIZ", label: "Тест" },
  { value: "ASSIGNMENT", label: "Задание" },
];

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
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);
  const dragItem = useRef<{ type: "module"; index: number } | { type: "lesson"; moduleIndex: number; lessonIndex: number } | null>(null);

  const toggleModule = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
        const newModule: BuilderModuleDetail = { id: data.data?.id ?? data.id, order: modules.length, title, description: null, recommendedDays: 7, status: "DRAFT", lessons: [] };
        onModulesChange([...modules, newModule]);
      }
    } catch {}
  }, [courseId, modules, onModulesChange]);

  const addLesson = useCallback(async (moduleId: string, moduleIndex: number) => {
    const title = `Урок ${modules[moduleIndex].lessons.length + 1}`;
    const type = "MIXED";
    try {
      const res = await fetch(`/api/v1/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, order: modules[moduleIndex].lessons.length, durationMinutes: 30, isRequired: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const newLesson = { id: data.data?.id ?? data.id, order: modules[moduleIndex].lessons.length, title, type: type as BuilderModuleDetail["lessons"][number]["type"], summary: null, durationMinutes: 30, isRequired: true, content: {}, videoUrl: null, quizzes: [], assignments: [] };
        const updated = [...modules];
        updated[moduleIndex] = { ...updated[moduleIndex], lessons: [...updated[moduleIndex].lessons, newLesson] };
        onModulesChange(updated);
      }
    } catch {}
  }, [modules, onModulesChange]);

  const deleteModule = useCallback(async (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/v1/modules/${moduleId}`, { method: "DELETE" });
      onModulesChange(modules.filter((m) => m.id !== moduleId));
    } catch {}
  }, [modules, onModulesChange]);

  const deleteLesson = useCallback(async (lessonId: string, moduleIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/v1/lessons/${lessonId}`, { method: "DELETE" });
      const updated = [...modules];
      updated[moduleIndex] = { ...updated[moduleIndex], lessons: updated[moduleIndex].lessons.filter((l) => l.id !== lessonId) };
      onModulesChange(updated);
    } catch {}
  }, [modules, onModulesChange]);

  // ── Module drag-n-drop ──────────────────────────────────────────
  const handleModuleDragStart = (index: number) => { dragItem.current = { type: "module", index }; };
  const handleModuleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverModuleId(modules[index]?.id ?? null);
  };
  const handleModuleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverModuleId(null);
    const item = dragItem.current;
    if (!item) return;
    if (item.type === "module") {
      const newModules = [...modules];
      const [moved] = newModules.splice(item.index, 1);
      const targetIndex = modules.findIndex((m) => m.id === dragOverModuleId);
      if (targetIndex >= 0) {
        newModules.splice(targetIndex, 0, moved);
        onModulesChange(newModules);
      }
    }
  };

  // ── Lesson drag-n-drop ──────────────────────────────────────────
  const handleLessonDragStart = (moduleIndex: number, lessonIndex: number) => {
    dragItem.current = { type: "lesson", moduleIndex, lessonIndex };
  };
  const handleLessonDrop = (e: React.DragEvent, targetModuleIdx: number, targetLessonIdx: number) => {
    e.preventDefault();
    const item = dragItem.current;
    if (!item || item.type !== "lesson") return;
    const updated = [...modules];
    const fromModule = updated[item.moduleIndex];
    const toModule = updated[targetModuleIdx];
    if (!fromModule || !toModule) return;
    const [moved] = fromModule.lessons.splice(item.lessonIndex, 1);
    toModule.lessons.splice(targetLessonIdx, 0, moved);
    onModulesChange(updated);
  };

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
        <div
          key={mod.id}
          draggable
          onDragStart={() => handleModuleDragStart(mi)}
          onDragOver={(e) => handleModuleDragOver(e, mi)}
          onDrop={handleModuleDrop}
          onDragEnd={() => setDragOverModuleId(null)}
          className={`rounded-lg transition-colors ${dragOverModuleId === mod.id ? "ring-2 ring-primary/30 bg-primary/5" : ""}`}
        >
          <div
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
              selected.type === "module" && selected.moduleId === mod.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            <button onClick={() => toggleModule(mod.id)} className="p-0.5">
              {collapsed.has(mod.id) ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-grab" />
            <button
              onClick={() => onSelect({ type: "module", moduleId: mod.id })}
              className="flex-1 text-left truncate"
            >
              {mod.title}
            </button>
            <button onClick={(e) => deleteModule(mod.id, e)} className="p-0.5 text-muted-foreground hover:text-destructive" title="Удалить модуль">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Lessons */}
          {!collapsed.has(mod.id) && (
            <div className="ml-4 space-y-0.5">
              {mod.lessons.map((lesson, li) => {
                const Icon = TYPE_ICONS[lesson.type] ?? FileText;
                return (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => handleLessonDragStart(mi, li)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleLessonDrop(e, mi, li)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 transition-colors group"
                  >
                    <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                    <button
                      onClick={() => onSelect({ type: "lesson", moduleId: mod.id, lessonId: lesson.id })}
                      className={`flex items-center gap-2 flex-1 text-xs py-0.5 ${
                        selected.type === "lesson" && selected.lessonId === lesson.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lesson.title}</span>
                    </button>
                    <button onClick={(e) => deleteLesson(lesson.id, mi, e)} className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" title="Удалить урок">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start text-xs text-muted-foreground mt-1"
                onClick={() => addLesson(mod.id, mi)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Урок
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
