"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/ui/icon";
import { XP_LEVELS } from "@/lib/xp-utils";
import { cn } from "@/lib/utils";

interface XpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  xp: number;
  levelInfo: { level: number; name: string; progress: number };
}

const XP_QUESTS = [
  { id: "lesson", label: "Прохождение урока", xp: "+10 XP", desc: "Завершите все учебные блоки и видео в уроке.", icon: "auto_stories", color: "text-blue-500 bg-blue-500/10" },
  { id: "quiz", label: "Идеальный тест", xp: "+15 XP", desc: "Сдайте любой тест урока на 100% правильных ответов.", icon: "quiz", color: "text-amber-500 bg-amber-500/10" },
  { id: "assignment", label: "Сдача вовремя", xp: "+20 XP", desc: "Отправьте домашнее задание куратору до наступления дедлайна.", icon: "assignment_turned_in", color: "text-emerald-500 bg-emerald-500/10" },
  { id: "discussion", label: "Активность в сообществе", xp: "+5 XP", desc: "Оставьте конструктивный комментарий или ответьте в обсуждении.", icon: "forum", color: "text-indigo-500 bg-indigo-500/10" },
];

export function XpCenterModal({ isOpen, onClose, xp, levelInfo }: XpCenterModalProps) {
  // Вычисляем, сколько XP нужно до следующего уровня
  const currentLevelIdx = XP_LEVELS.findIndex((l) => l.level === levelInfo.level);
  const nextLevel = currentLevelIdx !== -1 && currentLevelIdx < XP_LEVELS.length - 1
    ? XP_LEVELS[currentLevelIdx + 1]
    : null;
  const xpLeft = nextLevel ? nextLevel.xpRequired - xp : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl overflow-hidden rounded-3xl border border-m3-outline-variant bg-m3-surface-container-lowest/90 p-0 shadow-m3-soft backdrop-blur-md">
        {/* Glassmorphic Top Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-m3-primary/10 via-transparent to-m3-tertiary/10 p-6 pb-4">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-m3-primary/5 blur-2xl" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-m3-primary-fixed text-m3-primary">
                <Icon name="military_tech" size={24} />
              </span>
              <div>
                <DialogTitle className="text-headline-sm font-headline-sm text-m3-on-surface">
                  Центр развития XP
                </DialogTitle>
                <DialogDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">
                  Ваш прогресс обучения, награды и геймификация.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-2">
          {/* Active Level Progress Card */}
          <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-md font-label-md text-m3-on-surface-variant">Текущий уровень</p>
                <p className="text-headline-md font-headline-md text-m3-on-surface">
                  {levelInfo.level} — {levelInfo.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-display-sm font-bold text-m3-primary leading-none">{xp}</p>
                <p className="text-label-sm font-label-sm text-m3-on-surface-variant">Всего XP</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Progress value={levelInfo.progress} className="h-2.5 bg-m3-surface-container-high [&>div]:bg-m3-primary" />
              <div className="flex items-center justify-between text-body-sm font-body-sm text-m3-on-surface-variant">
                <span>{levelInfo.progress}% прогресса уровня</span>
                {nextLevel ? (
                  <span>Осталось {xpLeft} XP до уровня {nextLevel.level}</span>
                ) : (
                  <span>Максимальный уровень достигнут! 👑</span>
                )}
              </div>
            </div>
          </div>

          {/* Level Roadmap Grid */}
          <div>
            <h3 className="mb-3 text-label-lg font-label-lg text-m3-on-surface">Линия развития</h3>
            <div className="relative flex items-center justify-between px-2">
              {/* Timeline Connector Line */}
              <div className="absolute left-6 right-6 top-1/2 h-[2px] -translate-y-1/2 bg-m3-surface-container-high" />
              <div 
                className="absolute left-6 top-1/2 h-[2px] -translate-y-1/2 bg-m3-primary transition-all duration-500" 
                style={{ width: `${(Math.max(1, levelInfo.level) - 1) * 20}%` }}
              />

              {XP_LEVELS.map((item) => {
                const isCompleted = xp >= item.xpRequired;
                const isCurrent = levelInfo.level === item.level;

                return (
                  <div key={item.level} className="relative flex flex-col items-center z-10">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-label-md font-label-md transition-all shadow-m3-soft",
                        isCurrent 
                          ? "bg-m3-primary text-m3-on-primary ring-4 ring-m3-primary/20 scale-110" 
                          : isCompleted 
                            ? "bg-m3-primary-fixed text-m3-primary" 
                            : "bg-m3-surface-container-highest text-m3-on-surface-variant"
                      )}
                      title={`${item.name} (${item.xpRequired} XP)`}
                    >
                      {item.level}
                    </span>
                    <span 
                      className={cn(
                        "absolute -bottom-6 whitespace-nowrap text-[10px] font-medium transition-colors",
                        isCurrent ? "text-m3-primary font-semibold" : "text-m3-on-surface-variant/70"
                      )}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-6" /> {/* Spacer for labels */}
          </div>

          {/* Daily Motivational Recommendation */}
          <div className="flex items-start gap-3 rounded-2xl border border-m3-tertiary-fixed-dim/30 bg-m3-tertiary-fixed/10 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-m3-tertiary-fixed/30 text-m3-tertiary">
              <Icon name="rocket_launch" size={18} />
            </span>
            <div>
              <p className="text-label-md font-label-md text-m3-tertiary">Мотивирующий буст</p>
              <p className="mt-0.5 text-body-sm font-body-sm text-m3-on-surface-variant">
                Пройдите следующий доступный урок сегодня, чтобы приблизиться к уровню{" "}
                <span className="font-semibold text-m3-primary">
                  {nextLevel ? nextLevel.name : "Легенда"}
                </span>{" "}
                и заработать дополнительные 10 XP!
              </p>
            </div>
          </div>

          {/* Quests Guide Grid */}
          <div>
            <h3 className="mb-3 text-label-lg font-label-lg text-m3-on-surface">Как заработать очки опыта</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {XP_QUESTS.map((q) => (
                <div 
                  key={q.id} 
                  className="flex gap-3 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-3 transition-colors hover:bg-m3-surface-container-low"
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm", q.color)}>
                    <Icon name={q.icon} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-label-md font-label-md text-m3-on-surface">{q.label}</p>
                      <span className="shrink-0 text-label-sm font-label-sm font-semibold text-m3-primary">{q.xp}</span>
                    </div>
                    <p className="mt-0.5 text-body-xs font-body-xs text-m3-on-surface-variant/80 line-clamp-2">
                      {q.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
