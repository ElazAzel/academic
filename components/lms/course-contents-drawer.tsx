"use client";

import Link from "next/link";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
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
      <SheetContent side="right" className="w-[320px] sm:w-[360px]">
        <div className="px-5 py-4 font-semibold text-sm border-b">Содержание курса</div>
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {modules.map((mod) => (
            <div key={mod.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{mod.title}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{mod.progressPercent}%</span>
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
                        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground/50 cursor-not-allowed">
                          <Lock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                        </div>
                      ) : (
                        <Link
                          href={`/student/lessons/${lesson.id}`}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                            isCurrent && "bg-primary/10 font-medium text-primary"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                          ) : isCurrent ? (
                            <PlayCircle className="h-3 w-3 shrink-0 text-primary" />
                          ) : (
                            <span className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{lesson.order}. {lesson.title}</span>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-3 text-xs text-muted-foreground text-center border-t">
            {modules.reduce((sum, m) => sum + m.lessons.filter((l) => l.status === "COMPLETED").length, 0)}/
            {modules.reduce((sum, m) => sum + m.lessons.length, 0)} уроков
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
