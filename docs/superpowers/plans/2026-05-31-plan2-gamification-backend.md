# Plan 2: Геймификация — Backend (Prisma + сервисы)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Создать модели ачивок, streak'ов, сервисы выдачи и seed

**Architecture:** Три новые Prisma модели (Achievement, UserAchievement, DailyActivity). AchievementService проверяет условия и начисляет ачивки. StreakService отслеживает ежедневную активность. Сервисы вызываются из существующих точек начисления XP.

**Tech Stack:** Prisma 7, PostgreSQL 17, TypeScript, Zod

---

### Task 2.1: Добавить Prisma модели

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260531000000_add_gamification_models/migration.sql`

- [ ] **Step 1: Добавить модели в schema.prisma**

Перед моделью `UserSession` (или в конец файла, перед closing `}` если есть generator, или после всех моделей):

```prisma
model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  description String
  icon        String
  xpReward    Int      @default(0)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  userAchievements UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  achievementId String
  achievedAt    DateTime    @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@index([userId])
}

model DailyActivity {
  id       String   @id @default(cuid())
  userId   String
  date     DateTime @db(Date)
  xpEarned Int      @default(0)

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId])
}
```

- [ ] **Step 2: Сгенерировать миграцию**

Run:
```bash
npx prisma migrate dev --name add_gamification_models --create-only
```

- [ ] **Step 3: Проверить и применить миграцию**

Run:
```bash
npx prisma migrate deploy
npx prisma generate
```

- [ ] **Step 4: Проверить typecheck**

Run: `npm run typecheck`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "Feat: Prisma модели Achievement, UserAchievement, DailyActivity"
```

---

### Task 2.2: AchievementService

**Files:**
- Create: `server/modules/gamification/achievements.ts`

- [ ] **Step 1: Создать константу с определениями ачивок и сервис**

