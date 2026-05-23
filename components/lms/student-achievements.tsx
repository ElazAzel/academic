"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Sparkles, CheckCircle2, Lock, Calendar } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progressPercent: number;
  xpValue: number;
}

interface StudentAchievementsProps {
  xp: number;
  level: number;
  coursesProgress: Array<{ percent: number; title: string }>;
  questionsCount: number;
}

export function StudentAchievements({ xp, level, coursesProgress, questionsCount }: StudentAchievementsProps) {
  const [activeBadge, setActiveBadge] = useState<string | null>(null);

  // Compute stats for achievements
  const maxCourseProgress = coursesProgress.length > 0 
    ? Math.max(...coursesProgress.map(c => c.percent))
    : 0;

  const completedCourses = coursesProgress.filter(c => c.percent >= 100).length;

  // Custom visual achievements list
  const achievements: Achievement[] = [
    {
      id: "first_step",
      title: "Первый шаг",
      description: "Начните обучение и освойте первый урок любого курса",
      icon: <Sparkles className="h-6 w-6 text-amber-500" />,
      unlocked: maxCourseProgress > 0,
      progressPercent: maxCourseProgress > 0 ? 100 : 0,
      xpValue: 100,
    },
    {
      id: "level_up",
      title: "Быстрый старт",
      description: "Достигните 2-го уровня в рейтинге академии",
      icon: <Flame className="h-6 w-6 text-orange-500" />,
      unlocked: level >= 2,
      progressPercent: Math.min(100, (level / 2) * 100),
      xpValue: 250,
    },
    {
      id: "curious_mind",
      title: "Любознательный ум",
      description: "Задайте свой первый учебный вопрос куратору",
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
      unlocked: questionsCount > 0,
      progressPercent: questionsCount > 0 ? 100 : 0,
      xpValue: 150,
    },
    {
      id: "expert",
      title: "Отличник обучения",
      description: "Пройдите курс более чем на 90% прогресса",
      icon: <Trophy className="h-6 w-6 text-yellow-500" />,
      unlocked: maxCourseProgress >= 90,
      progressPercent: Math.min(100, (maxCourseProgress / 90) * 100),
      xpValue: 500,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500 animate-bounce" />
              <span>Мои Достижения и Статистика</span>
            </CardTitle>
            <CardDescription>
              Развивайте навыки, получайте XP и открывайте премиальные награды Академии.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {/* Active learning streak */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold shadow-sm animate-pulse">
              <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
              <span>5 дней подряд!</span>
            </div>
            <Badge variant="secondary" className="px-2.5 py-1 text-xs">
              {unlockedCount} из {achievements.length} получено
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Visual Weekly Track Checklist */}
        <div className="p-4 rounded-xl border bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Учебный трек за неделю
            </span>
            <span className="font-semibold text-primary">Цель: 3 дня активности</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[
              { day: "Пн", active: true },
              { day: "Вт", active: true },
              { day: "Ср", active: false },
              { day: "Чт", active: true },
              { day: "Пт", active: true },
              { day: "Сб", active: true },
              { day: "Вс", active: false }
            ].map((d, index) => (
              <div 
                key={index}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all duration-300 ${
                  d.active 
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm" 
                    : "bg-muted/40 border border-transparent text-muted-foreground"
                }`}
              >
                <span className="text-[10px] uppercase font-bold">{d.day}</span>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${d.active ? "bg-emerald-500 text-white font-bold" : "bg-muted text-muted-foreground"}`}>
                  {d.active ? "✓" : "•"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Achievements Badges Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {achievements.map((ach) => {
            const isActive = activeBadge === ach.id;
            return (
              <div
                key={ach.id}
                onMouseEnter={() => setActiveBadge(ach.id)}
                onMouseLeave={() => setActiveBadge(null)}
                className={`relative p-4 rounded-xl border transition-all duration-300 cursor-help ${
                  ach.unlocked 
                    ? isActive 
                      ? "border-amber-400 bg-amber-500/[0.04] shadow-md scale-[1.01]" 
                      : "border-m3-outline-variant bg-white"
                    : "border-slate-100 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="flex gap-3">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-transform duration-500 ${
                    ach.unlocked 
                      ? "bg-amber-50 group-hover:scale-105" 
                      : "bg-slate-200"
                  }`}>
                    {ach.unlocked ? ach.icon : <Lock className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold text-sm ${ach.unlocked ? "text-slate-900" : "text-slate-500"}`}>
                        {ach.title}
                      </p>
                      <Badge 
                        variant={ach.unlocked ? "default" : "secondary"} 
                        className={`text-[9px] px-1.5 py-0.5 whitespace-nowrap ${ach.unlocked ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100" : ""}`}
                      >
                        +{ach.xpValue} XP
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ach.description}
                    </p>
                    <div className="pt-1.5 space-y-1">
                      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                        <span>Прогресс</span>
                        <span>{Math.round(ach.progressPercent)}%</span>
                      </div>
                      <Progress value={ach.progressPercent} className={`h-1 ${ach.unlocked ? "[&>div]:bg-amber-500" : "[&>div]:bg-slate-300"}`} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
