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

export async function awardAchievementIfNotYet(userId: string, slug: string): Promise<boolean> {
  const def = ACHIEVEMENT_DEFS.find((d) => d.slug === slug);
  if (!def) return false;

  const prisma = getPrisma();

  const achievement = await prisma.achievement.upsert({
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

  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing) return false;

  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });

  if (def.xpReward > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: def.xpReward } },
    });
  }

  return true;
}

export async function getUserAchievements(userId: string) {
  const prisma = getPrisma();
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });

  const achievedMap = new Map(userAchievements.map((a) => [a.achievement.slug, a.achievedAt]));

  return ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    achieved: achievedMap.has(def.slug),
    achievedAt: achievedMap.get(def.slug) ?? null,
  }));
}

export type AchievementEvent = "lesson_complete" | "quiz_pass" | "quiz_perfect" | "assignment_submit" | "streak_day";

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
      const count = await prisma.lessonProgress.count({ where: { userId, completedAt: { not: null } } });
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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  if (user) {
    if (user.xp >= 500) await tryAward("xp_500");
    if (user.xp >= 1000) await tryAward("xp_1000");
    if (user.xp >= 2000) await tryAward("xp_2000");
  }

  return awarded;
}
