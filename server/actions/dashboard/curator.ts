"use server";

import { withQueryFallback, getStudentAnalyticsDetail } from "./shared";
import { prisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { getCurrentUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/page-guards";
import { maskStudentName } from "@/lib/utils";
import { QuestionStatus } from "@prisma/client";
import type {
  CuratorNextAction,
  CuratorStudentDeadline,
  CuratorStudentLastContext,
  CuratorStudentOperation,
  DashboardMetric,
  ProgressStatus,
  QuestionFromStudent,
  RiskItem,
  RiskSeverity,
  StudentAnalyticsDetail,
  SubmissionForReview,
} from "@/types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

const RISK_WEIGHT: Record<RiskSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const ACTION_WEIGHT: Record<CuratorStudentOperation["nextAction"]["kind"], number> = {
  risk: 0,
  question: 1,
  assignment: 2,
  chat: 3,
  deadline: 4,
  check_in: 5,
  monitor: 6,
};

export interface CuratorStudentItem {
  id: string;
  name: string;
  email: string;
  course: string;
  progress: number;
  risk: boolean;
}

export interface CuratorDashboardData {
  metrics: DashboardMetric[];
  questions: QuestionFromStudent[];
  submissions: SubmissionForReview[];
  risks: RiskItem[];
  students: CuratorStudentOperation[];
}

function groupByKey<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const current = grouped.get(key) ?? [];
    current.push(item);
    grouped.set(key, current);
  }
  return grouped;
}

function studentCourseKey(studentId: string, courseId: string | null | undefined) {
  return `${studentId}:${courseId ?? "none"}`;
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
}

function pickHighestRisk(risks: Array<{ severity: string }>): RiskSeverity | null {
  let highest: RiskSeverity | null = null;
  for (const risk of risks) {
    const severity = risk.severity as RiskSeverity;
    if (!RISK_WEIGHT[severity]) continue;
    if (!highest || RISK_WEIGHT[severity] > RISK_WEIGHT[highest]) {
      highest = severity;
    }
  }
  return highest;
}

function pickNextDeadline(deadlines: CuratorStudentDeadline[]): CuratorStudentDeadline | null {
  if (deadlines.length === 0) return null;
  return [...deadlines].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.daysLeft - b.daysLeft;
  })[0] ?? null;
}

function buildNextAction(input: {
  risks: number;
  highestRiskSeverity: RiskSeverity | null;
  openQuestions: number;
  pendingAssignments: number;
  unreadMessages: number;
  nextDeadline: CuratorStudentDeadline | null;
  daysSinceLogin: number | null;
  progressPercent: number;
}): CuratorNextAction {
  if (input.risks > 0 && (input.highestRiskSeverity === "critical" || input.highestRiskSeverity === "high")) {
    return {
      kind: "risk",
      label: "Разобрать риск",
      href: "/curator/risks",
      tone: "danger",
      reason: `${input.highestRiskSeverity === "critical" ? "Критический" : "Высокий"} риск у слушателя`,
    };
  }

  if (input.openQuestions > 0) {
    return {
      kind: "question",
      label: "Ответить на вопрос",
      href: "/curator/questions",
      tone: "primary",
      reason: `${input.openQuestions} открытых вопросов`,
    };
  }

  if (input.pendingAssignments > 0) {
    return {
      kind: "assignment",
      label: "Проверить задание",
      href: "/curator/assignments",
      tone: "primary",
      reason: `${input.pendingAssignments} работ на проверку`,
    };
  }

  if (input.unreadMessages > 0) {
    return {
      kind: "chat",
      label: "Ответить в чате",
      href: "/curator/chat",
      tone: "primary",
      reason: `${input.unreadMessages} непрочитанных сообщений`,
    };
  }

  if (input.nextDeadline?.overdue || (input.nextDeadline && input.nextDeadline.daysLeft <= 3)) {
    return {
      kind: "deadline",
      label: "Проверить дедлайн",
      href: "/curator/risks",
      tone: input.nextDeadline.overdue ? "danger" : "warning",
      reason: input.nextDeadline.overdue
        ? `Просрочен дедлайн: ${input.nextDeadline.title}`
        : `Дедлайн через ${input.nextDeadline.daysLeft} дн.: ${input.nextDeadline.title}`,
    };
  }

  if ((input.daysSinceLogin !== null && input.daysSinceLogin >= 7) || input.progressPercent < 20) {
    return {
      kind: "check_in",
      label: "Связаться",
      href: "/curator/chat",
      tone: "warning",
      reason: input.daysSinceLogin !== null && input.daysSinceLogin >= 7
        ? `Нет входа ${input.daysSinceLogin} дн.`
        : "Низкий учебный прогресс",
    };
  }

  if (input.risks > 0) {
    return {
      kind: "risk",
      label: "Проверить риск",
      href: "/curator/risks",
      tone: "warning",
      reason: "Есть активный риск",
    };
  }

  return {
    kind: "monitor",
    label: "Наблюдать",
    href: "/curator/students",
    tone: "neutral",
    reason: "Критичных действий сейчас нет",
  };
}

