"use server";

import { withQueryFallback, getStudentAnalyticsDetail } from "./shared";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import { QuestionStatus } from "@prisma/client";
import type {
  CohortSummary,
  DashboardMetric,
  QuestionFromStudent,
  StudentAnalyticsDetail,
  SuperCuratorCohortOperation,
  SuperCuratorProblemQuestion,
  SuperCuratorRiskQueueItem,
  SuperCuratorWorkload,
  SuperCuratorWorkloadLevel,
} from "@/types/domain";

interface ScopedAssignment {
  studentId: string;
  curatorId: string;
  assignedAt: Date;
  curator: { id: string; name: string | null; email: string; lastLoginAt: Date | null };
  student: { id: string; name: string | null; email: string };
  cohort: {
    id: string;
    name: string;
    courseId: string | null;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
    course: { id: string; title: string } | null;
  };
}

export interface SuperCuratorDashboardData {
  metrics: DashboardMetric[];
  curatorLoads: SuperCuratorWorkload[];
  cohorts: CohortSummary[];
  cohortOperations: SuperCuratorCohortOperation[];
  problemQuestions: SuperCuratorProblemQuestion[];
  riskQueue: SuperCuratorRiskQueueItem[];
}

const HIGH_RISK_SEVERITIES = new Set(["high", "critical"]);

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function mapByCount<T extends string>(values: T[]) {
  const map = new Map<T, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

function getAgeHours(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60)));
}

