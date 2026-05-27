"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LessonPlayerCard, ModulePlayerDetail } from "@/types/domain";

const ROOT_GROUP_ID = "__module_lessons__";

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

export function CourseContentsDrawer({
  modules,
  currentLessonId,
  children,
}: {
  modules: ModulePlayerDetail[];
  currentLessonId: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex w-[320px] flex-col bg-m3-surface-container-lowest text-m3-on-surface sm:w-[360px]">
        <div className="border-b border-m3-outline-variant px-5 py-4 text-label-lg font-label-lg text-m3-on-surface">Содержание курса</div>
        <div className="flex-1 space-y-4 overflow-y-auto p-3">
          {modules.map((moduleItem) => {
            const lessonGroups = groupLessonsByBlock(moduleItem.lessons);
            const hasBlocks = lessonGroups.some((group) => group.isBlock);

            return (
              <div key={moduleItem.id} className="space-y-2">
                <div className="flex items-center justify-between text-body-md font-body-md">
                  <span className="min-w-0 truncate font-medium text-m3-on-surface">{formatOrdinalLabel(moduleItem.title, "модуль", moduleItem.order)}</span>
                  <span className="ml-2 shrink-0 text-label-sm font-label-sm text-m3-on-surface-variant">{moduleItem.progressPercent}%</span>
                </div>
                <Progress value={moduleItem.progressPercent} className="h-1" />
                <div className="space-y-2 pl-1">
                  {lessonGroups.map((group) => (
                    <div key={group.id} className="space-y-0.5">
                      {hasBlocks && (
                        <p className="truncate px-2 pt-1 text-[11px] font-semibold uppercase text-m3-on-surface-variant">
                          {group.isBlock ? formatOrdinalLabel(group.title, "блок", group.order) : group.title}
                        </p>
                      )}
                      {group.lessons.map((lesson) => {
                        const isCurrent = lesson.id === currentLessonId;
                        const isLocked = lesson.completionCta === "locked";
                        const isCompleted = lesson.status === "COMPLETED";

                        if (isLocked) {
                          return (
                            <div key={lesson.id} className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2 py-1.5 text-label-sm font-label-sm text-m3-on-surface-variant/50">
                              <Icon name="lock" size={12} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">{lesson.title}</span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={lesson.id}
                            href={`/student/lessons/${lesson.id}`}
                            aria-current={isCurrent ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-label-sm font-label-sm transition-colors hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary",
                              isCurrent && "bg-m3-secondary-container text-m3-secondary font-semibold",
                            )}
                          >
                            {isCompleted ? (
                              <Icon name="check_circle" size={12} fill className="shrink-0 text-m3-tertiary" aria-hidden="true" />
                            ) : isCurrent ? (
                              <Icon name="play_circle" size={12} className="shrink-0 text-m3-secondary" aria-hidden="true" />
                            ) : (
                              <span className="h-3 w-3 shrink-0" aria-hidden="true" />
                            )}
                            <span className="truncate text-m3-on-surface">{lesson.order}. {lesson.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="border-t border-m3-outline-variant pt-3 text-center text-label-sm font-label-sm text-m3-on-surface-variant">
            {modules.reduce((sum, moduleItem) => sum + moduleItem.lessons.filter((lesson) => lesson.status === "COMPLETED").length, 0)}/
            {modules.reduce((sum, moduleItem) => sum + moduleItem.lessons.length, 0)} уроков
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
