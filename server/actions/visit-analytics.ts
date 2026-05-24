"use server";

import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const prisma = getPrisma();

// ── Types ──────────────────────────────────────────────────────────────

export type TimeSlot = "0-3" | "3-6" | "6-9" | "9-12" | "12-15" | "15-18" | "18-21" | "21-24";

export interface VisitAnalytics {
  summary: {
    totalSessions: number;
    uniqueUsers: number;
    avgDurationSec: number;
    days: number;
  };
  byRole: {
    role: string;
    sessions: number;
    uniqueUsers: number;
    avgDurationSec: number;
  }[];
  hourlyDistribution: { hour: number; count: number }[];
  timeSlotDistribution: { slot: TimeSlot; count: number }[];
  dailyVisits: { date: string; sessions: number; users: number }[];
}

export interface UserVisitDetail {
  userId: string;
  userName: string;
  role: string;
  totalSessions: number;
  totalDurationSec: number;
  avgDurationSec: number;
  lastVisit: string | null;
  dailyActivity: { date: string; sessions: number }[];
  recentPages: { action: string; resource: string | null; createdAt: string }[];
}

export interface TimingAnalytics {
  messagesByHour: { hour: number; student: number; curator: number }[];
  lessonsByHour: { hour: number; count: number }[];
  quizzesByHour: { hour: number; count: number }[];
}

// ── Constants ───────────────────────────────────────────────────────────

const SLOTS: TimeSlot[] = ["0-3", "3-6", "6-9", "9-12", "12-15", "15-18", "18-21", "21-24"];

function getTimeSlot(hour: number): TimeSlot {
  if (hour < 3) return "0-3";
  if (hour < 6) return "3-6";
  if (hour < 9) return "6-9";
  if (hour < 12) return "9-12";
  if (hour < 15) return "12-15";
  if (hour < 18) return "15-18";
  if (hour < 21) return "18-21";
  return "21-24";
}

// ── Analytics queries ──────────────────────────────────────────────────

/**
 * Основная аналитика посещений: распределение по часам, слотам, ролям.
 * Фильтр `role` = "student" | "curator" | "admin" | undefined (все роли).
 */
const GetVisitAnalyticsSchema = z.object({
  days: z.number().min(1).max(180).optional(),
  roleFilter: z.string().optional(),
});

export async function getVisitAnalytics(
  days = 30,
  roleFilter?: string,
): Promise<VisitAnalytics> {
  try {
    const parsed = GetVisitAnalyticsSchema.safeParse({ days, roleFilter });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Ошибка валидации");
    }

    const maxDays = Math.min(Math.max(days, 1), 180);
    const now = new Date();
    const startDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

    const whereBase: Record<string, unknown> = {
      startedAt: { gte: startDate },
    };
    if (roleFilter) {
      whereBase.role = roleFilter;
    }

    const sessions = await prisma.userSession.findMany({
      where: whereBase as Prisma.UserSessionWhereInput,
      select: {
        id: true,
        userId: true,
        role: true,
        startedAt: true,
        durationSec: true,
      },
      orderBy: { startedAt: "asc" },
    });

    // ── Summary ──
    const totalSessions = sessions.length;
    const uniqueUsers = new Set(sessions.map((s) => s.userId)).size;
    const durations = sessions.filter((s) => s.durationSec !== null).map((s) => s.durationSec!);
    const avgDurationSec = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // ── By role ──
    const roleMap = new Map<string, { sessions: number; users: Set<string>; durations: number[] }>();
    for (const s of sessions) {
      let entry = roleMap.get(s.role);
      if (!entry) {
        entry = { sessions: 0, users: new Set(), durations: [] };
        roleMap.set(s.role, entry);
      }
      entry.sessions++;
      entry.users.add(s.userId);
      if (s.durationSec !== null) entry.durations.push(s.durationSec);
    }

    const byRole = Array.from(roleMap.entries()).map(([role, data]) => ({
      role,
      sessions: data.sessions,
      uniqueUsers: data.users.size,
      avgDurationSec: data.durations.length > 0
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
    }));

    // ── Hourly distribution ──
    const hourCounts = new Array(24).fill(0);
    for (const s of sessions) {
      const hour = s.startedAt.getHours();
      hourCounts[hour]++;
    }
    const hourlyDistribution = hourCounts.map((count, hour) => ({ hour, count }));

    // ── Time slot distribution ──
    const slotCounts = new Map<TimeSlot, number>();
    for (const s of sessions) {
      const slot = getTimeSlot(s.startedAt.getHours());
      slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
    }
    const timeSlotDistribution = SLOTS.map((slot) => ({
      slot,
      count: slotCounts.get(slot) ?? 0,
    }));

    // ── Daily visits ──
    const dayMap = new Map<string, { sessions: number; users: Set<string> }>();
    for (const s of sessions) {
      const day = s.startedAt.toISOString().slice(0, 10);
      let entry = dayMap.get(day);
      if (!entry) {
        entry = { sessions: 0, users: new Set() };
        dayMap.set(day, entry);
      }
      entry.sessions++;
      entry.users.add(s.userId);
    }

    const dailyVisits: { date: string; sessions: number; users: number }[] = [];
    for (let i = maxDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      dailyVisits.push({
        date: key.slice(5), // MM-DD
        sessions: entry?.sessions ?? 0,
        users: entry?.users.size ?? 0,
      });
    }

    return {
      summary: { totalSessions, uniqueUsers, avgDurationSec, days: maxDays },
      byRole,
      hourlyDistribution,
      timeSlotDistribution,
      dailyVisits,
    };
  } catch (error) {
    console.error("[getVisitAnalytics]", error);
    throw error;
  }
}

