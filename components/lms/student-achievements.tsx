"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { XpCenterModal } from "@/components/lms/xp-center-modal";
import { Calendar, CheckCircle2, ChevronDown, ChevronRight, Flame, Lock, Sparkles, Trophy } from "lucide-react";
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
}

const weeklyTrack = [
  { day: "Пн", active: true },
  { day: "Вт", active: true },
  { day: "Ср", active: false },
  { day: "Чт", active: true },
  { day: "Пт", active: true },
  { day: "Сб", active: true },
  { day: "Вс", active: false },
];

export function StudentAchievements({ xp, levelInfo, coursesProgress, questionsCount }: StudentAchievementsProps) {
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
      <Card className="overflow-hidden rounded-xl border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
        <CardHeader className="border-b border-m3-outline-variant/70 bg-gradient-to-r from-m3-primary/5 to-m3-tertiary/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2 text-headline-sm text-m3-on-surface">
                <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
                <span className="min-w-0 break-words">Уровень и достижения</span>
              </CardTitle>
              <CardDescription className="text-body-sm text-m3-on-surface-variant">
                Прогресс развития и награды студента в одном компактном блоке.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">{xp} XP</Badge>
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">
                Завершено: {completedCourses}
              </Badge>
              <Badge variant="secondary" className="whitespace-nowrap px-2.5 py-1 text-xs">
                {unlockedCount}/{achievements.length} ачивки
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex w-full flex-col gap-3 rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-3 text-left transition-colors hover:bg-m3-surface-container sm:flex-row sm:items-center sm:p-4"
            aria-label="Открыть центр развития"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-m3-primary-fixed to-m3-tertiary-fixed text-label-lg font-label-lg text-m3-primary shadow-sm">
              {levelInfo.level}
            </span>
            <span className="min-w-0 flex-1 space-y-1.5">
              <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-label-lg text-label-lg text-m3-on-surface">
                  Уровень {levelInfo.level}: {levelInfo.name}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-label-sm font-semibold text-m3-primary">
                  Центр развития <ChevronRight className="h-4 w-4" />
                </span>
              </span>
              <Progress
                value={levelInfo.progress}
                className="h-2 bg-m3-surface-container-high [&>div]:bg-gradient-to-r [&>div]:from-m3-primary [&>div]:to-m3-secondary"
              />
              <span className="block text-body-sm text-m3-on-surface-variant">
                {levelInfo.progress < 100
                  ? `${levelInfo.progress}% до следующего уровня`
                  : "Максимальный уровень достигнут"}
              </span>
            </span>
          </button>

          <div className="rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-3">
            <div className="mb-2 flex flex-col gap-1 text-xs text-m3-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Учебный трек за неделю
              </span>
              <span className="font-semibold text-m3-primary">Цель: 3 дня</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weeklyTrack.map((item) => (
                <div
                  key={item.day}
                  className={cn(
                    "flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-[10px] font-bold uppercase",
                    item.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-transparent bg-muted/40 text-muted-foreground",
                  )}
                >
                  <span>{item.day}</span>
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                    item.active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                  )}>
                    {item.active ? "✓" : "•"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <details className="group rounded-xl border border-m3-outline-variant bg-m3-surface-container-low">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-left">
              <span className="min-w-0">
                <span className="block font-label-lg text-label-lg text-m3-on-surface">Достижения</span>
                <span className="block text-body-sm text-m3-on-surface-variant">
                  Карточки наград скрыты, чтобы дашборд оставался компактным.
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" className="whitespace-nowrap text-xs">
                  {unlockedCount}/{achievements.length}
                </Badge>
                <ChevronDown className="h-4 w-4 text-m3-on-surface-variant transition-transform group-open:rotate-180" />
              </span>
            </summary>

            <div className="grid gap-3 border-t border-m3-outline-variant p-3 sm:grid-cols-2 xl:grid-cols-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    "rounded-xl border p-3",
                    achievement.unlocked
                      ? "border-m3-outline-variant bg-white"
                      : "border-slate-100 bg-slate-50/70 opacity-70",
                  )}
                >
                  <div className="flex gap-3">
                    <span className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner",
                      achievement.unlocked ? "bg-amber-50" : "bg-slate-200",
                    )}>
                      {achievement.unlocked ? achievement.icon : <Lock className="h-5 w-5 text-slate-400" />}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn(
                          "min-w-0 truncate text-sm font-semibold",
                          achievement.unlocked ? "text-slate-900" : "text-slate-500",
                        )}>
                          {achievement.title}
                        </span>
                        <Badge
                          variant={achievement.unlocked ? "default" : "secondary"}
                          className={cn(
                            "shrink-0 whitespace-nowrap px-1.5 py-0.5 text-[9px]",
                            achievement.unlocked && "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100",
                          )}
                        >
                          +{achievement.xpValue} XP
                        </Badge>
                      </span>
                      <span className="line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                        {achievement.description}
                      </span>
                      <span className="block space-y-1 pt-1">
                        <span className="flex justify-between text-[9px] font-mono text-muted-foreground">
                          <span>Прогресс</span>
                          <span>{Math.round(achievement.progressPercent)}%</span>
                        </span>
                        <Progress
                          value={achievement.progressPercent}
                          className={cn("h-1", achievement.unlocked ? "[&>div]:bg-amber-500" : "[&>div]:bg-slate-300")}
                        />
                      </span>
                    </span>
                  </div>
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
