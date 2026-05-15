"use server";

import { safeQuery, getStudentAnalyticsDetail } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import type {
  CuratorLoad,
  DashboardMetric,
  CohortSummary,
  StudentAnalyticsDetail,
} from "@/types/domain";

export async function getSuperCuratorDashboard() {
  await requireRole(["super_curator"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return safeQuery(async () => {
    const curatorAssignments = await prisma.curatorAssignment.findMany({
      where: { superCuratorId: user.id, active: true },
      include: {
        curator: { select: { id: true, name: true, email: true, lastLoginAt: true } },
        cohort: { select: { id: true, name: true, courseId: true, course: { select: { title: true } } } },
      },
    });

    const curatorMap = new Map<string, { name: string; lastLoginAt: Date | null; studentIds: Set<string> }>();
    for (const ca of curatorAssignments) {
      const key = ca.curatorId;
      if (!curatorMap.has(key)) {
        curatorMap.set(key, {
          name: ca.curator.name ?? ca.curator.email,
          lastLoginAt: ca.curator.lastLoginAt,
          studentIds: new Set(),
        });
      }
      curatorMap.get(key)!.studentIds.add(ca.studentId);
    }

    const curatorIds = Array.from(curatorMap.keys());
    const allStudentIds = Array.from(new Set(Array.from(curatorMap.values()).flatMap(d => Array.from(d.studentIds))));

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      openQuestionsGrouped,
      answeredQuestionsGrouped,
      pendingReviewsGrouped,
      riskStudentsGrouped,
      answeredQuestions,
      messageCounts,
    ] = await Promise.all([
      prisma.lessonQuestion.groupBy({
        by: ["curatorId"],
        where: { curatorId: { in: curatorIds }, status: "OPEN" },
        _count: { _all: true },
      }),
      prisma.lessonQuestion.groupBy({
        by: ["curatorId"],
        where: { curatorId: { in: curatorIds }, status: "ANSWERED" },
        _count: { _all: true },
      }),
      prisma.assignmentSubmission.groupBy({
        by: ["userId"],
        where: { userId: { in: allStudentIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
        _count: { _all: true },
      }),
      prisma.riskFlag.groupBy({
        by: ["userId"],
        where: { userId: { in: allStudentIds }, status: "open" },
        _count: { _all: true },
      }),
      prisma.lessonQuestion.findMany({
        where: { curatorId: { in: curatorIds }, status: "ANSWERED", answeredAt: { not: null } },
        select: { curatorId: true, createdAt: true, answeredAt: true },
      }),
      prisma.message.groupBy({
        by: ["senderId"],
        where: { senderId: { in: curatorIds } },
        _count: { _all: true },
      }),
    ]);

    const openQuestionsMap = new Map(openQuestionsGrouped.map((g) => [g.curatorId, g._count._all]));
    const answeredQuestionsCountMap = new Map(answeredQuestionsGrouped.map((g) => [g.curatorId, g._count._all]));
    const pendingReviewsMap = new Map(pendingReviewsGrouped.map((g) => [g.userId, g._count._all]));
    const riskStudentsMap = new Map(riskStudentsGrouped.map((g) => [g.userId, g._count._all]));
    const messageCountMap = new Map(messageCounts.map((g) => [g.senderId, g._count._all]));

    const curatorLoads: CuratorLoad[] = [];
    for (const [curatorId, data] of curatorMap) {
      const studentIds = Array.from(data.studentIds);

      const openQuestions = openQuestionsMap.get(curatorId) ?? 0;
      const questionsAnswered = answeredQuestionsCountMap.get(curatorId) ?? 0;

      let pendingReviews = 0;
      let riskStudents = 0;
      for (const sId of studentIds) {
        pendingReviews += pendingReviewsMap.get(sId) ?? 0;
        riskStudents += riskStudentsMap.get(sId) ?? 0;
      }

      const curatorAnsweredQuestions = answeredQuestions.filter(q => q.curatorId === curatorId);

      let avgResponseHours = 0;
      if (curatorAnsweredQuestions.length > 0) {
        const totalHours = curatorAnsweredQuestions.reduce((sum, q) => {
          const diff = q.answeredAt!.getTime() - q.createdAt.getTime();
          return sum + (diff / (1000 * 60 * 60));
        }, 0);
        avgResponseHours = Math.round(totalHours / curatorAnsweredQuestions.length * 10) / 10;
      }

      const isOnline = data.lastLoginAt ? data.lastLoginAt > fiveMinAgo : false;

      curatorLoads.push({
        curatorId,
        curatorName: data.name,
        studentsCount: studentIds.length,
        openQuestions,
        pendingReviews,
        avgResponseHours,
        riskStudents,
        questionsAnswered,
        messagesSent: messageCountMap.get(curatorId) ?? 0,
        isOnline,
        lastSeenAt: data.lastLoginAt?.toISOString() ?? null,
      });
    }

    // Сортируем: сначала онлайн, потом по кол-ву отвеченных вопросов (лидерборд)
    curatorLoads.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return b.questionsAnswered - a.questionsAnswered;
    });

    const cohortIds = [...new Set(curatorAssignments.map((ca) => ca.cohortId))];
    const cohorts = await prisma.cohort.findMany({
      where: { id: { in: cohortIds } },
      include: { course: { select: { title: true } }, _count: { select: { enrollments: true } } },
    });
    const formattedCohorts: CohortSummary[] = cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      courseTitle: c.course?.title ?? "",
      startsAt: c.startsAt?.toISOString().slice(0, 10) ?? null,
      endsAt: c.endsAt?.toISOString().slice(0, 10) ?? null,
      status: c.status,
      studentsCount: c._count.enrollments,
    }));

    const totalStudents = curatorLoads.reduce((s, c) => s + c.studentsCount, 0);
    const totalAnswered = curatorLoads.reduce((s, c) => s + c.questionsAnswered, 0);
    const metrics: DashboardMetric[] = [
      { label: "Кураторов", value: curatorLoads.length, tone: "primary" },
      { label: "Всего слушателей", value: totalStudents, tone: "info" },
      { label: "Потоков", value: formattedCohorts.length, tone: "info" },
      { label: "Всего отвечено", value: totalAnswered, tone: "success" },
      { label: "Кураторы с перегрузкой", value: curatorLoads.filter((c) => c.studentsCount > 15).length, tone: "warning" },
    ];

    return { metrics, curatorLoads, cohorts: formattedCohorts };
  }, null);
}

