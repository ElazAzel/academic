"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ArrowUpDown, Users, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CuratorLoad } from "@/types/domain";

type SortKey = "questionsAnswered" | "avgResponseHours" | "studentsCount" | "messagesSent" | "openQuestions";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "questionsAnswered", label: "Отвечено" },
  { key: "avgResponseHours", label: "Скорость ответа" },
  { key: "messagesSent", label: "Сообщений" },
  { key: "studentsCount", label: "Слушателей" },
  { key: "openQuestions", label: "Открытых вопросов" },
];

export function CuratorLeaderboard({ curators }: { curators: CuratorLoad[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("questionsAnswered");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...curators].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "questionsAnswered": cmp = a.questionsAnswered - b.questionsAnswered; break;
      case "avgResponseHours": cmp = a.avgResponseHours - b.avgResponseHours; break;
      case "messagesSent": cmp = a.messagesSent - b.messagesSent; break;
      case "studentsCount": cmp = a.studentsCount - b.studentsCount; break;
      case "openQuestions": cmp = a.openQuestions - b.openQuestions; break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "avgResponseHours" || key === "openQuestions"); // bad = asc for these
    }
  };

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => toggleSort(opt.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              sortKey === opt.key
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <ArrowUpDown className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard table */}
      <div className="space-y-2">
        {sorted.map((c, i) => {
          const medal = getMedal(i);
          const responseTimeOk = c.avgResponseHours <= 4;
          return (
            <Card
              key={c.curatorId}
              className={cn(
                "transition-shadow hover:shadow-sm",
                i < 3 && "border-primary/20"
              )}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* Rank */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-lg">
                  {medal ?? <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar name={c.curatorName} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.curatorName}</p>
                      {c.isOnline ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                          <Circle className="h-2 w-2 fill-emerald-500" />
                          Онлайн
                        </span>
                      ) : c.lastSeenAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          {formatLastSeen(c.lastSeenAt)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.studentsCount}
                      </span>
                      {c.openQuestions > 0 && (
                        <span className={cn("flex items-center gap-1", c.openQuestions > 5 && "text-rose-600 font-medium")}>
                          <AlertTriangle className="h-3 w-3" />
                          {c.openQuestions} откр.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center shrink-0">
                  <div className="min-w-[60px]">
                    <p className="text-xs font-semibold">{c.questionsAnswered}</p>
                    <p className="text-[10px] text-muted-foreground">отвечено</p>
                  </div>
                  <div className="min-w-[60px]">
                    <p className={cn("text-xs font-semibold", !responseTimeOk && "text-amber-600")}>
                      {c.avgResponseHours > 0 ? `${c.avgResponseHours}ч` : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">ответ</p>
                  </div>
                  <div className="min-w-[60px]">
                    <p className="text-xs font-semibold">{c.messagesSent}</p>
                    <p className="text-[10px] text-muted-foreground">сообщ.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}м назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  return new Date(iso).toLocaleDateString("ru");
}
