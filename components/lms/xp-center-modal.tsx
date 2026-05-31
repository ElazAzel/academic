"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";
import { XP_LEVELS } from "@/lib/xp-utils";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "usehooks-ts";
import { Drawer } from "vaul";
import { useEffect, useState } from "react";
import { AchievementsGrid } from "@/components/gamification/achievements-grid";
import { StreakWidget } from "@/components/gamification/streak-widget";
import { LeaderboardPanel } from "@/components/gamification/leaderboard-panel";
import { getGamificationData } from "@/server/actions/gamification";

interface XpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  xp: number;
  levelInfo: { level: number; name: string; progress: number };
}

const XP_RULES = [
  { id: "lesson", label: "Прохождение урока", xp: "+50 XP", icon: "auto_stories" },
  { id: "quiz", label: "Пройденный тест", xp: "+30 XP", icon: "quiz" },
  { id: "assignment", label: "Сдача задания", xp: "+40 XP", icon: "assignment_turned_in" },
  { id: "discussion", label: "Попытка теста", xp: "+5 XP", icon: "forum" },
];

interface AchievementDataItem {
  slug: string; title: string; description: string; icon: string;
  xpReward: number; achieved: boolean; achievedAt: string | null;
}

interface GamificationData {
  achievements: AchievementDataItem[];
  streak: number;
  longestStreak: number;
  heatmap: Array<{ date: string; active: boolean; xpEarned: number }>;
}

export function XpCenterModal({ isOpen, onClose, xp, levelInfo }: XpCenterModalProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [gamification, setGamification] = useState<GamificationData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getGamificationData()
      .then((data) => setGamification(data as unknown as GamificationData));
  }, [isOpen]);
  const currentLevelIdx = XP_LEVELS.findIndex((l) => l.level === levelInfo.level);
  const nextLevel = currentLevelIdx !== -1 && currentLevelIdx < XP_LEVELS.length - 1
    ? XP_LEVELS[currentLevelIdx + 1]
    : null;
  const xpLeft = nextLevel ? nextLevel.xpRequired - xp : 0;

  const levelDisplay = (
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
  );

  const progressionDisplay = (
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
  );

  const rulesDisplay = (
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
  );

  if (isMobile) {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Content className="max-h-[85vh] rounded-t-2xl border-m3-outline-variant bg-m3-surface-container-lowest p-0">
          <div className="px-4 pb-8">
            <div className="border-b border-m3-outline-variant/60 px-0 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                  <Icon name="military_tech" size={22} />
                </span>
                <div>
                  <Drawer.Title className="text-headline-sm font-headline-sm text-m3-on-surface">
                    Центр развития
                  </Drawer.Title>
                  <Drawer.Description className="text-body-sm text-m3-on-surface-variant">
                    Уровни, прогресс и правила начисления XP
                  </Drawer.Description>
                </div>
              </div>
            </div>
            <div className="pt-4">
              <Tabs
                tabs={[
                  {
                    label: "Прогресс",
                    content: (
                      <div className="space-y-6">
                        {levelDisplay}
                        {progressionDisplay}
                        {rulesDisplay}
                      </div>
                    ),
                  },
                  {
                    label: "Ачивки",
                    content: !gamification ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
                    ) : (
                      <AchievementsGrid achievements={gamification.achievements} />
                    ),
                  },
                  {
                    label: "Streak",
                    content: !gamification ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
                    ) : (
                      <StreakWidget
                        currentStreak={gamification.streak}
                        longestStreak={gamification.longestStreak}
                        heatmap={gamification.heatmap}
                      />
                    ),
                  },
                  {
                    label: "Топ",
                    content: <LeaderboardPanel />,
                  },
                ]}
                className="w-full"
              />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Root>
    );
  }

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

        <Tabs
          tabs={[
            {
              label: "Прогресс",
              content: (
                <div className="space-y-6">
                  {levelDisplay}
                  {progressionDisplay}
                  {rulesDisplay}
                </div>
              ),
            },
            {
              label: "Ачивки",
              content: !gamification ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
              ) : (
                <AchievementsGrid achievements={gamification.achievements} />
              ),
            },
            {
              label: "Streak",
              content: !gamification ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
              ) : (
                <StreakWidget
                  currentStreak={gamification.streak}
                  longestStreak={gamification.longestStreak}
                  heatmap={gamification.heatmap}
                />
              ),
            },
            {
              label: "Топ",
              content: <LeaderboardPanel />,
            },
          ]}
          className="w-full"
        />
      </DialogContent>
    </Dialog>
  );
}
