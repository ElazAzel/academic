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
        className="cursor-pointer overflow-hidden border-m3-outline-variant bg-m3-surface-container-lowest transition-colors hover:bg-m3-surface-container-low"
      >
        <CardContent className="flex items-center gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed text-label-lg font-label-lg text-m3-primary">
            {levelInfo.level}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-label-md font-semibold text-m3-on-surface">
                Уровень {levelInfo.level}: {levelInfo.name}
              </span>
              <span className="shrink-0 text-label-sm font-bold text-m3-primary">{xp} XP</span>
            </div>
            <div className="mt-1.5">
              <Progress
                value={levelInfo.progress}
                className="h-1.5 bg-m3-surface-container-high [&>div]:bg-m3-primary"
              />
            </div>
            <span className="mt-1 block text-body-sm text-m3-on-surface-variant">
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
