"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const prisma = getPrisma();

const GetActivityAnalyticsSchema = z.object({
  days: z.number().min(7).max(180).optional(),
  cohortId: z.string().optional(),
  courseId: z.string().optional(),
});

export async function getActivityAnalytics(days = 30, cohortId?: string, courseId?: string) {
  try {
    const parsed = GetActivityAnalyticsSchema.safeParse({ days, cohortId, courseId });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || "Ошибка валидации");
    }

    await requireRole(["admin", "super_curator"]);

    const maxDays = Math.min(Math.max(days, 7), 180);
  const now = new Date();
  const startDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

  // Base filters for scoping
  const enrollmentFilter: Record<string, unknown> = { createdAt: { gte: startDate } };
  const loginFilter: Record<string, unknown> = {
    action: { in: ["user.login", "auth.login", "session.created"] },
    createdAt: { gte: startDate },
  };

  if (cohortId) {
    enrollmentFilter.cohortId = cohortId;
    const cohortUserIds = (await prisma.enrollment.findMany({
      where: { cohortId },
      select: { userId: true },
    })).map((e) => e.userId);
    loginFilter.userId = { in: cohortUserIds };
  }

  if (courseId) {
    enrollmentFilter.courseId = courseId;
    const courseUserIds = (await prisma.enrollment.findMany({
      where: { courseId },
      select: { userId: true },
    })).map((e) => e.userId);

    if (loginFilter.userId) {
      const existing = loginFilter.userId as { in: string[] };
      loginFilter.userId = { in: existing.in.filter((id) => courseUserIds.includes(id)) };
    } else {
      loginFilter.userId = { in: courseUserIds };
    }
  }

  const [logins, enrollments, cohorts, courses] = await Promise.all([
    prisma.activityLog.findMany({ where: loginFilter as Prisma.ActivityLogWhereInput, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.enrollment.findMany({ where: enrollmentFilter as Prisma.EnrollmentWhereInput, select: { createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.cohort.findMany({ where: { status: "active" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  // Build day-by-day aggregation
  const labels: string[] = [];
  const loginData: number[] = [];
  const enrollmentData: number[] = [];

  for (let i = maxDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    labels.push(d.toISOString().slice(5, 10));
    loginData.push(logins.filter((l) => l.createdAt >= d && l.createdAt < nextDay).length);
    enrollmentData.push(enrollments.filter((e) => e.createdAt >= d && e.createdAt < nextDay).length);
  }

  // Weekly aggregation (last 12 weeks max)
  const weekCount = Math.min(Math.ceil(maxDays / 7), 12);
  const weekLabels: string[] = [];
  const weekLogins: number[] = [];
  const weekEnrollments: number[] = [];
  for (let w = weekCount - 1; w >= 0; w--) {
    const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    weekLabels.push(`${weekStart.toISOString().slice(5, 10)}-${weekEnd.toISOString().slice(5, 10)}`);
    weekLogins.push(logins.filter((l) => l.createdAt >= weekStart && l.createdAt < weekEnd).length);
    weekEnrollments.push(enrollments.filter((e) => e.createdAt >= weekStart && e.createdAt < weekEnd).length);
  }

  return {
    daily: { labels, logins: loginData, enrollments: enrollmentData },
    weekly: { labels: weekLabels, logins: weekLogins, enrollments: weekEnrollments },
    totals: {
      totalLogins: logins.length,
      totalEnrollments: enrollments.length,
      avgDailyLogins: maxDays > 0 ? Math.round(logins.length / maxDays) : 0,
      days: maxDays,
    },
    filters: { cohorts, courses, selectedCohortId: cohortId ?? null, selectedCourseId: courseId ?? null },
  };
  } catch (error) {
    console.error("[getActivityAnalytics]", error);
    throw error;
  }
}
