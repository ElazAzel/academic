"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { XpCenterModal } from "./xp-center-modal";

interface XpDisplayClientProps {
  xp: number;
  levelInfo: { level: number; name: string; progress: number };
}

export function XpDisplayClient({ xp, levelInfo }: XpDisplayClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer transition-colors hover:border-primary/25"
      >
        <CardContent className="flex items-center gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-sm font-semibold text-primary tabular-nums">
            {levelInfo.level}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                Уровень {levelInfo.level}: {levelInfo.name}
              </span>
              <span className="shrink-0 text-sm font-bold text-primary tabular-nums">{xp} XP</span>
            </div>
            <div className="mt-1.5">
              <Progress
                value={levelInfo.progress}
                className="h-1.5 bg-muted [&>div]:bg-primary"
              />
            </div>
            <span className="mt-1 block text-body-sm text-muted-foreground">
              {levelInfo.progress < 100
                ? `${levelInfo.progress}% до следующего уровня`
                : "Максимальный уровень"}
            </span>
          </div>
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
