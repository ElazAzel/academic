import { prisma } from "@/lib/prisma";
import type { StudentAnalyticsDetail } from "@/types/domain";

export async function withQueryFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn("[dashboard-actions] DB query failed, returning fallback:", err);
    return fallback;
  }
}

export async function getStudentAnalyticsDetail(studentIds: string[]): Promise<StudentAnalyticsDetail[]> {
  if (studentIds.length === 0) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: { in: studentIds } },
    include: {
      user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
      course: { select: { title: true } },
      cohort: { select: { name: true } },
      courseProgress: true,
      lessonProgress: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          lesson: {
            include: {
              block: { select: { title: true } },
              module: { select: { title: true } },
            }
          }
        }
      },
      _count: { select: { lessonProgress: true } },
    },
  });

  const allLessonProgress = await prisma.lessonProgress.findMany({
    where: { userId: { in: studentIds } },
    select: { userId: true, lesson: { select: { durationMinutes: true } }, updatedAt: true },
  });

  const lessonTimeMap = new Map<string, { count: number; totalMinutes: number }>();
  for (const lp of allLessonProgress) {
    const cur = lessonTimeMap.get(lp.userId) ?? { count: 0, totalMinutes: 0 };
    cur.count++;
    cur.totalMinutes += lp.lesson.durationMinutes;
    lessonTimeMap.set(lp.userId, cur);
  }

  const riskCounts = await prisma.riskFlag.groupBy({
    by: ["userId"],
    where: { userId: { in: studentIds }, status: "open" },
    _count: { _all: true },
  });
  const riskMap = new Map(riskCounts.map((r) => [r.userId, r._count._all]));

  return enrollments.map((e) => {
    const lastProgress = e.lessonProgress[0];
    const timeData = lessonTimeMap.get(e.user.id);
    return {
      id: e.user.id,
      name: e.user.name ?? e.user.email,
      email: e.user.email,
      courseTitle: e.course.title,
      cohortName: e.cohort?.name,
      coursePercent: e.courseProgress[0]?.percent ?? 0,
      moduleTitle: lastProgress?.lesson.module.title,
      blockTitle: lastProgress?.lesson.block?.title,
      lessonTitle: lastProgress?.lesson.title,
      lastLoginAt: e.user.lastLoginAt?.toISOString() ?? null,
      avgLessonMinutes: timeData && timeData.count > 0 ? Math.round(timeData.totalMinutes / timeData.count) : 0,
      progressStatus: e.courseProgress[0]?.status ?? "NOT_STARTED",
      riskCount: riskMap.get(e.user.id) ?? 0,
    };
  });
}
