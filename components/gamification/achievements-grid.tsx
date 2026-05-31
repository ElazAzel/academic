"use client";

import { cn } from "@/lib/utils";
import { Footprints, BookOpen, Library, Coins, Award, Trophy, ClipboardCheck, Target, FileCheck, Flame, Zap, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints, BookOpen, Library, Coins, Award, Trophy,
  ClipboardCheck, Target, FileCheck, Flame, Zap, Star,
};

interface AchievementItem {
  slug: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  achieved: boolean;
  achievedAt: string | null;
}

export function AchievementsGrid({ achievements }: { achievements: AchievementItem[] }) {
  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
        <Award className="h-8 w-8 opacity-30" />
        <p>Нет доступных ачивок</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {achievements.map((a) => {
        const Icon = ICON_MAP[a.icon] ?? Award;
        return (
          <div
            key={a.slug}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all",
              a.achieved
                ? "border-m3-primary-fixed-dim bg-m3-primary-fixed/10"
                : "border-m3-outline-variant/40 bg-muted/10 opacity-50 grayscale",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                a.achieved ? "bg-m3-primary-fixed text-m3-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-m3-on-surface">{a.title}</p>
              <p className="mt-0.5 text-[10px] text-m3-on-surface-variant">{a.description}</p>
              {a.achieved ? (
                <p className="mt-1 text-[10px] font-semibold text-m3-primary">+{a.xpReward} XP</p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">+{a.xpReward} XP</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