export async function getSuperCuratorQuestions(status: "OPEN" | "ANSWERED" = "OPEN") {
  await requireRole(["super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const curatorIds = await prisma.curatorAssignment.findMany({
      where: { superCuratorId: user.id, active: true },
      select: { curatorId: true },
      distinct: ["curatorId"],
    });
    const ids = curatorIds.map((c) => c.curatorId);

    const questions = await prisma.lessonQuestion.findMany({
      where: {
        OR: [
          { curatorId: { in: ids } },
          { curatorId: null },
        ],
        status,
      },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, email: true } },
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      text: q.text,
      studentName: q.student.name ?? q.student.email,
      courseTitle: q.lesson.module.course.title,
      moduleTitle: q.lesson.module.title,
      lessonTitle: q.lesson.title,
      status: (q.status === "ANSWERED" ? "answered" : "open") as "open" | "answered",
      createdAt: q.createdAt.toISOString(),
      answer: q.answer,
      answeredAt: q.answeredAt?.toISOString(),
      curatorId: q.curatorId,
    }));
  }, []);
}

export async function getSuperCuratorStudentAnalytics(): Promise<StudentAnalyticsDetail[]> {
  await requireRole(["super_curator"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return safeQuery(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { superCuratorId: user.id, active: true },
      select: { studentId: true },
    });
    const studentIds = assignments.map((a) => a.studentId);
    return getStudentAnalyticsDetail(studentIds);
  }, []);
}
