"use client";

import { useState, useCallback } from "react";
import { GripVertical, Plus, ChevronRight, ChevronDown, FileText, Video, HelpCircle, CheckSquare } from "lucide-react";
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
      {modules.map((mod) => (
        <div key={mod.id}>
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
          </div>

          {/* Lessons */}
          {!collapsed.has(mod.id) && (
            <div className="ml-4 space-y-0.5">
              {mod.lessons.map((lesson) => {
                const Icon = TYPE_ICONS[lesson.type] ?? FileText;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onSelect({ type: "lesson", moduleId: mod.id, lessonId: lesson.id })}
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      selected.type === "lesson" && selected.lessonId === lesson.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lesson.title}</span>
                  </button>
                );
              })}
              <Button size="sm" variant="ghost" className="w-full justify-start text-xs text-muted-foreground mt-1">
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
