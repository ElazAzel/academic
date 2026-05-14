"use server";

import { safeQuery } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import type { CourseSummary, DashboardMetric } from "@/types/domain";

export async function getInstructorDashboard() {
  await requireRole(["instructor"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const courses = await prisma.course.findMany({
      where: { instructors: { some: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
      include: {
        modules: { include: { _count: { select: { lessons: true } } } },
        instructors: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { modules: true } },
      },
    });

    const courseIds = courses.map((c) => c.id);

    const [studentsCount, avgProgressResult] = await Promise.all([
      prisma.enrollment.count({
        where: { courseId: { in: courseIds }, status: "ACTIVE" }
      }),
      prisma.courseProgress.aggregate({
        where: { courseId: { in: courseIds } },
        _avg: { percent: true }
      })
    ]);

    const progressStats = await prisma.courseProgress.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _avg: { percent: true },
    });

    const progressMap = new Map(progressStats.map((s) => [s.courseId, Math.round(s._avg.percent ?? 0)]));

    const formattedCourses: CourseSummary[] = courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      durationHours: c.durationHours,
      status: c.status as CourseSummary["status"],
      traversalMode: c.traversalMode as "sequential" | "open",
      modulesCount: c._count.modules,
      blocksCount: 0,
      lessonsCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0),
      avgProgress: progressMap.get(c.id) ?? 0,
      instructors: c.instructors.map((ci) => ({
        id: ci.user.id,
        name: ci.user.name ?? "",
        email: ci.user.email,
      })),
    }));

    const avgProgress = Math.round(avgProgressResult._avg.percent ?? 0);

    const openQuestionsCount = await prisma.lessonQuestion.count({
      where: {
        lesson: { module: { courseId: { in: courseIds } } },
        status: "FORWARDED"
      }
    });

    const metrics: DashboardMetric[] = [
      { label: "Мои курсы", value: courses.length, tone: "primary" },
      { label: "Слушатели", value: studentsCount, tone: "info" },
      { label: "Средний прогресс", value: `${avgProgress}%`, tone: avgProgress > 50 ? "success" : "warning" },
      { label: "Вопросы от кураторов", value: openQuestionsCount, tone: openQuestionsCount > 0 ? "warning" : "success" },
    ];

    return { metrics, courses: formattedCourses };
  }, null);
}

export async function getInstructorAnalytics() {
  await requireRole(["instructor"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const courses = await prisma.course.findMany({
      where: { instructors: { some: { userId: user.id } } },
      include: {
        modules: {
          include: {
            _count: { select: { lessons: true } }
          }
        },
        _count: { select: { enrollments: true } }
      }
    });

    const courseIds = courses.map(c => c.id);

    const [totalEnrollments, avgProgressResult, completedCount, avgQuizScore] = await Promise.all([
      prisma.enrollment.count({ where: { courseId: { in: courseIds } } }),
      prisma.courseProgress.aggregate({
        where: { courseId: { in: courseIds } },
        _avg: { percent: true }
      }),
      prisma.courseProgress.count({
        where: { courseId: { in: courseIds }, status: "COMPLETED" }
      }),
      prisma.quizAttempt.aggregate({
        where: { quiz: { courseId: { in: courseIds } } },
        _avg: { score: true }
      })
    ]);

    const moduleIds = courses.flatMap(c => c.modules.map(m => m.id));

    const [moduleAvgProgress, moduleCompletedCounts, quizAnalytics] = await Promise.all([
      prisma.moduleProgress.groupBy({
        by: ["moduleId"],
        where: { moduleId: { in: moduleIds } },
        _avg: { percent: true }
      }),
      prisma.moduleProgress.groupBy({
        by: ["moduleId"],
        where: { moduleId: { in: moduleIds }, status: "COMPLETED" },
        _count: { _all: true }
      }),
      prisma.quiz.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          attempts: { select: { score: true, passed: true } },
        },
      }),
    ]);

    const avgProgressMap = new Map(
      moduleAvgProgress.map(res => [res.moduleId, Math.round(res._avg.percent ?? 0)])
    );
    const completedMap = new Map(
      moduleCompletedCounts.map(res => [res.moduleId, res._count._all])
    );

    const moduleAnalytics = courses.flatMap(c =>
      c.modules.map(m => ({
        title: m.title,
        courseTitle: c.title,
        avgProgress: avgProgressMap.get(m.id) ?? 0,
        completedStudents: completedMap.get(m.id) ?? 0
      }))
    );

    const quizStats = quizAnalytics.map(q => {
      const attempts = q.attempts;
      const total = attempts.length;
      const passed = attempts.filter(a => a.passed).length;
      const avgScore = total > 0 ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / total) : 0;
      return {
        title: q.title,
        totalAttempts: total,
        passed,
        avgScore,
      };
    });

    const metrics: DashboardMetric[] = [
      { label: "Зачисленных", value: totalEnrollments, tone: "primary" },
      { label: "Средний прогресс", value: `${Math.round(avgProgressResult._avg.percent ?? 0)}%`, tone: "success" },
      { label: "Завершивших", value: completedCount, tone: "info" },
      { label: "Средний балл тестов", value: `${Math.round(avgQuizScore._avg.score ?? 0)}%`, tone: "warning" },
    ];

    return { metrics, moduleAnalytics, quizStats };
  }, null);
}

export async function getForwardedQuestions() {
  await requireRole(["instructor", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const courseFilter = user.roles.includes("admin")
      ? {}
      : { lesson: { module: { course: { instructors: { some: { userId: user.id } } } } } };

    const questions = await prisma.lessonQuestion.findMany({
      where: { status: "FORWARDED", ...courseFilter },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, email: true } },
        curator: { select: { name: true, email: true } },
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      text: q.text,
      studentName: q.student.name ?? q.student.email,
      curatorName: q.curator?.name ?? q.curator?.email ?? "Неизвестно",
      courseTitle: q.lesson.module.course.title,
      moduleTitle: q.lesson.module.title,
      lessonTitle: q.lesson.title,
      status: (q.status === "FORWARDED" ? "forwarded" : "open") as "open" | "forwarded",
      createdAt: q.createdAt.toISOString(),
    }));
  }, []);
}

export async function getInstructorStudents() {
  await requireRole(["instructor", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const courses = await prisma.course.findMany({
      where: { instructors: { some: { userId: user.id } } },
      select: { id: true, title: true },
    });
    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
        course: { select: { title: true } },
        cohort: { select: { name: true } },
        courseProgress: { select: { percent: true, status: true } },
      },
      orderBy: [{ courseId: "asc" }, { user: { name: "asc" } }],
    });

    return enrollments.map((e) => ({
      id: e.user.id,
      name: e.user.name ?? e.user.email,
      email: e.user.email,
      courseTitle: e.course.title,
      cohortName: e.cohort?.name ?? null,
      progress: e.courseProgress[0]?.percent ?? 0,
      progressStatus: e.courseProgress[0]?.status ?? "NOT_STARTED",
      lastLoginAt: e.user.lastLoginAt?.toISOString() ?? null,
    }));
  }, []);
}