```typescript
import { getPrisma } from "@/lib/prisma";

export interface AchievementDef {
  slug: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  sortOrder: number;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { slug: "first_lesson", title: "Первый шаг", description: "Пройти первый урок", icon: "Footprints", xpReward: 50, sortOrder: 1 },
  { slug: "five_lessons", title: "Усердный ученик", description: "Пройти 5 уроков", icon: "BookOpen", xpReward: 50, sortOrder: 2 },
  { slug: "ten_lessons", title: "Настойчивый", description: "Пройти 10 уроков", icon: "Library", xpReward: 100, sortOrder: 3 },
  { slug: "xp_500", title: "Накопитель", description: "Получить 500 XP", icon: "Coins", xpReward: 50, sortOrder: 4 },
  { slug: "xp_1000", title: "Тысячник", description: "Получить 1000 XP", icon: "Award", xpReward: 100, sortOrder: 5 },
  { slug: "xp_2000", title: "Мастер XP", description: "Получить 2000 XP", icon: "Trophy", xpReward: 200, sortOrder: 6 },
  { slug: "first_quiz_pass", title: "Проверка знаний", description: "Пройдите первый тест", icon: "ClipboardCheck", xpReward: 30, sortOrder: 7 },
  { slug: "perfect_quiz", title: "Идеально", description: "Получить 100% в тесте", icon: "Target", xpReward: 50, sortOrder: 8 },
  { slug: "first_assignment", title: "Первое задание", description: "Сдать первую домашнюю работу", icon: "FileCheck", xpReward: 40, sortOrder: 9 },
  { slug: "streak_3", title: "Три дня подряд", description: "Заниматься 3 дня подряд", icon: "Flame", xpReward: 30, sortOrder: 10 },
  { slug: "streak_7", title: "Неделя", description: "Заниматься 7 дней подряд", icon: "Flame", xpReward: 100, sortOrder: 11 },
  { slug: "streak_30", title: "Месяц", description: "Заниматься 30 дней подряд", icon: "Zap", xpReward: 500, sortOrder: 12 },
  { slug: "feedback_given", title: "Голос", description: "Оценить 5 уроков", icon: "Star", xpReward: 30, sortOrder: 13 },
];

const prisma = getPrisma();

/**
 * Проверить и выдать ачивку по слогу, если ещё не выдана.
 * Возвращает true, если ачивка была выдана.
 */
export async function awardAchievementIfNotYet(userId: string, slug: string): Promise<boolean> {
  const def = ACHIEVEMENT_DEFS.find((d) => d.slug === slug);
  if (!def) return false;

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: slug } },
  });
  if (existing) return false;

  // upsert achievement record in DB (create if not exists)
  await prisma.achievement.upsert({
    where: { slug },
    update: {},
    create: {
      slug: def.slug,
      title: def.title,
      description: def.description,
      icon: def.icon,
      xpReward: def.xpReward,
      sortOrder: def.sortOrder,
    },
  });

  await prisma.userAchievement.create({
    data: { userId, achievementId: slug },
  });

  // начислить бонусные XP
  if (def.xpReward > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: def.xpReward } },
    });
  }

  return true;
}

/**
 * Получить список ачивок пользователя с флагом achieved.
 */
export async function getUserAchievements(userId: string) {
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, achievedAt: true },
  });

  const achievedMap = new Map(userAchievements.map((a) => [a.achievementId, a.achievedAt]));

  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    achieved: achievedMap.has(def.slug),
    achievedAt: achievedMap.get(def.slug) ?? null,
  }));
}

/**
 * Получить количество полученных ачивок.
 */
export async function getAchievementCount(userId: string): Promise<number> {
  return prisma.userAchievement.count({ where: { userId } });
}

export type AchievementEvent = "lesson_complete" | "quiz_pass" | "quiz_perfect" | "assignment_submit" | "streak_day";

/**
 * Проверить и выдать ачивки по событию.
 */
export async function checkAndAward(userId: string, event: AchievementEvent): Promise<string[]> {
  const awarded: string[] = [];
  const prisma = getPrisma();

  async function tryAward(slug: string) {
    if (await awardAchievementIfNotYet(userId, slug)) {
      awarded.push(slug);
    }
  }

  switch (event) {
    case "lesson_complete": {
      const count = await prisma.lessonProgress.count({ where: { userId, completed: true } });
      if (count >= 1) await tryAward("first_lesson");
      if (count >= 5) await tryAward("five_lessons");
      if (count >= 10) await tryAward("ten_lessons");
      break;
    }
    case "quiz_pass": {
      await tryAward("first_quiz_pass");
      break;
    }
    case "quiz_perfect": {
      await tryAward("perfect_quiz");
      break;
    }
    case "assignment_submit": {
      await tryAward("first_assignment");
      break;
    }
    case "streak_day": {
      const { getStreak } = await import("./streak");
      const streak = await getStreak(userId);
      if (streak >= 3) await tryAward("streak_3");
      if (streak >= 7) await tryAward("streak_7");
      if (streak >= 30) await tryAward("streak_30");
      break;
    }
  }

  // также проверяем XP-ачивки
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (user) {
    if (user.xp >= 500) await tryAward("xp_500");
    if (user.xp >= 1000) await tryAward("xp_1000");
    if (user.xp >= 2000) await tryAward("xp_2000");
  }

  return awarded;
}
```

- [ ] **Step 2: Проверить typecheck**

Run: `npm run typecheck`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add server/modules/gamification/achievements.ts
git commit -m "Feat: AchievementService — checkAndAward, awardAchievementIfNotYet, getUserAchievements"
```

---

### Task 2.3: StreakService

**Files:**
- Create: `server/modules/gamification/streak.ts`

- [ ] **Step 1: Создать StreakService**

```typescript
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

/**
 * Записать активность пользователя за сегодня.
 */
export async function recordStreakActivity(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    update: { xpEarned: { increment: 1 } }, // просто счётчик активности
    create: { userId, date: today, xpEarned: 1 },
  });
}

/**
 * Получить текущую серию (сколько дней подряд есть активность до today).
 */