export async function getCuratorDashboard(): Promise<CuratorDashboardData | null> {
  await requireRole(["curator"]);
  const user = await getCurrentUser();
  if (!user) return null;

  return withQueryFallback(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      orderBy: { assignedAt: "desc" },
      include: {
        student: { select: { id: true, name: true, email: true, lastLoginAt: true } },
        cohort: {
          select: {
            id: true,
            name: true,
            courseId: true,
            endsAt: true,
            course: { select: { id: true, title: true } },
            deadlines: {
              include: { module: { select: { id: true, title: true } } },
            },
            blockDeadlines: {
              include: { block: { select: { id: true, title: true } } },
            },
          },
        },
      },
      take: QUERY_LIMITS.dashboardStudents,
    });

    const studentIds = [...new Set(assignments.map((assignment) => assignment.studentId))];
    const courseIds = [
      ...new Set(
        assignments
          .map((assignment) => assignment.cohort.courseId)
          .filter((courseId): courseId is string => Boolean(courseId)),
      ),
    ];

    const [
      questions,
      submissions,
      risks,
      courseProgress,
      lessonProgress,
      enrollments,
      messages,
    ] = await Promise.all([
      prisma.lessonQuestion.findMany({
        where: { curatorId: user.id, status: QuestionStatus.OPEN },
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { id: true, name: true, email: true } },
          lesson: {
            include: {
              module: { include: { course: { select: { id: true, title: true } } } },
              block: { select: { title: true } },
            },
          },
        },
        take: QUERY_LIMITS.questionQueue,
      }),
      prisma.assignmentSubmission.findMany({
        where: { userId: { in: studentIds }, status: { in: ["SUBMITTED", "IN_REVIEW"] } },
        orderBy: { submittedAt: "desc" },
        include: {
          assignment: {
            include: {
              course: { select: { id: true, title: true } },
              lesson: {
                include: {
                  module: { include: { course: { select: { id: true, title: true } } } },
                  block: { select: { title: true } },
                },
              },
            },
          },
          user: { select: { id: true, name: true, email: true } },
        },
        take: QUERY_LIMITS.dashboardQueue,
      }),
      prisma.riskFlag.findMany({
        where: { userId: { in: studentIds }, status: "open", resolvedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
          cohort: { select: { id: true, name: true, courseId: true, course: { select: { id: true, title: true } } } },
        },
        take: QUERY_LIMITS.dashboardQueue,
      }),
      prisma.courseProgress.findMany({
        where: { userId: { in: studentIds }, ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : {}) },
        select: { userId: true, courseId: true, percent: true, status: true },
        take: QUERY_LIMITS.dashboardProgressRows,
      }),
      prisma.lessonProgress.findMany({
        where: {
          userId: { in: studentIds },
          ...(courseIds.length > 0 ? { lesson: { module: { courseId: { in: courseIds } } } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: {
          lesson: {
            include: {
              module: { select: { id: true, title: true, courseId: true } },
              block: { select: { title: true } },
            },
          },
        },
        take: QUERY_LIMITS.dashboardProgressRows,
      }),
      prisma.enrollment.findMany({
        where: { userId: { in: studentIds } },
        include: {
          course: { select: { id: true, title: true } },
          courseProgress: { select: { percent: true, status: true } },
        },
        take: QUERY_LIMITS.dashboardProgressRows,
      }),
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: { in: studentIds }, receiverId: user.id },
            { senderId: user.id, receiverId: { in: studentIds } },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: { lesson: { select: { id: true, title: true } } },
        take: QUERY_LIMITS.dashboardMessages,
      }),
    ]);

    const enrollmentByStudent = new Map<string, (typeof enrollments)[number]>();
    const enrollmentByStudentCourse = new Map<string, (typeof enrollments)[number]>();
    for (const enrollment of enrollments) {
      enrollmentByStudentCourse.set(studentCourseKey(enrollment.userId, enrollment.courseId), enrollment);
      if (!enrollmentByStudent.has(enrollment.userId)) {
        enrollmentByStudent.set(enrollment.userId, enrollment);
      }
    }

    const progressByStudentCourse = new Map(courseProgress.map((progress) => [
      studentCourseKey(progress.userId, progress.courseId),
      progress,
    ]));

    const lastContextByStudent = new Map<string, CuratorStudentLastContext>();
    const lastContextByStudentCourse = new Map<string, CuratorStudentLastContext>();
    for (const progress of lessonProgress) {
      const context: CuratorStudentLastContext = {
        lessonId: progress.lesson.id,
        lessonTitle: progress.lesson.title,
        moduleTitle: progress.lesson.module.title,
        blockTitle: progress.lesson.block?.title ?? null,
        updatedAt: progress.updatedAt.toISOString(),
      };
      const key = studentCourseKey(progress.userId, progress.lesson.module.courseId);
      if (!lastContextByStudentCourse.has(key)) {
        lastContextByStudentCourse.set(key, context);
      }
      if (!lastContextByStudent.has(progress.userId)) {
        lastContextByStudent.set(progress.userId, context);
      }
    }

    const questionsByStudentCourse = groupByKey(questions, (question) =>
      studentCourseKey(question.studentId, question.lesson.module.course.id),
    );

    const submissionsByStudentCourse = groupByKey(submissions, (submission) =>
      studentCourseKey(
        submission.userId,
        submission.assignment.course?.id ?? submission.assignment.lesson?.module.course.id ?? null,
      ),
    );

    const risksByStudentCourse = groupByKey(risks, (risk) =>
      studentCourseKey(risk.userId, risk.course?.id ?? risk.cohort?.courseId ?? null),
    );
    const risksByStudent = groupByKey(risks, (risk) => risk.userId);

    const conversationByStudent = new Map<string, { unread: number; lastMessageAt: string | null; lessonId?: string; lessonTitle?: string }>();
    for (const message of messages) {
      const partnerId = message.senderId === user.id ? message.receiverId : message.senderId;
      if (!partnerId || !studentIds.includes(partnerId)) continue;
      const current = conversationByStudent.get(partnerId) ?? { unread: 0, lastMessageAt: null };
      if (!current.lastMessageAt) {
        current.lastMessageAt = message.createdAt.toISOString();
        if (message.lessonId) {
          current.lessonId = message.lessonId;
          current.lessonTitle = message.lesson?.title ?? undefined;
        }
      }
      if (message.receiverId === user.id && message.readAt === null) {
        current.unread += 1;
      }
      conversationByStudent.set(partnerId, current);
    }

    const students: CuratorStudentOperation[] = assignments.map((assignment) => {
      const fallbackEnrollment = assignment.cohort.courseId
        ? enrollmentByStudentCourse.get(studentCourseKey(assignment.studentId, assignment.cohort.courseId))
        : enrollmentByStudent.get(assignment.studentId);

      const courseId = assignment.cohort.courseId ?? fallbackEnrollment?.courseId ?? null;
      const courseTitle = assignment.cohort.course?.title ?? fallbackEnrollment?.course.title ?? "Курс не назначен";
      const key = studentCourseKey(assignment.studentId, courseId);
      const progress = progressByStudentCourse.get(key);
      const fallbackProgress = fallbackEnrollment?.courseProgress[0];
      const noCourseRiskKey = studentCourseKey(assignment.studentId, null);
      const studentRisks = key === noCourseRiskKey
        ? (risksByStudentCourse.get(key) ?? [])
        : [
            ...(risksByStudentCourse.get(key) ?? []),
            ...(risksByStudentCourse.get(noCourseRiskKey) ?? []),
          ];
      const allStudentRisks = risksByStudent.get(assignment.studentId) ?? [];
      const relevantRisks = studentRisks.length > 0 ? studentRisks : allStudentRisks;
      const conversation = conversationByStudent.get(assignment.studentId);

      const deadlines: CuratorStudentDeadline[] = [
        ...assignment.cohort.deadlines.map((deadline) => {
          const daysLeft = daysUntil(deadline.dueAt);
          return {
            title: deadline.module.title,
            dueAt: deadline.dueAt.toISOString(),
            daysLeft,
            overdue: daysLeft < 0,
            scope: "module" as const,
          };
        }),
        ...assignment.cohort.blockDeadlines.map((deadline) => {
          const daysLeft = daysUntil(deadline.dueAt);
          return {
            title: deadline.block.title,
            dueAt: deadline.dueAt.toISOString(),
            daysLeft,
            overdue: daysLeft < 0,
            scope: "block" as const,
          };
        }),
      ];

      if (assignment.cohort.endsAt) {
        const daysLeft = daysUntil(assignment.cohort.endsAt);
        deadlines.push({
          title: "Завершение потока",
          dueAt: assignment.cohort.endsAt.toISOString(),
          daysLeft,
          overdue: daysLeft < 0,
          scope: "course",
        });
      }

      const nextDeadline = pickNextDeadline(deadlines);
      const progressPercent = progress?.percent ?? fallbackProgress?.percent ?? 0;
      const progressStatus = (progress?.status ?? fallbackProgress?.status ?? "NOT_STARTED") as ProgressStatus;
      const lastLoginAt = assignment.student.lastLoginAt?.toISOString() ?? null;
      const daysSinceLogin = assignment.student.lastLoginAt
        ? Math.floor((Date.now() - assignment.student.lastLoginAt.getTime()) / DAY_MS)
        : null;
      const openQuestions = questionsByStudentCourse.get(key)?.length ?? 0;
      const pendingAssignments = submissionsByStudentCourse.get(key)?.length ?? 0;
      const activeRisks = relevantRisks.length;
      const highestRiskSeverity = pickHighestRisk(relevantRisks);
      const unreadMessages = conversation?.unread ?? 0;
      const nextAction = buildNextAction({
        risks: activeRisks,
        highestRiskSeverity,
        openQuestions,
        pendingAssignments,
        unreadMessages,
        nextDeadline,
        daysSinceLogin,
        progressPercent,
      });

      return {
        assignmentId: assignment.id,
        studentId: assignment.student.id,
        name: maskStudentName(assignment.student.id),
        email: assignment.student.email,
        cohortId: assignment.cohort.id,
        cohortName: assignment.cohort.name,
        courseId,
        courseTitle,
        progressPercent,
        progressStatus,
        lastLoginAt,
        daysSinceLogin,
        lastContext: lastContextByStudentCourse.get(key) ?? lastContextByStudent.get(assignment.studentId) ?? null,
        nextDeadline,
        openQuestions,
        pendingAssignments,
        activeRisks,
        highestRiskSeverity,
        unreadMessages,
        lastMessageAt: conversation?.lastMessageAt ?? null,
        nextAction,
      };
    }).sort((a, b) => {
      const priorityDelta = ACTION_WEIGHT[a.nextAction.kind] - ACTION_WEIGHT[b.nextAction.kind];
      if (priorityDelta !== 0) return priorityDelta;
      return b.activeRisks - a.activeRisks || b.openQuestions - a.openQuestions || b.pendingAssignments - a.pendingAssignments;
    });

    const formattedQuestions: QuestionFromStudent[] = questions.map((question) => ({
      id: question.id,
      text: question.text,
      studentName: maskStudentName(question.student.id),
      courseTitle: question.lesson.module.course.title,
      moduleTitle: question.lesson.module.title,
      lessonTitle: question.lesson.title,
      status: "open",
      createdAt: question.createdAt.toISOString(),
    }));

    const formattedSubmissions: SubmissionForReview[] = submissions.map((submission) => ({
      id: submission.id,
      assignmentTitle: submission.assignment.title,
      studentName: maskStudentName(submission.user.id),
      studentEmail: submission.user.email,
      courseTitle: submission.assignment.course?.title ?? submission.assignment.lesson?.module.course.title ?? "",
      lessonTitle: submission.assignment.lesson?.title ?? "",
      answerText: submission.answerText,
      fileUrl: submission.fileUrl,
      attemptNumber: submission.attemptNumber,
      submittedAt: submission.submittedAt.toISOString(),
      status: submission.status as SubmissionForReview["status"],
    }));

    const formattedRisks: RiskItem[] = risks.map((risk) => ({
      id: risk.id,
      type: risk.type as RiskItem["type"],
      severity: risk.severity as RiskItem["severity"],
      studentName: maskStudentName(risk.user.id),
      studentEmail: risk.user.email,
      courseTitle: risk.course?.title ?? risk.cohort?.course?.title ?? "",
      cohortName: risk.cohort?.name,
      status: "open",
      createdAt: risk.createdAt.toISOString(),
    }));

    const riskStudentCount = new Set(risks.map((risk) => risk.userId)).size;
    const avgProgress = students.length > 0
      ? Math.round(students.reduce((sum, student) => sum + student.progressPercent, 0) / students.length)
      : 0;
    const overdueDeadlines = students.filter((student) => student.nextDeadline?.overdue).length;
    const unreadMessagesCount = students.reduce((sum, student) => sum + student.unreadMessages, 0);
    const urgentStudents = students.filter((student) => student.nextAction.kind !== "monitor").length;
    const metrics: DashboardMetric[] = [
      {
        label: "Мои слушатели",
        value: students.length,
        tone: students.length > 0 ? "primary" : "neutral",
        detail: `${urgentStudents} требуют действия`,
        href: "/curator/students",
      },
      {
        label: "Открытые вопросы",
        value: formattedQuestions.length,
        tone: formattedQuestions.length > 3 ? "danger" : formattedQuestions.length > 0 ? "warning" : "success",
        href: "/curator/questions",
        priority: formattedQuestions.length > 3 ? "critical" : formattedQuestions.length > 0 ? "elevated" : "normal",
      },
      {
        label: "Задания на проверку",
        value: formattedSubmissions.length,
        tone: formattedSubmissions.length > 5 ? "warning" : "success",
        href: "/curator/assignments",
        priority: formattedSubmissions.length > 5 ? "elevated" : "normal",
      },
      {
        label: "Слушатели с рисками",
        value: riskStudentCount,
        tone: riskStudentCount > 3 ? "danger" : riskStudentCount > 0 ? "warning" : "success",
        href: "/curator/risks",
        priority: riskStudentCount > 3 ? "critical" : riskStudentCount > 0 ? "elevated" : "normal",
      },
      {
        label: "Просроченные дедлайны",
        value: overdueDeadlines,
        tone: overdueDeadlines > 0 ? "danger" : "success",
        priority: overdueDeadlines > 0 ? "critical" : "normal",
      },
      {
        label: "Средний прогресс",
        value: `${avgProgress}%`,
        tone: avgProgress >= 70 ? "success" : avgProgress >= 35 ? "warning" : "danger",
        detail: `${unreadMessagesCount} непрочитанных сообщений`,
      },
    ];

    return {
      metrics,
      questions: formattedQuestions,
      submissions: formattedSubmissions,
      risks: formattedRisks,
      students,
    };
  }, null);
}

