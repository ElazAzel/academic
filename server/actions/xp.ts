"use server";

import { getPrisma } from "@/lib/prisma";

const XP_LESSON_COMPLETE = 50;
const XP_QUIZ_PASS = 30;
const XP_QUIZ_FAIL = 5;
const XP_ASSIGNMENT_SUBMIT = 40;

export type XpAction = "lesson_complete" | "quiz_pass" | "quiz_attempt" | "assignment_submit";

/**
 * Начислить XP пользователю и вернуть текущий баланс.
 */
export async function awardXp(userId: string, action: XpAction): Promise<{ xp: number; earned: number }> {
  const earned = getXpForAction(action);
  if (earned === 0) return { xp: 0, earned: 0 };

  const user = await getPrisma().user.update({
    where: { id: userId },
    data: { xp: { increment: earned } },
    select: { xp: true },
  });

  return { xp: user.xp, earned };
}

function getXpForAction(action: XpAction): number {
  switch (action) {
    case "lesson_complete":
      return XP_LESSON_COMPLETE;
    case "quiz_pass":
      return XP_QUIZ_PASS;
    case "quiz_attempt":
      return XP_QUIZ_FAIL;
    case "assignment_submit":
      return XP_ASSIGNMENT_SUBMIT;
  }
}

/**
 * Получить XP пользователя.
 */
export async function getUserXp(userId: string): Promise<number> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });
  return user?.xp ?? 0;
}

/**
 * Получить топ пользователей по XP (leaderboard).
 */
export async function getLeaderboard(limit = 10) {
  return getPrisma().user.findMany({
    where: { xp: { gt: 0 } },
    orderBy: { xp: "desc" },
    take: limit,
    select: { id: true, name: true, xp: true },
  });
}

export const XP_LEVELS = [
  { level: 1, name: "Новичок", xpRequired: 0 },
  { level: 2, name: "Ученик", xpRequired: 200 },
  { level: 3, name: "Исследователь", xpRequired: 500 },
  { level: 4, name: "Эксперт", xpRequired: 1000 },
  { level: 5, name: "Магистр", xpRequired: 2000 },
  { level: 6, name: "Легенда", xpRequired: 5000 },
] as const;

export function getLevel(xp: number): { level: number; name: string; progress: number } {
  let currentIdx = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].xpRequired) {
      currentIdx = i;
    }
  }

  const current = XP_LEVELS[currentIdx];
  const next = XP_LEVELS[Math.min(currentIdx + 1, XP_LEVELS.length - 1)];

  const range = next.xpRequired - current.xpRequired;
  const progress = range > 0 ? Math.min(100, ((xp - current.xpRequired) / range) * 100) : 100;

  return { level: current.level, name: current.name, progress: Math.round(progress) };
}
