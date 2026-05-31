# Plan 3: Геймификация — UI (ачивки, streak, лидерборд)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Добавить в XpCenterModal вкладки «Ачивки», «Streak», «Лидерборд» и создать компоненты для них

**Architecture:** Три новых компонента (achievements-grid, streak-widget, leaderboard-panel) интегрируются в XpCenterModal как вкладки. Данные получают из server actions.

**Tech Stack:** Next.js 16, shadcn Tabs, lucide-react

---

### Task 3.1: AchievementsGrid компонент

**Files:**
- Create: `components/gamification/achievements-grid.tsx`

- [ ] **Step 1: Создать AchievementsGrid**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/gamification/achievements-grid.tsx
git commit -m "Feat: AchievementsGrid — сетка ачивок с полученными/недоступными состояниями"
```

---

### Task 3.2: StreakWidget компонент

**Files:**
- Create: `components/gamification/streak-widget.tsx`

- [ ] **Step 1: Создать StreakWidget с тепловой картой**

```typescript
"use client";

import { Flame, Zap, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  heatmap: Array<{ date: string; active: boolean; xpEarned: number }>;
}

export function StreakWidget({ currentStreak, longestStreak, heatmap }: StreakWidgetProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4">
          <Flame className={cn("h-8 w-8", currentStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          <div>
            <p className="text-display-sm font-bold tabular-nums">{currentStreak}</p>
            <p className="text-xs text-m3-on-surface-variant">Текущая серия (дней)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4">
          <Zap className="h-8 w-8 text-m3-primary" />
          <div>
            <p className="text-display-sm font-bold tabular-nums">{longestStreak}</p>
            <p className="text-xs text-m3-on-surface-variant">Лучшая серия</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Активность за 30 дней</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {heatmap.map((day) => (
            <div
              key={day.date}
              className={cn(
                "aspect-square rounded-sm transition-colors",
                day.active
                  ? day.xpEarned > 1
                    ? "bg-m3-primary"
                    : "bg-m3-primary-fixed-dim"
                  : "bg-muted/30",
              )}
              title={`${day.date}: ${day.active ? `${day.xpEarned} XP` : "нет активности"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/gamification/streak-widget.tsx
git commit -m "Feat: StreakWidget — серия дней + тепловая карта 30 дней"
```

---

### Task 3.3: LeaderboardPanel компонент

**Files:**
- Create: `components/gamification/leaderboard-panel.tsx`
- Server action уже есть: `server/actions/xp.ts → getLeaderboard()`

- [ ] **Step 1: Создать LeaderboardPanel**

```typescript
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
  const names = ["", "Новичок", "Ученик", "Исследователь", "Эксперт", "Магистр", "Легенда"];
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
        const isMe = session?.user?.email === entry.name || entry.id === session?.user?.id;
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
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{entry.name ?? "Без имени"}</p>
              <p className="text-xs text-muted-foreground">
                {getLevelName(level)} · Уровень {level}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-m3-primary">{entry.xp} XP</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Создать API-роут для leaderboard**

```typescript
// app/api/v1/leaderboard/route.ts
import { getLeaderboard } from "@/server/actions/xp";
import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireUser("courses:read");
    return ok(await getLeaderboard(20));
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/gamification/leaderboard-panel.tsx app/api/v1/leaderboard/route.ts
git commit -m "Feat: LeaderboardPanel — топ студентов по XP + API route"
```

---

### Task 3.4: Интеграция вкладок в XpCenterModal

**Files:**
- Modify: `components/lms/xp-center-modal.tsx`
- Need a Server Action to fetch gamification data

- [ ] **Step 1: Создать Server Action для данных геймификации**

```typescript
// server/actions/gamification.ts
"use server";

import { requireUser } from "@/lib/auth/session";
import { getUserAchievements } from "@/server/modules/gamification/achievements";
import { getStreak, getLongestStreak, getActivityHeatmap } from "@/server/modules/gamification/streak";

export async function getGamificationData() {
  const user = await requireUser("courses:read");
  const [achievements, streak, longestStreak, heatmap] = await Promise.all([
    getUserAchievements(user.id),
    getStreak(user.id),
    getLongestStreak(user.id),
    getActivityHeatmap(user.id, 30),
  ]);
  return { achievements, streak, longestStreak, heatmap };
}
```

- [ ] **Step 2: Расширить XpCenterModal вкладками**

Добавить импорты:
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AchievementsGrid } from "@/components/gamification/achievements-grid";
import { StreakWidget } from "@/components/gamification/streak-widget";
import { LeaderboardPanel } from "@/components/gamification/leaderboard-panel";
import { getGamificationData } from "@/server/actions/gamification";
import { useEffect, useState } from "react";
```

Добавить состояние:
```typescript
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

// внутри компонента:
const [gamification, setGamification] = useState<GamificationData | null>(null);
const [loadingGamification, setLoadingGamification] = useState(false);

useEffect(() => {
  if (!isOpen) return;
  setLoadingGamification(true);
  getGamificationData()
    .then((data) => setGamification(data as unknown as GamificationData))
    .finally(() => setLoadingGamification(false));
}, [isOpen]);
```

Заменить контентную часть на Tabs:
```typescript
<Tabs defaultValue="progress" className="px-6 pb-6 pt-4">
  <TabsList className="mb-4 grid w-full grid-cols-4">
    <TabsTrigger value="progress" className="text-xs">Прогресс</TabsTrigger>
    <TabsTrigger value="achievements" className="text-xs">Ачивки</TabsTrigger>
    <TabsTrigger value="streak" className="text-xs">Streak</TabsTrigger>
    <TabsTrigger value="leaderboard" className="text-xs">Топ</TabsTrigger>
  </TabsList>

  <TabsContent value="progress">
    {/* existing level + progress content */}
    <div className="rounded-lg border ...">{/* текущий контент уровня */}</div>
    <div className="mt-4">{/* правила XP */}</div>
  </TabsContent>

  <TabsContent value="achievements">
    {loadingGamification ? (
      <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
    ) : gamification ? (
      <AchievementsGrid achievements={gamification.achievements} />
    ) : null}
  </TabsContent>

  <TabsContent value="streak">
    {loadingGamification ? (
      <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
    ) : gamification ? (
      <StreakWidget
        currentStreak={gamification.streak}
        longestStreak={gamification.longestStreak}
        heatmap={gamification.heatmap}
      />
    ) : null}
  </TabsContent>

  <TabsContent value="leaderboard">
    <LeaderboardPanel />
  </TabsContent>
</Tabs>
```

- [ ] **Step 3: Проверить сборку**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add server/actions/gamification.ts components/lms/xp-center-modal.tsx
git commit -m "Feat: XpCenterModal — вкладки Ачивки, Streak, Лидерборд"
```

---

### Task 3.5: Проверить всё вместе

- [ ] **Step 1: Полный verify**

Run: `npm run verify`
Expected: lint 0/0, typecheck clean, tests 466+/466+, build success

- [ ] **Step 2: Проверить миграции**

Run: `npx prisma migrate status`
Expected: Все миграции применены

- [ ] **Step 3: Обновить changelog**

Добавить запись в `docs/updates.md`:
```markdown
## 2026-05-31 — Геймификация: ачивки, streaks, лидерборд

**Что сделано:**
- Добавлены Prisma модели Achievement, UserAchievement, DailyActivity
- AchievementService: 13 ачивок с авто-выдачей при выполнении условий
- StreakService: ежедневная активность, расчёт серии, тепловая карта 30 дней
- UI: AchievementsGrid, StreakWidget, LeaderboardPanel
- XpCenterModal расширен вкладками «Ачивки», «Streak», «Топ»
- Ачивки сидированы в БД

**Проверка:**
- `npm run verify` — все гейты зелёные
```

- [ ] **Step 4: Финальный коммит**

```bash
git add docs/updates.md
git commit -m "Docs: обновление changelog — геймификация"
```
