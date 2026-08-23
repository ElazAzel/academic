"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/lms/status-badge";
import type { BadgeStatus } from "@/components/lms/status-badge";
import { Icon } from "@/components/ui/icon";
import { Stagger, CardHover, FadeIn } from "@/components/lms/animations";
import { cn } from "@/lib/utils";
import type { StudentProgress } from "@/types/domain";

interface StudentCourseDashboardGridProps {
  courses: StudentProgress[];
}

const TABS = [
  { id: "all", label: "Все курсы", icon: "grid_view" },
  { id: "in_progress", label: "В процессе", icon: "hourglass_empty" },
  { id: "completed", label: "Завершённые", icon: "check_circle" },
  { id: "paused", label: "Приостановленные", icon: "pause_circle" },
] as const;

type CourseTabId = (typeof TABS)[number]["id"];

export function StudentCourseDashboardGrid({ courses }: StudentCourseDashboardGridProps) {
  const [activeTab, setActiveTab] = useState<CourseTabId>("all");

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeTab === "all") return true;
      if (activeTab === "in_progress") return (c.status === "IN_PROGRESS" || c.status === "NOT_STARTED") && c.percent < 100;
      if (activeTab === "completed") return c.percent >= 100 || c.status === "COMPLETED";
      if (activeTab === "paused") return c.status === "BLOCKED";
      return true;
    });
  }, [courses, activeTab]);

  const getCourseStateText = (course: StudentProgress) => {
    if (course.status === "BLOCKED") return "Доступ к обучению приостановлен";
    if (course.percent >= 100 || course.status === "COMPLETED") return "Все обязательные уроки завершены";
    if (course.currentLessonTitle) return `Следующий урок: ${course.currentLessonTitle}`;
    if (course.currentModuleTitle) return `Текущий модуль: ${course.currentModuleTitle}`;
    return "Откройте курс и выберите доступный урок";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--academy-line)] pb-2">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const count = courses.filter((c) => {
              if (tab.id === "all") return true;
              if (tab.id === "in_progress") return (c.status === "IN_PROGRESS" || c.status === "NOT_STARTED") && c.percent < 100;
              if (tab.id === "completed") return c.percent >= 100 || c.status === "COMPLETED";
              if (tab.id === "paused") return c.status === "BLOCKED";
              return true;
            }).length;

            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  activeTab === tab.id
                    ? "bg-primary/[0.08] text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Courses */}
      {filteredCourses.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent className="space-y-2 py-4">
            <Icon name="search_off" size={40} className="mx-auto text-muted-foreground/60" />
            <p className="text-base font-semibold text-foreground">Нет курсов в этой категории</p>
            <p className="text-sm text-muted-foreground">
              Попробуйте выбрать другую вкладку или дождитесь назначения курса академией.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => (
            <FadeIn key={c.courseId}>
              <CardHover>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={c.status as BadgeStatus} />
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                        <Icon name="menu_book" size={18} />
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 text-headline-sm font-headline-sm text-foreground">
                      {c.courseTitle}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem] font-body-sm text-body-sm text-muted-foreground">
                      {c.currentModuleTitle 
                        ? `${c.currentModuleTitle} ${c.currentLessonTitle ? `→ ${c.currentLessonTitle}` : ""}`
                        : "Уроки ещё не начаты"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-muted-foreground">
                        <span>Прогресс курса</span>
                        <span className="font-semibold text-primary">{c.percent}%</span>
                      </div>
                      <Progress value={c.percent} className="h-1.5 bg-muted [&>div]:bg-primary" />
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                      <Icon 
                        name={c.percent >= 100 ? "workspace_premium" : c.status === "BLOCKED" ? "pause" : "schedule"} 
                        size={16} 
                        className={cn(
                          "shrink-0",
                          c.percent >= 100 ? "text-success" : c.status === "BLOCKED" ? "text-warning" : "text-primary"
                        )}
                      />
                      <span className="line-clamp-2 min-w-0">{getCourseStateText(c)}</span>
                    </div>

                    <Button asChild className="w-full" size="sm" variant={c.status === "BLOCKED" ? "secondary" : "primary"}>
                      <Link href={c.nextLessonId ? `/student/lessons/${c.nextLessonId}` : `/student/courses/${c.courseId}`}>
                        <span>{c.nextLessonId ? "Продолжить" : "Открыть курс"}</span>
                        <Icon name="arrow_forward" size={16} />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </CardHover>
            </FadeIn>
          ))}
        </Stagger>
      )}
    </div>
  );
}
