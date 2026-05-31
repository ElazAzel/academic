"use client";

import { Flame, Zap, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  heatmap: Array<{ date: string; active: boolean; xpEarned: number }>;
}

export function StreakWidget({ currentStreak, longestStreak, heatmap }: StreakWidgetProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4">
          <Flame className={cn("h-8 w-8", currentStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          <div>
            <p className="text-display-sm font-bold tabular-nums">{currentStreak}</p>
            <p className="text-xs text-m3-on-surface-variant">Текущая серия (дней)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4">
          <Zap className="h-8 w-8 text-m3-primary" />
          <div>
            <p className="text-display-sm font-bold tabular-nums">{longestStreak}</p>
            <p className="text-xs text-m3-on-surface-variant">Лучшая серия</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Активность за 30 дней</span>
        </div>
        <div className="grid grid-cols-6 gap-1" role="img" aria-label="Тепловая карта активности за 30 дней">
          {heatmap.map((day) => (
            <div
              key={day.date}
              className={cn(
                "aspect-square rounded-sm transition-colors",
                day.active
                  ? day.xpEarned > 1
                    ? "bg-m3-primary"
                    : "bg-m3-primary-fixed-dim"
                  : "bg-muted/30",
              )}
              title={`${day.date}: ${day.active ? `${day.xpEarned} XP` : "нет активности"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