function getAgeDays(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function getWorkloadLevel(input: {
  studentsCount: number;
  openQuestions: number;
  pendingReviews: number;
  activeRisks: number;
  criticalRisks: number;
}): SuperCuratorWorkloadLevel {
  if (
    input.criticalRisks > 0 ||
    input.openQuestions > 10 ||
    input.pendingReviews > 15 ||
    input.studentsCount > 25
  ) {
    return "critical";
  }

  if (
    input.activeRisks >= 5 ||
    input.openQuestions > 5 ||
    input.pendingReviews > 10 ||
    input.studentsCount > 15
  ) {
    return "overloaded";
  }

  if (input.openQuestions > 0 || input.pendingReviews > 0 || input.activeRisks > 0) {
    return "watch";
  }

  return "normal";
}

function getCuratorNextAction(curatorId: string, level: SuperCuratorWorkloadLevel, input: {
  openQuestions: number;
  pendingReviews: number;
  criticalRisks: number;
  activeRisks: number;
}) {
  if (input.criticalRisks > 0 || input.activeRisks > 3) {
    return { label: "Разобрать риски", href: `/super-curator/risks?curatorId=${curatorId}` };
  }
  if (level === "critical" || level === "overloaded") {
    return { label: "Снять перегрузку", href: `/super-curator/distribution?curatorId=${curatorId}` };
  }
  if (input.openQuestions > 0) {
    return { label: "Проверить вопросы", href: "/super-curator/questions" };
  }
  if (input.pendingReviews > 0) {
    return { label: "Проверить работы", href: `/super-curator/curators/${curatorId}` };
  }
  return { label: "Наблюдать", href: `/super-curator/curators/${curatorId}` };
}

function getCohortNextAction(cohortId: string, input: {
  criticalRisks: number;
  activeRisks: number;
  overloadedCurators: number;
  openQuestions: number;
  pendingReviews: number;
}) {
  if (input.criticalRisks > 0 || input.activeRisks > 3) {
    return { label: "Открыть риски", href: `/super-curator/risks?cohortId=${cohortId}` };
  }
  if (input.overloadedCurators > 0) {
    return { label: "Перераспределить", href: `/super-curator/distribution?cohortId=${cohortId}` };
  }
  if (input.openQuestions > 0) {
    return { label: "Вопросы потока", href: "/super-curator/questions" };
  }
  if (input.pendingReviews > 0) {
    return { label: "Проверить кураторов", href: "/super-curator/curators" };
  }
  return { label: "Открыть поток", href: `/super-curator/cohorts/${cohortId}` };
}

function buildAssignmentLookup(assignments: ScopedAssignment[]) {
  const byStudentCourse = new Map<string, ScopedAssignment>();
  const byStudent = new Map<string, ScopedAssignment>();

  for (const assignment of assignments) {
    byStudent.set(assignment.studentId, assignment);
    if (assignment.cohort.courseId) {
      byStudentCourse.set(`${assignment.studentId}:${assignment.cohort.courseId}`, assignment);
    }
  }

  return {
    find(studentId: string, courseId?: string | null) {
      if (courseId) {
        const exact = byStudentCourse.get(`${studentId}:${courseId}`);
        if (exact) return exact;
      }
      return byStudent.get(studentId) ?? null;
    },
  };
}

export async function getSuperCuratorDashboard(): Promise<SuperCuratorDashboardData | null> {
  await requireRole(["super_curator"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return withQueryFallback(async () => {
    const scopedAssignments = await prisma.curatorAssignment.findMany({
      where: { superCuratorId: user.id, active: true },
      include: {
        curator: { select: { id: true, name: true, email: true, lastLoginAt: true } },
        student: { select: { id: true, name: true, email: true } },
        cohort: {
          select: {
            id: true,
            name: true,
            courseId: true,
            status: true,
            startsAt: true,
            endsAt: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });

    const assignments = scopedAssignments as ScopedAssignment[];
    const curatorIds = unique(assignments.map((assignment) => assignment.curatorId));
    const studentIds = unique(assignments.map((assignment) => assignment.studentId));
    if (assignments.length === 0) {
      return {
        metrics: [
          { label: "Кураторов в зоне", value: 0, tone: "primary" },
          { label: "Слушателей", value: 0, tone: "info" },
          { label: "Потоков", value: 0, tone: "info" },
          { label: "Проблемных очередей", value: 0, tone: "success" },
        ],
        curatorLoads: [],
        cohorts: [],
        cohortOperations: [],
        problemQuestions: [],
        riskQueue: [],
      };
    }

    const lookup = buildAssignmentLookup(assignments);
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      openQuestions,
      answeredQuestions,
      pendingSubmissions,
      activeRisks,
      progressRows,
      unreadMessages,
    ] = await Promise.all([
      prisma.lessonQuestion.findMany({
        where: { studentId: { in: studentIds }, status: { in: [QuestionStatus.OPEN, QuestionStatus.FORWARDED] } },
        include: {
          student: { select: { id: true, name: true, email: true } },
          curator: { select: { id: true, name: true, email: true } },
          lesson: {
            select: {
              title: true,
              module: { select: { title: true, courseId: true, course: { select: { id: true, title: true } } } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
      prisma.lessonQuestion.findMany({
        where: { curatorId: { in: curatorIds }, status: QuestionStatus.ANSWERED, answeredAt: { not: null } },
        select: { curatorId: true, createdAt: true, answeredAt: true },
      }),
      prisma.assignmentSubmission.findMany({
        where: { userId: { in: studentIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignment: {
            select: {
              title: true,
              courseId: true,
              course: { select: { id: true, title: true } },
              lesson: { select: { module: { select: { courseId: true, course: { select: { id: true, title: true } } } } } },
            },
          },
        },
        orderBy: { submittedAt: "asc" },
        take: 300,
      }),
      prisma.riskFlag.findMany({
        where: { userId: { in: studentIds }, status: "open", resolvedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
          cohort: { select: { id: true, name: true } },
        },
        orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
        take: 300,
      }),
      prisma.courseProgress.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, courseId: true, percent: true, status: true },
      }),
      prisma.message.findMany({
        where: { senderId: { in: studentIds }, receiverId: { in: curatorIds }, readAt: null },
        select: { senderId: true, receiverId: true },
        take: 500,
      }),
    ]);

    const questionCuratorIds = openQuestions
      .map((question) => lookup.find(question.studentId, question.lesson.module.courseId)?.curatorId)
      .filter((id): id is string => Boolean(id));
    const submissionCuratorIds = pendingSubmissions
      .map((submission) => {
        const courseId = submission.assignment.courseId ?? submission.assignment.lesson?.module.courseId ?? null;
        return lookup.find(submission.userId, courseId)?.curatorId;
      })
      .filter((id): id is string => Boolean(id));
    const riskCuratorIds = activeRisks
      .map((risk) => lookup.find(risk.userId, risk.courseId)?.curatorId)
      .filter((id): id is string => Boolean(id));

    const questionsByCurator = mapByCount(questionCuratorIds);
    const submissionsByCurator = mapByCount(submissionCuratorIds);
    const risksByCurator = mapByCount(riskCuratorIds);
    const criticalRisksByCurator = mapByCount(
      activeRisks
        .filter((risk) => risk.severity === "critical")
        .map((risk) => lookup.find(risk.userId, risk.courseId)?.curatorId)
        .filter((id): id is string => Boolean(id)),
    );
    const unreadByCurator = mapByCount(unreadMessages.map((message) => message.receiverId).filter((id): id is string => Boolean(id)));
    const answeredByCurator = mapByCount(answeredQuestions.map((question) => question.curatorId).filter((id): id is string => Boolean(id)));

    const curatorAssignments = new Map<string, ScopedAssignment[]>();
    for (const assignment of assignments) {
      const list = curatorAssignments.get(assignment.curatorId) ?? [];
      list.push(assignment);
      curatorAssignments.set(assignment.curatorId, list);
    }

    const messageCountByCurator = await prisma.message.groupBy({
      by: ["senderId"],
      where: { senderId: { in: curatorIds } },
      _count: { _all: true },
    });
    const messagesSentMap = new Map(messageCountByCurator.map((row) => [row.senderId, row._count._all]));

    const curatorLoads: SuperCuratorWorkload[] = Array.from(curatorAssignments.entries()).map(([curatorId, curatorAssignmentRows]) => {
      const first = curatorAssignmentRows[0]!;
      const openQuestionsCount = questionsByCurator.get(curatorId) ?? 0;
      const pendingReviews = submissionsByCurator.get(curatorId) ?? 0;
      const activeRisksCount = risksByCurator.get(curatorId) ?? 0;
      const criticalRisks = criticalRisksByCurator.get(curatorId) ?? 0;
      const unreadMessagesCount = unreadByCurator.get(curatorId) ?? 0;
      const questionsAnswered = answeredByCurator.get(curatorId) ?? 0;
      const curatorAnsweredQuestions = answeredQuestions.filter((question) => question.curatorId === curatorId);
      const avgResponseHours = curatorAnsweredQuestions.length > 0
        ? Math.round(
            (curatorAnsweredQuestions.reduce((sum, question) => {
              return sum + ((question.answeredAt!.getTime() - question.createdAt.getTime()) / (1000 * 60 * 60));
            }, 0) / curatorAnsweredQuestions.length) * 10,
          ) / 10
        : 0;

      const level = getWorkloadLevel({
        studentsCount: curatorAssignmentRows.length,
        openQuestions: openQuestionsCount,
        pendingReviews,
        activeRisks: activeRisksCount,
        criticalRisks,
      });
      const nextAction = getCuratorNextAction(curatorId, level, {
        openQuestions: openQuestionsCount,
        pendingReviews,
        criticalRisks,
        activeRisks: activeRisksCount,
      });

      return {
        curatorId,
        curatorName: first.curator.name ?? first.curator.email,
        curatorEmail: first.curator.email,
        studentsCount: curatorAssignmentRows.length,
        cohorts: unique(curatorAssignmentRows.map((assignment) => assignment.cohort.name)),
        openQuestions: openQuestionsCount,
        pendingReviews,
        avgResponseHours,
        riskStudents: activeRisksCount,
        activeRisks: activeRisksCount,
        criticalRisks,
        questionsAnswered,
        messagesSent: messagesSentMap.get(curatorId) ?? 0,
        unreadMessages: unreadMessagesCount,
        isOnline: first.curator.lastLoginAt ? first.curator.lastLoginAt > fiveMinAgo : false,
        lastSeenAt: first.curator.lastLoginAt?.toISOString() ?? null,
        workloadScore:
          curatorAssignmentRows.length +
          openQuestionsCount * 3 +
          pendingReviews * 3 +
          activeRisksCount * 2 +
          criticalRisks * 5 +
          unreadMessagesCount,
        workloadLevel: level,
        nextActionLabel: nextAction.label,
        nextActionHref: nextAction.href,
      };
    }).sort((a, b) => {
      const levelRank: Record<SuperCuratorWorkloadLevel, number> = { critical: 3, overloaded: 2, watch: 1, normal: 0 };
      return levelRank[b.workloadLevel] - levelRank[a.workloadLevel] || b.workloadScore - a.workloadScore;
    });

    const progressByStudentCourse = new Map(progressRows.map((row) => [`${row.userId}:${row.courseId}`, row]));
    const cohortAssignments = new Map<string, ScopedAssignment[]>();
    for (const assignment of assignments) {
      const list = cohortAssignments.get(assignment.cohort.id) ?? [];
      list.push(assignment);
      cohortAssignments.set(assignment.cohort.id, list);
    }

    const cohortOperations: SuperCuratorCohortOperation[] = Array.from(cohortAssignments.entries()).map(([cohortId, cohortAssignmentRows]) => {
      const first = cohortAssignmentRows[0]!;
      const cohortStudentIds = new Set(cohortAssignmentRows.map((assignment) => assignment.studentId));
      const cohortCuratorIds = new Set(cohortAssignmentRows.map((assignment) => assignment.curatorId));
      const progressValues = cohortAssignmentRows.map((assignment) => {
        if (!assignment.cohort.courseId) return 0;
        return progressByStudentCourse.get(`${assignment.studentId}:${assignment.cohort.courseId}`)?.percent ?? 0;
      });
      const openQuestionsCount = openQuestions.filter((question) => cohortStudentIds.has(question.studentId)).length;
      const pendingReviews = pendingSubmissions.filter((submission) => cohortStudentIds.has(submission.userId)).length;
      const cohortRisks = activeRisks.filter((risk) => cohortStudentIds.has(risk.userId));
      const criticalRisks = cohortRisks.filter((risk) => risk.severity === "critical").length;
      const overloadedCurators = curatorLoads.filter((curator) => cohortCuratorIds.has(curator.curatorId) && (curator.workloadLevel === "critical" || curator.workloadLevel === "overloaded")).length;
      const nextAction = getCohortNextAction(cohortId, {
        criticalRisks,
        activeRisks: cohortRisks.length,
        overloadedCurators,
        openQuestions: openQuestionsCount,
        pendingReviews,
      });

      return {
        cohortId,
        cohortName: first.cohort.name,
        courseTitle: first.cohort.course?.title ?? "",
        status: first.cohort.status,
        studentsCount: cohortAssignmentRows.length,
        curatorCount: cohortCuratorIds.size,
        avgProgress: progressValues.length > 0
          ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
          : 0,
        openQuestions: openQuestionsCount,
        pendingReviews,
        activeRisks: cohortRisks.length,
        criticalRisks,
        overloadedCurators,
        nextActionLabel: nextAction.label,
        nextActionHref: nextAction.href,
      };
    }).sort((a, b) => {
      return b.criticalRisks - a.criticalRisks || b.activeRisks - a.activeRisks || b.openQuestions - a.openQuestions;
    });

    const problemQuestions: SuperCuratorProblemQuestion[] = openQuestions.slice(0, 12).map((question) => {
      const assignment = lookup.find(question.studentId, question.lesson.module.courseId);
      return {
        id: question.id,
        text: question.text,
        status: question.status as "OPEN" | "FORWARDED",
        studentName: question.student.name ?? question.student.email,
        studentEmail: question.student.email,
        curatorId: assignment?.curatorId ?? question.curatorId,
        curatorName: assignment?.curator.name ?? question.curator?.name ?? question.curator?.email ?? null,
        cohortId: assignment?.cohort.id ?? null,
        cohortName: assignment?.cohort.name ?? null,
        courseTitle: question.lesson.module.course.title,
        moduleTitle: question.lesson.module.title,
        lessonTitle: question.lesson.title,
        createdAt: question.createdAt.toISOString(),
        ageHours: getAgeHours(question.createdAt),
      };
    });

    const riskQueue: SuperCuratorRiskQueueItem[] = activeRisks
      .filter((risk) => HIGH_RISK_SEVERITIES.has(risk.severity))
      .slice(0, 12)
      .map((risk) => {
        const assignment = lookup.find(risk.userId, risk.courseId);
        return {
          id: risk.id,
          type: risk.type,
          severity: risk.severity as SuperCuratorRiskQueueItem["severity"],
          studentName: risk.user.name ?? risk.user.email,
          studentEmail: risk.user.email,
          curatorId: assignment?.curatorId ?? null,
          curatorName: assignment?.curator.name ?? assignment?.curator.email ?? null,
          cohortId: risk.cohortId ?? assignment?.cohort.id ?? null,
          cohortName: risk.cohort?.name ?? assignment?.cohort.name ?? null,
          courseTitle: risk.course?.title ?? assignment?.cohort.course?.title ?? "",
          createdAt: risk.createdAt.toISOString(),
          ageDays: getAgeDays(risk.createdAt),
        };
      });

    const formattedCohorts: CohortSummary[] = cohortOperations.map((cohort) => ({
      id: cohort.cohortId,
      name: cohort.cohortName,
      courseTitle: cohort.courseTitle,
      status: cohort.status,
      startsAt: null,
      endsAt: null,
      studentsCount: cohort.studentsCount,
    }));

    const totalStudents = curatorLoads.reduce((sum, curator) => sum + curator.studentsCount, 0);
    const openQuestionsCount = problemQuestions.length;
    const pendingReviewsCount = curatorLoads.reduce((sum, curator) => sum + curator.pendingReviews, 0);
    const hotRisksCount = riskQueue.length;
    const overloadedCount = curatorLoads.filter((curator) => curator.workloadLevel === "critical" || curator.workloadLevel === "overloaded").length;

    const metrics: DashboardMetric[] = [
      { label: "Кураторов в зоне", value: curatorLoads.length, tone: "primary" },
      { label: "Слушателей", value: totalStudents, tone: "info" },
      { label: "Проблемных вопросов", value: openQuestionsCount, tone: openQuestionsCount > 0 ? "warning" : "success" },
      { label: "Работ на контроле", value: pendingReviewsCount, tone: pendingReviewsCount > 0 ? "warning" : "success" },
      { label: "Высоких рисков", value: hotRisksCount, tone: hotRisksCount > 0 ? "danger" : "success" },
      { label: "Перегрузка", value: overloadedCount, tone: overloadedCount > 0 ? "warning" : "success" },
    ];

    return { metrics, curatorLoads, cohorts: formattedCohorts, cohortOperations, problemQuestions, riskQueue };
  }, null);
}

export async function getSuperCuratorQuestions(status: QuestionStatus = QuestionStatus.OPEN): Promise<QuestionFromStudent[]> {
  const actor = await requireRole(["super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return withQueryFallback(async () => {
    const scopedAssignments = actor.roles.includes("admin")
      ? []
      : await prisma.curatorAssignment.findMany({
          where: { superCuratorId: user.id, active: true },
          select: { studentId: true },
        });
    const studentIds = unique(scopedAssignments.map((assignment) => assignment.studentId));

    if (!actor.roles.includes("admin") && studentIds.length === 0) return [];

    const questions = await prisma.lessonQuestion.findMany({
      where: {
        ...(actor.roles.includes("admin") ? {} : { studentId: { in: studentIds } }),
        status,
      },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true, email: true } },
        lesson: { include: { module: { include: { course: true } } } },
      },
      take: 200,
    });

    return questions.map((question) => ({
      id: question.id,
      text: question.text,
      studentName: question.student.name ?? question.student.email,
      courseTitle: question.lesson.module.course.title,
      moduleTitle: question.lesson.module.title,
      lessonTitle: question.lesson.title,
      status: (question.status === QuestionStatus.ANSWERED ? "answered" : question.status === QuestionStatus.FORWARDED ? "forwarded" : "open") as "open" | "answered" | "forwarded",
      createdAt: question.createdAt.toISOString(),
      answer: question.answer,
      answeredAt: question.answeredAt?.toISOString(),
    }));
  }, []);
}

export async function getSuperCuratorStudentAnalytics(): Promise<StudentAnalyticsDetail[]> {
  await requireRole(["super_curator"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return withQueryFallback(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { superCuratorId: user.id, active: true },
      select: { studentId: true },
    });
    const studentIds = assignments.map((assignment) => assignment.studentId);
    return getStudentAnalyticsDetail(studentIds);
  }, []);
}
