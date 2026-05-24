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

const XP_RULES = [
  { id: "lesson", label: "Прохождение урока", xp: "+10 XP", icon: "auto_stories" },
  { id: "quiz", label: "Идеальный тест", xp: "+15 XP", icon: "quiz" },
  { id: "assignment", label: "Сдача задания", xp: "+20 XP", icon: "assignment_turned_in" },
  { id: "discussion", label: "Активность", xp: "+5 XP", icon: "forum" },
];

export function XpCenterModal({ isOpen, onClose, xp, levelInfo }: XpCenterModalProps) {
  const currentLevelIdx = XP_LEVELS.findIndex((l) => l.level === levelInfo.level);
  const nextLevel = currentLevelIdx !== -1 && currentLevelIdx < XP_LEVELS.length - 1
    ? XP_LEVELS[currentLevelIdx + 1]
    : null;
  const xpLeft = nextLevel ? nextLevel.xpRequired - xp : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-lg border-m3-outline-variant bg-m3-surface-container-lowest p-0 shadow-m3-modal">
        <DialogHeader className="border-b border-m3-outline-variant/60 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
              <Icon name="military_tech" size={22} />
            </span>
            <div>
              <DialogTitle className="text-headline-sm font-headline-sm text-m3-on-surface">
                Центр развития
              </DialogTitle>
              <DialogDescription className="text-body-sm text-m3-on-surface-variant">
                Уровни, прогресс и правила начисления XP
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6 pt-4">
          <div className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-body-sm text-m3-on-surface-variant">Текущий уровень</span>
                <p className="text-headline-md font-headline-md text-m3-on-surface">
                  {levelInfo.level} — {levelInfo.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-display-sm font-bold text-m3-primary">{xp}</p>
                <span className="text-label-sm text-m3-on-surface-variant">Всего XP</span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <Progress
                value={levelInfo.progress}
                className="h-2 bg-m3-surface-container-high [&>div]:bg-m3-primary"
              />
              <div className="flex items-center justify-between text-body-sm text-m3-on-surface-variant">
                <span>{levelInfo.progress}%</span>
                {nextLevel ? (
                  <span>Осталось {xpLeft} XP до {nextLevel.level}-го уровня</span>
                ) : (
                  <span>Максимальный уровень</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-label-md font-medium text-m3-on-surface">Линия развития</h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {XP_LEVELS.map((item, i) => {
                const isCompleted = xp >= item.xpRequired;
                const isCurrent = levelInfo.level === item.level;

                return (
                  <div key={item.level} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        isCurrent
                          ? "border-m3-primary bg-m3-primary-fixed/20 text-m3-primary"
                          : isCompleted
                            ? "border-m3-outline-variant bg-m3-surface-container-low text-m3-on-surface"
                            : "border-m3-outline-variant/40 bg-muted/20 text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-label-sm font-bold",
                          isCurrent
                            ? "bg-m3-primary text-white"
                            : isCompleted
                              ? "bg-m3-primary-fixed-dim text-m3-primary"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.level}
                      </span>
                      <span className="whitespace-nowrap font-medium">{item.name}</span>
                      <span className="text-[11px] opacity-60">{item.xpRequired} XP</span>
                    </div>
                    {i < XP_LEVELS.length - 1 && (
                      <span className="shrink-0 text-muted-foreground/30">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-label-md font-medium text-m3-on-surface">Правила начисления XP</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {XP_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed/20 text-m3-primary">
                    <Icon name={rule.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label-sm font-medium text-m3-on-surface">{rule.label}</p>
                    <p className="text-label-sm font-semibold text-m3-primary">{rule.xp}</p>
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
