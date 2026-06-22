"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { XpCenterModal } from "@/components/lms/xp-center-modal";
import { Calendar, CheckCircle2, ChevronDown, Flame, Lock, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  unlocked: boolean;
  progressPercent: number;
  xpValue: number;
}

interface StudentAchievementsProps {
  xp: number;
  levelInfo: { level: number; name: string; progress: number };
  coursesProgress: Array<{ percent: number; title: string }>;
  questionsCount: number;
  weeklyTrack?: Array<{ day: string; active: boolean }>;
}

const defaultWeeklyTrack = [
  { day: "Пн", active: false },
  { day: "Вт", active: false },
  { day: "Ср", active: false },
  { day: "Чт", active: false },
  { day: "Пт", active: false },
  { day: "Сб", active: false },
  { day: "Вс", active: false },
];

export function StudentAchievements({ xp, levelInfo, coursesProgress, questionsCount, weeklyTrack = defaultWeeklyTrack }: StudentAchievementsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const maxCourseProgress = coursesProgress.length > 0
    ? Math.max(...coursesProgress.map((course) => course.percent))
    : 0;
  const completedCourses = coursesProgress.filter((course) => course.percent >= 100).length;

  const achievements: Achievement[] = [
    {
      id: "first_step",
      title: "Первый шаг",
      description: "Начните обучение и освойте первый урок любого курса",
      icon: <Sparkles className="h-5 w-5 text-amber-500" />,
      unlocked: maxCourseProgress > 0,
      progressPercent: maxCourseProgress > 0 ? 100 : 0,
      xpValue: 100,
    },
    {
      id: "level_up",
      title: "Быстрый старт",
      description: "Достигните 2-го уровня в рейтинге академии",
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      unlocked: levelInfo.level >= 2,
      progressPercent: Math.min(100, (levelInfo.level / 2) * 100),
      xpValue: 250,
    },
    {
      id: "curious_mind",
      title: "Любознательный ум",
      description: "Задайте свой первый учебный вопрос куратору",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      unlocked: questionsCount > 0,
      progressPercent: questionsCount > 0 ? 100 : 0,
      xpValue: 150,
    },
    {
      id: "expert",
      title: "Отличник обучения",
      description: "Пройдите курс более чем на 90% прогресса",
      icon: <Trophy className="h-5 w-5 text-yellow-500" />,
      unlocked: maxCourseProgress >= 90,
      progressPercent: Math.min(100, (maxCourseProgress / 90) * 100),
      xpValue: 500,
    },
  ];

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <>
      <Card className="overflow-hidden border-m3-outline-variant bg-m3-surface-container-lowest">
        <CardHeader className="border-b border-m3-outline-variant/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2 text-headline-sm text-m3-on-surface">
                <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
                <span>Уровень и достижения</span>
              </CardTitle>
              <CardDescription className="text-body-sm text-m3-on-surface-variant">
                Уровень, активность и достижения
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">{xp} XP</Badge>
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">
                {completedCourses} завершено
              </Badge>
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">
                {unlockedCount}/{achievements.length}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex w-full items-center gap-4 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4 text-left transition-colors hover:bg-m3-surface-container"
            aria-label="Открыть центр развития"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed text-label-lg font-label-lg text-m3-primary">
              {levelInfo.level}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-label-md font-semibold text-m3-on-surface">
                Уровень {levelInfo.level}: {levelInfo.name}
              </span>
              <span className="mt-2 block">
                <Progress
                  value={levelInfo.progress}
                  className="h-1.5 bg-m3-surface-container-high [&>div]:bg-m3-primary"
                />
              </span>
              <span className="mt-1 block text-body-sm text-m3-on-surface-variant">
                {levelInfo.progress < 100
                  ? `${levelInfo.progress}% до следующего уровня`
                  : "Максимальный уровень"}
              </span>
            </span>
          </button>

          <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between text-body-sm text-m3-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Активность на неделе
              </span>
              <span className="font-medium text-m3-primary">{weeklyTrack.filter((d) => d.active).length} дней</span>
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weeklyTrack.map((item) => (
                <div
                  key={item.day}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border py-1.5 text-[10px] font-semibold uppercase uppercase-tracking",
                    item.active
                      ? "border-m3-primary-fixed-dim bg-m3-primary-fixed/20 text-m3-primary"
                      : "border-transparent bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span>{item.day}</span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full text-[9px]",
                      item.active ? "bg-m3-primary text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.active ? "✓" : "–"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <details className="group rounded-lg border border-m3-outline-variant">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left">
              <span className="min-w-0">
                <span className="block text-label-md font-medium text-m3-on-surface">Достижения</span>
                <span className="block text-body-sm text-m3-on-surface-variant">
                  {unlockedCount} из {achievements.length} получено
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-m3-on-surface-variant transition-transform group-open:rotate-180" />
            </summary>

            <div className="grid gap-3 border-t border-m3-outline-variant p-4 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    "flex gap-3 rounded-lg border p-3",
                    achievement.unlocked
                      ? "border-m3-outline-variant"
                      : "border-m3-outline-variant/40 bg-muted/20 opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      achievement.unlocked ? "bg-amber-50" : "bg-muted",
                    )}
                  >
                    {achievement.unlocked ? (
                      achievement.icon
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          achievement.unlocked ? "text-m3-on-surface" : "text-muted-foreground",
                        )}
                      >
                        {achievement.title}
                      </span>
                      <Badge
                        variant={achievement.unlocked ? "default" : "secondary"}
                        className="shrink-0 px-1.5 py-0.5 text-[10px]"
                      >
                        +{achievement.xpValue} XP
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-body-xs text-muted-foreground">{achievement.description}</span>
                    <span className="mt-1.5 block">
                      <Progress
                        value={achievement.progressPercent}
                        className={cn(
                          "h-1",
                          achievement.unlocked ? "[&>div]:bg-amber-500" : "[&>div]:bg-muted-foreground/30",
                        )}
                      />
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      <XpCenterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        xp={xp}
        levelInfo={levelInfo}
      />
    </>
  );
}
