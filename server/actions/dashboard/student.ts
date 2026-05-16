"use server";

import { withQueryFallback } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import { getContinueLearning, getStudentCourseCards } from "@/server/modules/learning/service";
import type {
  DashboardMetric,
  QuestionFromStudent,
  CohortDeadline,
} from "@/types/domain";

export async function getStudentDashboard() {
  await requireRole(["student"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return withQueryFallback(async () => {
    const [enrollments, coursesProgress, continueLearning, questions, certificatesCount] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        include: {
          course: { select: { id: true, slug: true, title: true, description: true, durationHours: true, status: true } },
          courseProgress: true,
          cohort: { include: { deadlines: { include: { module: true } } } },
        },
      }),
      getStudentCourseCards(user.id),
      getContinueLearning(user.id),
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

// Note: getEnrollmentData was moved to admin.ts — it's an admin-only function
