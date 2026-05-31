"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  name: string | null;
  xp: number;
}

const TOP_ICONS = [Trophy, Medal, Award];

function getLevel(xp: number): number {
  if (xp >= 5000) return 6;
  if (xp >= 2000) return 5;
  if (xp >= 1000) return 4;
  if (xp >= 500) return 3;
  if (xp >= 200) return 2;
  return 1;
}

function getLevelName(level: number): string {
  const names: Record<number, string> = { 1: "Новичок", 2: "Ученик", 3: "Исследователь", 4: "Эксперт", 5: "Магистр", 6: "Легенда" };
  return names[level] ?? "";
}

export function LeaderboardPanel() {
  const { data: session } = useSession();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/leaderboard")
      .then((r) => r.json())
      .then((data) => { setLeaders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Загрузка...
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
        <Trophy className="h-8 w-8 opacity-30" />
        <p>Пока нет данных для лидерборда</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {leaders.map((entry, idx) => {
        const TopIcon = TOP_ICONS[idx];
        const isMe = entry.id === session?.user?.id;
        const level = getLevel(entry.xp);

        return (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              isMe ? "bg-m3-primary-fixed/20" : "hover:bg-muted/50",
            )}
          >
            <div className="flex w-8 items-center justify-center">
              {idx < 3 ? (
                <TopIcon className={cn("h-5 w-5", idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-amber-600")} />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{idx + 1}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.name ?? "Без имени"}</p>
              <p className="text-xs text-muted-foreground">{getLevelName(level)} · Уровень {level}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-m3-primary">{entry.xp} XP</span>
          </div>
        );
      })}
    </div>
  );
}
