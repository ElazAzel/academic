"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { XpCenterModal } from "./xp-center-modal";
import { Icon } from "@/components/ui/icon";

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
        className="group overflow-hidden border-m3-outline-variant bg-gradient-to-r from-m3-primary-fixed/15 to-m3-tertiary-fixed/15 shadow-m3-soft transition-all duration-300 hover:shadow-m3-soft-hover hover:scale-[1.01] cursor-pointer"
      >
        <CardContent className="relative flex items-center gap-4 p-4">
          {/* Level badge with micro-animation on hover */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed text-label-lg font-label-lg text-m3-primary transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105">
            {levelInfo.level}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-label-md text-m3-on-surface">
                Уровень {levelInfo.level}: {levelInfo.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-label-sm font-label-sm text-m3-primary font-semibold">
                  {xp} XP
                </span>
                <Icon name="chevron_right" size={16} className="text-m3-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
            <Progress value={levelInfo.progress} className="h-1.5 bg-m3-surface-container-high [&>div]:bg-m3-primary" />
            <div className="flex items-center justify-between text-[11px] text-m3-on-surface-variant/70">
              <span>
                {levelInfo.progress < 100
                  ? `${levelInfo.progress}% до следующего уровня`
                  : "Максимальный уровень достигнут!"}
              </span>
              <span className="font-medium text-m3-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Открыть центр развития ↗
              </span>
            </div>
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
