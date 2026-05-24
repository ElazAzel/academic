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
        className="group h-full cursor-pointer overflow-hidden border-m3-outline-variant bg-gradient-to-r from-m3-primary-fixed/15 to-m3-tertiary-fixed/15 shadow-m3-soft transition-all duration-300 hover:scale-[1.01] hover:shadow-m3-soft-hover"
      >
        <CardContent className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          {/* Level badge with micro-animation on hover */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed text-label-lg font-label-lg text-m3-primary transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105">
        className="overflow-hidden border-m3-outline-variant/60 glass-card-premium cursor-pointer relative active:scale-[0.99] transition-transform duration-150"
      >
        {/* Decorative inner glow for active student */}
        <div className="absolute inset-0 bg-gradient-to-r from-m3-primary/5 to-m3-tertiary/5 opacity-40 pointer-events-none" />
        <CardContent className="relative flex items-center gap-4 p-4 z-10">
          {/* Level badge */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-m3-primary-fixed to-m3-tertiary-fixed text-label-lg font-label-lg text-m3-primary shadow-sm">
            {levelInfo.level}
          </div>

          {/* Info */}
          <div className="min-w-0 w-full flex-1 space-y-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-label-md font-label-md text-m3-on-surface">
                Уровень {levelInfo.level}: {levelInfo.name}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-label-sm font-label-sm text-m3-primary font-semibold">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-semibold text-m3-on-surface">
                Уровень {levelInfo.level}: {levelInfo.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-label-sm font-bold text-m3-primary">
                  {xp} XP
                </span>
                <Icon name="chevron_right" size={16} className="text-m3-primary" />
              </div>
            </div>
            <Progress value={levelInfo.progress} className="h-1.5 bg-m3-surface-container-high [&>div]:bg-m3-primary" />
            <div className="flex flex-col gap-1 text-[11px] text-m3-on-surface-variant/70 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
            <Progress value={levelInfo.progress} className="h-2 bg-m3-surface-container-high [&>div]:bg-gradient-to-r [&>div]:from-m3-primary [&>div]:to-m3-secondary" />
            <div className="flex items-center justify-between text-[11px] text-m3-on-surface-variant/80">
              <span>
                {levelInfo.progress < 100
                  ? `${levelInfo.progress}% до следующего уровня`
                  : "Максимальный уровень достигнут!"}
              </span>
              <span className="font-medium text-m3-primary transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                Открыть центр развития ↗
              <span className="font-medium text-m3-primary text-[10px] sm:text-[11px]">
                Центр развития ↗
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