/**
 * Детальная аналитика по конкретному пользователю.
 */
const GetUserVisitDetailSchema = z.object({
  userId: z.string().min(1, "ID пользователя обязателен"),
  days: z.number().min(1).max(180).optional(),
});

export async function getUserVisitDetail(
  userId: string,
  days = 30,
): Promise<UserVisitDetail> {
  try {
    const parsed = GetUserVisitDetailSchema.safeParse({ userId, days });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Ошибка валидации");
    }

    const maxDays = Math.min(Math.max(days, 1), 180);
    const now = new Date();
    const startDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId, startedAt: { gte: startDate } },
      select: { role: true, startedAt: true, durationSec: true },
      orderBy: { startedAt: "asc" },
    });

    const totalSessions = sessions.length;
    const durations = sessions.filter((s) => s.durationSec !== null).map((s) => s.durationSec!);
    const totalDurationSec = durations.reduce((a, b) => a + b, 0);
    const avgDurationSec = durations.length > 0 ? Math.round(totalDurationSec / durations.length) : 0;
    const role = sessions.length > 0 ? sessions[0].role : "student";
    const lastVisit = sessions.length > 0
      ? sessions[sessions.length - 1].startedAt.toISOString()
      : null;

    // Daily aggregation
    const dayMap = new Map<string, number>();
    for (const s of sessions) {
      const day = s.startedAt.toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const dailyActivity: { date: string; sessions: number }[] = [];
    for (let i = maxDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyActivity.push({ date: key.slice(5), sessions: dayMap.get(key) ?? 0 });
    }

    // Recent page views
    const recentPages = await prisma.activityLog.findMany({
      where: { userId, sessionId: { not: null } },
      select: { action: true, resource: true, resourceId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      userId: user.id,
      userName: user.name ?? "Без имени",
      role,
      totalSessions,
      totalDurationSec,
      avgDurationSec,
      lastVisit,
      dailyActivity,
      recentPages: recentPages.map((p) => ({
        action: p.action,
        resource: p.resource ?? p.resourceId,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[getUserVisitDetail]", error);
    throw error;
  }
}

/**
 * Аналитика таймингов: когда пользователи отправляют сообщения,
 * проходят уроки и сдают тесты — по часам суток.
 */
const GetTimingAnalyticsSchema = z.object({
  days: z.number().min(1).max(180).optional(),
});

export async function getTimingAnalytics(days = 30): Promise<TimingAnalytics> {
  try {
    const parsed = GetTimingAnalyticsSchema.safeParse({ days });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Ошибка валидации");
    }

    const maxDays = Math.min(Math.max(days, 1), 180);
    const now = new Date();
    const startDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

    // ── Messages by hour + role ──
    const messages = await prisma.message.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        createdAt: true,
        sender: { select: { roles: { select: { role: true } } } },
      },
    });

    const msgByHour = Array.from({ length: 24 }, () => ({ student: 0, curator: 0 }));
    for (const m of messages) {
      const hour = m.createdAt.getHours();
      const senderRoles = m.sender?.roles ?? [];
      const isCurator = senderRoles.some((r) =>
        (["curator", "super_curator", "instructor", "admin"] as string[]).includes(r.role.key),
      );
      if (isCurator) {
        msgByHour[hour].curator++;
      } else {
        msgByHour[hour].student++;
      }
    }
    const messagesByHour = msgByHour.map((counts, hour) => ({ hour, ...counts }));

    // ── Lessons by hour ──
    const lessonProgress = await prisma.lessonProgress.findMany({
      where: { updatedAt: { gte: startDate } },
      select: { updatedAt: true },
    });
    const lessonByHour = new Array(24).fill(0);
    for (const lp of lessonProgress) {
      lessonByHour[lp.updatedAt.getHours()]++;
    }
    const lessonsByHour = lessonByHour.map((count, hour) => ({ hour, count }));

    // ── Quizzes by hour ──
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { submittedAt: { gte: startDate } },
      select: { submittedAt: true },
    });
    const quizByHour = new Array(24).fill(0);
    for (const qa of quizAttempts) {
      if (qa.submittedAt) {
        quizByHour[qa.submittedAt.getHours()]++;
      }
    }
    const quizzesByHour = quizByHour.map((count, hour) => ({ hour, count }));

    return { messagesByHour, lessonsByHour, quizzesByHour };
  } catch (error) {
    console.error("[getTimingAnalytics]", error);
    throw error;
  }
}