export async function getStreak(userId: string): Promise<number> {
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (activities.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if the most recent activity is today or yesterday
  const mostRecent = new Date(activities[0].date);
  const diffMs = today.getTime() - mostRecent.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return 0; // streak broken

  for (let i = 1; i < activities.length; i++) {
    const prev = new Date(activities[i - 1].date);
    const curr = new Date(activities[i].date);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Получить самую длинную серию за всё время.
 */
export async function getLongestStreak(userId: string): Promise<number> {
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true },
  });

  if (activities.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < activities.length; i++) {
    const prev = new Date(activities[i - 1].date);
    const curr = new Date(activities[i].date);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (Math.round(diff) === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Получить данные активности для тепловой карты (последние N дней).
 */
export async function getActivityHeatmap(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const activities = await prisma.dailyActivity.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
    select: { date: true, xpEarned: true },
  });

  const activityMap = new Map<string, number>();
  for (const a of activities) {
    const key = a.date.toISOString().split("T")[0];
    activityMap.set(key, a.xpEarned);
  }

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i + 1);
    const key = d.toISOString().split("T")[0];
    return {
      date: key,
      active: activityMap.has(key),
      xpEarned: activityMap.get(key) ?? 0,
    };
  });
}
```

- [ ] **Step 2: Проверить typecheck**

Run: `npm run typecheck`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add server/modules/gamification/streak.ts
git commit -m "Feat: StreakService — recordStreakActivity, getStreak, getLongestStreak, getActivityHeatmap"
```

---

### Task 2.4: Seed ачивок

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Добавить upsert ачивок в seed**

Добавить в конец функции seed (перед `console.log("Seeding complete")`):

```typescript
import { ACHIEVEMENT_DEFS } from "../server/modules/gamification/achievements";

// Seed achievements
for (const def of ACHIEVEMENT_DEFS) {
  await prisma.achievement.upsert({
    where: { slug: def.slug },
    update: { title: def.title, description: def.description, icon: def.icon, xpReward: def.xpReward, sortOrder: def.sortOrder },
    create: { slug: def.slug, title: def.title, description: def.description, icon: def.icon, xpReward: def.xpReward, sortOrder: def.sortOrder },
  });
}
console.log(`Seeded ${ACHIEVEMENT_DEFS.length} achievements`);
```

- [ ] **Step 2: Проверить seed**

Run: `npm run db:seed`
Expected: Seeded 13 achievements

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "Feat: seed 13 achievement definitions"
```

---

### Task 2.5: Интеграция checkAndAward в точки начисления

**Files:**
- Modify: `server/modules/learning/service.ts` — при завершении урока
- Modify: `server/modules/quizzes/service.ts` — при успешном тесте / 100%
- Modify: `server/actions/student.ts` — при сдаче ДЗ

- [ ] **Step 1: Интегрировать в learning/service.ts при завершении урока**

Найти функцию, которая вызывается при завершении урока (после `awardXp('lesson_complete')`).

Добавить импорты:
```typescript
import { checkAndAward } from "@/server/modules/gamification/achievements";
import { recordStreakActivity } from "@/server/modules/gamification/streak";
```

После `awardXp('lesson_complete')` добавить:
```typescript
await recordStreakActivity(userId);
await checkAndAward(userId, "lesson_complete");
```

- [ ] **Step 2: Интегрировать в quizzes/service.ts**

В функции `submitQuizAttempt` после `awardXp(...)`:

```typescript
await checkAndAward(userId, result.passed ? "quiz_pass" : "lesson_complete");
// for perfect score
if (result.passed && result.score === 100) {
  await checkAndAward(userId, "quiz_perfect");
}
```

- [ ] **Step 3: Интегрировать в student.ts**

В функции `submitAssignmentAction` после `awardXp(...)`:

```typescript
await checkAndAward(userId, "assignment_submit");
```

- [ ] **Step 4: Проверить typecheck и тесты**

Run: `npm run typecheck`
Run: `npm run test`
Expected: Both clean

- [ ] **Step 5: Commit**

```bash
git add server/modules/learning/service.ts server/modules/quizzes/service.ts server/actions/student.ts
git commit -m "Feat: интеграция checkAndAward в уроки, тесты, ДЗ"
```
