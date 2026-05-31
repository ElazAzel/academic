import { getPrisma } from "@/lib/prisma";

export async function recordStreakActivity(userId: string): Promise<void> {
  const prisma = getPrisma();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    update: { xpEarned: { increment: 1 } },
    create: { userId, date: today, xpEarned: 1 },
  });
}

export async function getStreak(userId: string): Promise<number> {
  const prisma = getPrisma();
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (activities.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mostRecent = new Date(activities[0].date);
  const diffMs = today.getTime() - mostRecent.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return 0;

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

export async function getLongestStreak(userId: string): Promise<number> {
  const prisma = getPrisma();
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

export async function getActivityHeatmap(userId: string, days = 30) {
  const prisma = getPrisma();
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
