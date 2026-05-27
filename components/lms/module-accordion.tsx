"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/lms/status-badge";
import { Switch } from "@/components/ui/switch";
import { LessonCard } from "@/components/lms/lesson-card";
import type { LessonPlayerCard, ModulePlayerDetail } from "@/types/domain";

const ROOT_GROUP_ID = "__module_lessons__";
const deadlineFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

function formatDeadline(date: string) {
  return deadlineFormatter.format(new Date(date));
}

function countCompleted(lessons: LessonPlayerCard[]) {
  return lessons.filter((lesson) => lesson.status === "COMPLETED").length;
}

function stripOrdinalPrefix(title: string, label: "модуль" | "блок", order: number) {
  const trimmed = title.trim();
  const prefix = `${label} ${order}`;
  const lower = trimmed.toLocaleLowerCase("ru-RU");

  if (!lower.startsWith(prefix)) return trimmed;

  const stripped = trimmed.slice(prefix.length).replace(/^\s*[:\-–—]?\s*/u, "").trim();
  return stripped || trimmed;
}

function formatOrdinalLabel(title: string, label: "модуль" | "блок", order: number) {
  const trimmed = title.trim();
  const stripped = stripOrdinalPrefix(trimmed, label, order);
  const displayLabel = label === "модуль" ? "Модуль" : "Блок";
  return stripped === trimmed ? `${displayLabel} ${order}: ${trimmed}` : `${displayLabel} ${order}: ${stripped}`;
}

function groupLessonsByBlock(lessons: LessonPlayerCard[]) {
  const groups = new Map<string, { id: string; title: string; order: number; isBlock: boolean; lessons: LessonPlayerCard[] }>();

  lessons.forEach((lesson) => {
    const id = lesson.blockId ?? ROOT_GROUP_ID;
    const existing = groups.get(id);

    if (existing) {
      existing.lessons.push(lesson);
      existing.order = Math.min(existing.order, lesson.blockOrder ?? lesson.order);
      return;
    }

    groups.set(id, {
      id,
      title: lesson.blockTitle ?? "Уроки модуля",
      order: lesson.blockOrder ?? lesson.order,
      isBlock: Boolean(lesson.blockId),
      lessons: [lesson],
    });
  });

  return Array.from(groups.values()).sort((a, b) => a.order - b.order);
}

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
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm font-headline-sm text-m3-on-surface">Модули курса</h2>
        <label className="flex items-center gap-2 text-label-md font-label-md text-m3-on-surface-variant cursor-pointer">
          <Switch checked={hideCompleted} onCheckedChange={toggleHideCompleted} />
          <span className="flex items-center gap-1">
            {hideCompleted ? <Icon name="visibility_off" size={12} aria-hidden="true" /> : <Icon name="visibility" size={12} aria-hidden="true" />}
            Скрыть завершённые
          </span>
        </label>
      </div>

      {visibleModules.map((mod) => {
        const isOpen = openModules.has(mod.id);
        const completedLessons = countCompleted(mod.lessons);
        const lessonGroups = groupLessonsByBlock(mod.lessons);
        const hasBlocks = lessonGroups.some((group) => group.isBlock);

        return (
          <div key={mod.id} className="overflow-hidden rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            <button
              type="button"
              onClick={() => toggleModule(mod.id)}
              aria-expanded={isOpen}
              aria-controls={`module-${mod.id}-lessons`}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
            >
              <span className="shrink-0 text-m3-on-surface-variant">
                {isOpen ? <Icon name="expand_more" size={16} aria-hidden="true" /> : <Icon name="chevron_right" size={16} aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-body-md font-body-md text-m3-on-surface">{formatOrdinalLabel(mod.title, "модуль", mod.order)}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <Progress value={mod.progressPercent} className="h-1.5 w-24" />
                  <span className="text-label-md font-label-md text-m3-on-surface-variant">{mod.progressPercent}%</span>
                  <span className="hidden text-label-md font-label-md text-m3-on-surface-variant sm:inline">
                    {completedLessons}/{mod.lessons.length} уроков
                  </span>
                </div>
              </div>
              {mod.deadline && (
                <StatusBadge
                  status={mod.deadline.overdue ? "overdue" : "upcoming"}
                  label={mod.deadline.overdue ? "Просрочен" : `до ${formatDeadline(mod.deadline.date)}`}
                  className="shrink-0 text-[10px]"
                />
              )}
            </button>

            {isOpen && (
              <div id={`module-${mod.id}-lessons`} className="space-y-4 border-t border-m3-outline-variant px-4 py-4">
                {lessonGroups.map((group) => (
                  <section key={group.id} className="space-y-2" aria-label={group.isBlock ? `Блок ${group.title}` : group.title}>
                    {hasBlocks && (
                      <div className="flex items-center justify-between gap-3 px-1">
                        <h3 className="min-w-0 truncate text-label-lg font-label-lg text-m3-on-surface">
                          {group.isBlock ? formatOrdinalLabel(group.title, "блок", group.order) : group.title}
                        </h3>
                        <span className="shrink-0 text-label-sm font-label-sm text-m3-on-surface-variant">
                          {countCompleted(group.lessons)}/{group.lessons.length}
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      {group.lessons.map((lesson) => (
                        <LessonCard key={lesson.id} lesson={lesson} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