export async function getCuratorStudents() {
  await requireRole(["curator", "super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return withQueryFallback(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      include: {
        student: {
          include: {
            enrollments: {
              include: {
                course: { select: { title: true } },
                courseProgress: true,
              },
            },
            riskFlags: {
              where: { resolvedAt: null },
              take: 1,
            },
          },
        },
      },
      take: QUERY_LIMITS.dashboardStudents,
    });

    return assignments.map((assignment) => {
      const enrollment = assignment.student.enrollments[0];
      return {
        id: assignment.student.id,
        name: maskStudentName(assignment.student.id),
        email: assignment.student.email,
        course: enrollment?.course?.title ?? "Не зачислен",
        progress: enrollment?.courseProgress[0]?.percent ?? 0,
        risk: assignment.student.riskFlags.length > 0,
      };
    });
  }, []);
}

export async function getCuratorQuestions(status: QuestionStatus = QuestionStatus.OPEN) {
  await requireRole(["curator", "super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return withQueryFallback(async () => {
    const questions = await prisma.lessonQuestion.findMany({
      where: { curatorId: user.id, status },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, name: true, email: true } },
        lesson: { include: { module: { include: { course: true } } } },
      },
      take: QUERY_LIMITS.questionQueue,
    });

    return questions.map((question) => ({
      id: question.id,
      text: question.text,
      studentName: maskStudentName(question.student.id),
      courseTitle: question.lesson.module.course.title,
      moduleTitle: question.lesson.module.title,
      lessonTitle: question.lesson.title,
      status: (question.status === QuestionStatus.ANSWERED ? "answered" : "open") as "open" | "answered",
      createdAt: question.createdAt.toISOString(),
      answer: question.answer,
      answeredAt: question.answeredAt?.toISOString(),
    }));
  }, []);
}

export async function getCuratorStudentAnalytics(): Promise<StudentAnalyticsDetail[]> {
  await requireRole(["curator"]);
  const user = await getCurrentUser();
  if (!user) return [];

  return withQueryFallback(async () => {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      select: { studentId: true },
      take: QUERY_LIMITS.dashboardStudents,
    });
    const studentIds = assignments.map((assignment) => assignment.studentId);
    return getStudentAnalyticsDetail(studentIds);
  }, []);
}
