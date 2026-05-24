"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/lms/status-badge";
import { Switch } from "@/components/ui/switch";
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
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-m3-outline-variant bg-m3-surface-container-lowest px-6 py-16 text-center shadow-m3-soft">
        <Icon name="visibility_off" size={32} className="mb-3 text-m3-on-surface-variant/40" />
        <h3 className="text-headline-sm font-headline-sm text-m3-on-surface">Все модули пройдены</h3>
        <p className="mt-1 text-body-md font-body-md text-m3-on-surface-variant">Отключите скрытие завершённых, чтобы увидеть их снова.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hide completed toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm font-headline-sm text-m3-on-surface">Модули курса</h2>
        <label className="flex items-center gap-2 text-label-md font-label-md text-m3-on-surface-variant cursor-pointer">
          <Switch checked={hideCompleted} onCheckedChange={toggleHideCompleted} />
          <span className="flex items-center gap-1">
            {hideCompleted ? <Icon name="visibility_off" size={12} /> : <Icon name="visibility" size={12} />}
            Скрыть завершённые
          </span>
        </label>
      </div>

      {visibleModules.map((mod) => {
        const isOpen = openModules.has(mod.id);
        return (
          <div key={mod.id} className="overflow-hidden rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            {/* Module header */}
            <button
              onClick={() => toggleModule(mod.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-m3-surface-container-high"
            >
              <span className="shrink-0 text-m3-on-surface-variant">
                {isOpen ? <Icon name="expand_more" size={16} /> : <Icon name="chevron_right" size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-label-lg font-label-lg text-m3-primary">Модуль {mod.order}</span>
                  <span className="truncate text-body-md font-body-md text-m3-on-surface">{mod.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <Progress value={mod.progressPercent} className="h-1.5 w-24" />
                  <span className="text-label-md font-label-md text-m3-on-surface-variant">{mod.progressPercent}%</span>
                </div>
              </div>
              {mod.deadline && (
                <StatusBadge
                  status={mod.deadline.overdue ? "overdue" : "upcoming"}
                  label={mod.deadline.overdue ? "Просрочен" : `до ${mod.deadline.date.slice(0, 10)}`}
                  className="shrink-0 text-[10px]"
                />
              )}
            </button>

            {/* Lesson cards */}
            {isOpen && (
              <div className="border-t border-m3-outline-variant px-4 py-3 space-y-2">
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
