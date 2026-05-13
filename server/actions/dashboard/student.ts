"use server";

import { safeQuery } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import type {
  ContinueLearning,
  DashboardMetric,
  StudentProgress,
  QuestionFromStudent,
  CohortDeadline,
} from "@/types/domain";

export async function getStudentDashboard() {
  await requireRole(["student"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const [enrollments, lastProgress, questions, certificatesCount] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        include: {
          course: { select: { id: true, slug: true, title: true, description: true, durationHours: true, status: true } },
          courseProgress: true,
          cohort: { include: { deadlines: { include: { module: true } } } },
        },
      }),
      prisma.lessonProgress.findFirst({
        where: { userId: user.id, status: { in: ["IN_PROGRESS", "NOT_STARTED"] } },
        orderBy: { updatedAt: "desc" },
        include: { lesson: { include: { module: { include: { course: true } } } } },
      }),
      prisma.lessonQuestion.findMany({
        where: { studentId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          lesson: { include: { module: { include: { course: true } } } },
        },
      }),
      prisma.certificate.count({ where: { userId: user.id } })
    ]);

    const coursesProgress: StudentProgress[] = enrollments.map((e) => {
      const cp = e.courseProgress[0];
      return {
        courseId: e.course.id,
        courseTitle: e.course.title,
        percent: cp?.percent ?? 0,
        status: (cp?.status as StudentProgress["status"]) ?? "NOT_STARTED",
      };
    });

    let continueLearning: ContinueLearning | null = null;
    if (lastProgress) {
      const lesson = lastProgress.lesson;
      const course = lesson.module.course;

      const [cp, mp] = await Promise.all([
        prisma.courseProgress.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
        }),
        prisma.moduleProgress.findUnique({
          where: { userId_moduleId: { userId: user.id, moduleId: lesson.moduleId } },
        })
      ]);

      continueLearning = {
        courseId: course.id,
        courseTitle: course.title,
        moduleTitle: lesson.module.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        coursePercent: cp?.percent ?? 0,
        modulePercent: mp?.percent ?? 0,
      };
    }

    const formattedQuestions: QuestionFromStudent[] = questions.map((q) => ({
      id: q.id,
      text: q.text,
      studentName: user.name ?? user.email,
      courseTitle: q.lesson.module.course.title,
      moduleTitle: q.lesson.module.title,
      lessonTitle: q.lesson.title,
      status: q.status as "open" | "answered",
      createdAt: q.createdAt.toISOString(),
      answer: q.answer,
      answeredAt: q.answeredAt?.toISOString(),
    }));

    const activeCourses = enrollments.filter((e) => {
      const cp = e.courseProgress[0];
      return cp?.status !== "COMPLETED";
    }).length;

    const avgPercent = coursesProgress.length > 0
      ? Math.round(coursesProgress.reduce((s, c) => s + c.percent, 0) / coursesProgress.length)
      : 0;

    const openQuestionsCount = formattedQuestions.filter((q) => q.status === "open").length;

    const metrics: DashboardMetric[] = [
      { label: "Активные курсы", value: activeCourses, tone: "primary" },
      { label: "Средний прогресс", value: `${avgPercent}%`, tone: avgPercent > 50 ? "success" : "warning" },
      { label: "Сертификаты", value: certificatesCount, tone: "success" },
      { label: "Вопросы куратору", value: openQuestionsCount, tone: openQuestionsCount > 0 ? "info" : "primary" },
    ];

    const now = new Date();
    const deadlines: CohortDeadline[] = enrollments.flatMap((e) =>
      e.cohort?.deadlines.map((d) => {
        const daysLeft = Math.ceil((d.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          moduleId: d.moduleId,
          moduleTitle: d.module.title,
          dueAt: d.dueAt.toISOString(),
          courseTitle: e.course.title,
          daysLeft,
          isOverdue: daysLeft < 0
        };
      }) ?? []
    );

    return { metrics, coursesProgress, continueLearning, questions: formattedQuestions, deadlines };
  }, null);
}

export async function getEnrollmentData(): Promise<{
  students: { id: string; name: string | null; email: string }[];
  courses: { id: string; title: string }[];
  cohorts: { id: string; name: string; courseId: string }[];
  curators: { id: string; name: string | null; email: string }[];
}> {
  await requireRole(["admin"]);

  return safeQuery(async () => {
    const [students, courses, cohorts, curators] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { some: { role: { key: "student" } } } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" }
      }),
      prisma.course.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true },
        orderBy: { title: "asc" }
      }),
      prisma.cohort.findMany({
        where: { status: "active" },
        select: { id: true, name: true, courseId: true },
        orderBy: { name: "asc" }
      }),
      prisma.user.findMany({
        where: { roles: { some: { role: { key: { in: ["curator", "super_curator"] } } } } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" }
      })
    ]);

    return {
      students,
      courses,
      cohorts: cohorts.map(c => ({
        id: c.id,
        name: c.name,
        courseId: c.courseId ?? ""
      })),
      curators
    };
  }, {
    students: [] as { id: string; name: string | null; email: string }[],
    courses: [] as { id: string; title: string }[],
    cohorts: [] as { id: string; name: string; courseId: string }[],
    curators: [] as { id: string; name: string | null; email: string }[]
  });
}
