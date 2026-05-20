"use server";

import { withQueryFallback } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import { getContinueLearning, getStudentCourseCards } from "@/server/modules/learning/service";
import { getUserLearningPaths } from "@/server/modules/learning/learning-path-service";
import type {
  DashboardMetric,
  QuestionFromStudent,
  CohortDeadline,
} from "@/types/domain";
import type { UserLearningPath } from "@/server/modules/learning/learning-path-service";

export async function getStudentDashboard() {
  await requireRole(["student"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return withQueryFallback(async () => {
    const [enrollments, coursesProgress, continueLearning, questions, certificatesCount, learningPaths] = await Promise.all([
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
      prisma.certificate.count({ where: { userId: user.id } }),
      getUserLearningPaths(user.id),
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
    const overdueDeadlines = deadlines.filter((deadline) => deadline.isOverdue).length;
    const upcomingDeadlines = deadlines.filter((deadline) => !deadline.isOverdue && deadline.daysLeft <= 7).length;

    const metrics: DashboardMetric[] = [
      {
        label: "Активные курсы",
        value: activeCourses,
        tone: activeCourses > 0 ? "primary" : "neutral",
        detail: continueLearning ? `Следующий урок: ${continueLearning.lessonTitle}` : "Нет следующего шага",
        href: "/student/my-courses",
      },
      {
        label: "Средний прогресс",
        value: `${avgPercent}%`,
        tone: avgPercent >= 70 ? "success" : avgPercent >= 35 ? "warning" : "danger",
        detail: `${coursesProgress.length} курсов в личном плане`,
      },
      {
        label: "Дедлайны",
        value: overdueDeadlines + upcomingDeadlines,
        tone: overdueDeadlines > 0 ? "danger" : upcomingDeadlines > 0 ? "warning" : "success",
        detail: overdueDeadlines > 0 ? `${overdueDeadlines} просрочено` : `${upcomingDeadlines} на ближайшие 7 дн.`,
        priority: overdueDeadlines > 0 ? "critical" : upcomingDeadlines > 0 ? "elevated" : "normal",
      },
      {
        label: "Вопросы куратору",
        value: openQuestionsCount,
        tone: openQuestionsCount > 0 ? "info" : "success",
        detail: `${formattedQuestions.length} всего в истории`,
      },
      {
        label: "Сертификаты",
        value: certificatesCount,
        tone: "success",
        href: "/student/certificates",
      },
    ];

    return { metrics, coursesProgress, continueLearning, questions: formattedQuestions, deadlines, learningPaths };
  }, null);
}

export type { UserLearningPath };

// Note: getEnrollmentData was moved to admin.ts — it's an admin-only function
