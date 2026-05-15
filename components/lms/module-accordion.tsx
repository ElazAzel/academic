"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { LessonCard } from "@/components/lms/lesson-card";
import type { ModulePlayerDetail } from "@/types/domain";

export function ModuleAccordion({
  modules,
  defaultModuleId,
}: {
  modules: ModulePlayerDetail[];
  defaultModuleId?: string;
}) {
  const [hideCompleted, setHideCompleted] = useState(false);
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    // Open all incomplete modules by default, or the default module
    if (defaultModuleId) return new Set([defaultModuleId]);
    return new Set(modules.filter((m) => m.progressPercent < 100).map((m) => m.id));
  });

  const toggleModule = useCallback((id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleHideCompleted = useCallback(() => {
    setHideCompleted((prev) => !prev);
  }, []);

  const visibleModules = hideCompleted
    ? modules.filter((m) => m.progressPercent < 100)
    : modules;

  if (visibleModules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 px-6 py-16 text-center">
        <EyeOff className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <h3 className="text-base font-semibold">Все модули пройдены</h3>
        <p className="mt-1 text-sm text-muted-foreground">Отключите скрытие завершённых, чтобы увидеть их снова.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hide completed toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Модули курса</h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch checked={hideCompleted} onCheckedChange={toggleHideCompleted} />
          <span className="flex items-center gap-1">
            {hideCompleted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            Скрыть завершённые
          </span>
        </label>
      </div>

      {visibleModules.map((mod) => {
        const isOpen = openModules.has(mod.id);
        return (
          <div key={mod.id} className="rounded-2xl border bg-card overflow-hidden">
            {/* Module header */}
            <button
              onClick={() => toggleModule(mod.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
            >
              <span className="shrink-0 text-muted-foreground">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Модуль {mod.order}</span>
                  <span className="truncate text-sm">{mod.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <Progress value={mod.progressPercent} className="h-1.5 w-24" />
                  <span className="text-xs text-muted-foreground">{mod.progressPercent}%</span>
                </div>
              </div>
              {mod.deadline && (
                <Badge
                  className={cn(
                    "shrink-0 text-[10px]",
                    mod.deadline.overdue
                      ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                  )}
                >
                  {mod.deadline.overdue ? "Просрочен" : `до ${mod.deadline.date.slice(0, 10)}`}
                </Badge>
              )}
            </button>

            {/* Lesson cards */}
            {isOpen && (
              <div className="border-t px-4 py-3 space-y-2">
                {mod.lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
