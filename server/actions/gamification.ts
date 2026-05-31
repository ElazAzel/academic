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
