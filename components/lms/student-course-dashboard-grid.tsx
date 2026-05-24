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
  { id: "completed", label: "Завершенные", icon: "check_circle" },
  { id: "paused", label: "Приостановленные", icon: "pause_circle" },
];

export function StudentCourseDashboardGrid({ courses }: StudentCourseDashboardGridProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (activeTab === "all") return true;
      if (activeTab === "in_progress") return (c.status === "IN_PROGRESS" || c.status === "NOT_STARTED") && c.percent < 100;
      if (activeTab === "completed") return c.percent >= 100 || c.status === "COMPLETED";
      if (activeTab === "paused") return c.status === "BLOCKED";
      return true;
    });
  }, [courses, activeTab]);

  // Расчет прогноза окончания курса на основе процента прогресса
  const getForecastText = (percent: number, status: string) => {
    if (status === "BLOCKED") {
      return "Обучение приостановлено";
    }
    if (percent >= 100) {
      return "Курс полностью пройден! 🎉";
    }
    const remaining = 100 - percent;
    // Округляем до недель: например, 50% = 2 недели при среднем темпе 25% в неделю
    const weeksRemaining = Math.max(1, Math.round(remaining / 25));
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeksRemaining * 7);
    
    const formattedDate = targetDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `Осталось: ~${weeksRemaining} нед. (завершение к ${formattedDate})`;
  };

  return (
    <div className="space-y-4">
      {/* Premium Tab Bar for Course Filtering */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-m3-outline-variant pb-2">
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
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 font-label-md text-label-md transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-m3-primary text-m3-on-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:bg-m3-surface-container-high"
                )}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  activeTab === tab.id
                    ? "bg-m3-on-primary text-m3-primary"
                    : "bg-m3-surface-container-highest text-m3-on-surface-variant"
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
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest p-8 text-center rounded-2xl shadow-m3-soft">
          <CardContent className="space-y-2 py-4">
            <Icon name="search_off" size={40} className="mx-auto text-m3-outline" />
            <p className="font-label-lg text-label-lg text-m3-on-surface">Нет курсов в этой категории</p>
            <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
              Попробуйте выбрать другую вкладку или начните новый курс в каталоге.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => (
            <FadeIn key={c.courseId}>
              <CardHover>
                <Card className="relative overflow-hidden rounded-2xl border-m3-outline-variant/60 glass-card-premium">
                  {/* Visual Top Decorative Accent */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-m3-primary via-m3-secondary to-m3-tertiary" />

                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={c.status as BadgeStatus} />
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-m3-primary-fixed/30 text-m3-primary">
                        <Icon name="menu_book" size={18} />
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 text-headline-sm font-headline-sm text-m3-on-surface">
                      {c.courseTitle}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem] font-body-sm text-body-sm text-m3-on-surface-variant/90">
                      {c.currentModuleTitle 
                        ? `${c.currentModuleTitle} ${c.currentLessonTitle ? `→ ${c.currentLessonTitle}` : ""}`
                        : "Уроки еще не начаты"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-body-sm font-body-sm text-m3-on-surface-variant">
                        <span>Прогресс курса</span>
                        <span className="font-semibold text-m3-primary">{c.percent}%</span>
                      </div>
                      <Progress value={c.percent} className="h-1.5 bg-m3-surface-container-high [&>div]:bg-gradient-to-r [&>div]:from-m3-primary [&>div]:to-m3-secondary" />
                    </div>

                    {/* Completion Forecast Block with dynamic micro-details */}
                    <div className="flex items-center gap-2 rounded-xl bg-m3-surface-container-low/80 p-2.5 text-body-xs font-body-xs text-m3-on-surface-variant/90 border border-m3-outline-variant/20">
                      <Icon 
                        name={c.percent >= 100 ? "workspace_premium" : c.status === "BLOCKED" ? "pause" : "schedule"} 
                        size={16} 
                        className={cn(
                          c.percent >= 100 ? "text-emerald-500" : c.status === "BLOCKED" ? "text-amber-500" : "text-m3-primary"
                        )}
                      />
                      <span className="truncate">{getForecastText(c.percent, c.status)}</span>
                    </div>

                    <Button asChild className="w-full rounded-xl btn-shine shadow-m3-soft hover:shadow-m3-soft-hover" size="sm" variant={c.status === "BLOCKED" ? "secondary" : "primary"}>
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
