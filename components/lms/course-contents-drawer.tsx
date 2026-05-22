"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ModulePlayerDetail } from "@/types/domain";

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
      <SheetContent side="right" className="w-[320px] sm:w-[360px] bg-m3-surface-container-lowest text-m3-on-surface">
        <div className="px-5 py-4 text-label-lg font-label-lg border-b border-m3-outline-variant text-m3-on-surface">Содержание курса</div>
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {modules.map((mod) => (
            <div key={mod.id} className="space-y-1">
              <div className="flex items-center justify-between text-body-md font-body-md">
                <span className="font-medium text-m3-on-surface truncate">{mod.title}</span>
                <span className="text-label-sm font-label-sm text-m3-on-surface-variant shrink-0 ml-2">{mod.progressPercent}%</span>
              </div>
              <Progress value={mod.progressPercent} className="h-1" />
              <div className="space-y-0.5 pl-1">
                {mod.lessons.map((lesson) => {
                  const isCurrent = lesson.id === currentLessonId;
                  const isLocked = lesson.completionCta === "locked";
                  const isCompleted = lesson.status === "COMPLETED";
                  return (
                    <div key={lesson.id}>
                      {isLocked ? (
                        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-label-sm font-label-sm text-m3-on-surface-variant/50 cursor-not-allowed">
                          <Icon name="lock" size={12} className="shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                        </div>
                      ) : (
                        <Link
                          href={`/student/lessons/${lesson.id}`}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-label-sm font-label-sm transition-colors hover:bg-m3-surface-container-high",
                            isCurrent && "bg-m3-secondary-container text-m3-secondary font-semibold"
                          )}
                        >
                          {isCompleted ? (
                            <Icon name="check_circle" size={12} fill className="shrink-0 text-m3-tertiary" />
                          ) : isCurrent ? (
                            <Icon name="play_circle" size={12} className="shrink-0 text-m3-secondary" />
                          ) : (
                            <span className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate text-m3-on-surface">{lesson.order}. {lesson.title}</span>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-3 text-label-sm font-label-sm text-m3-on-surface-variant text-center border-t border-m3-outline-variant">
            {modules.reduce((sum, m) => sum + (m.lessons ?? []).filter((l) => l.status === "COMPLETED").length, 0)}/
            {modules.reduce((sum, m) => sum + (m.lessons ?? []).length, 0)} уроков
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
