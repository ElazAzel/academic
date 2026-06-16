import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { Prisma, QuestionStatus } from "@prisma/client";
import { calculateForUser } from "@/server/modules/productivity-score/service";
import type {
  AssignmentRow,
  CertificateRow,
  CuratorWorkloadRow,
  FinalCohortGraduateRow,
  FinalCohortRiskSummaryRow,
  FinalCohortRow,
  FinalCohortScoreDistributionRow,
  ProductivityScoreRow,
  ProgressRow,
  ReportDataScope,
  RiskRow,
  WeeklyCohortModuleRow,
  WeeklyCohortQuestionRow,
  WeeklyCohortRiskRow,
  WeeklyCohortRow,
} from "./types";

const prisma = getPrisma();

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeScope(scope?: ReportDataScope | string[]): ReportDataScope {
  if (Array.isArray(scope)) return { studentIds: scope };
  return scope ?? {};
}

function hasEmptyExplicitScope(scope: ReportDataScope) {
  return [scope.studentIds, scope.courseIds, scope.cohortIds, scope.curatorIds].some((ids) => ids !== undefined && ids.length === 0);
}

function buildEnrollmentWhere(scope: ReportDataScope): Prisma.EnrollmentWhereInput {
  return {
    ...(scope.studentIds ? { userId: { in: scope.studentIds } } : {}),
    ...(scope.courseIds ? { courseId: { in: scope.courseIds } } : {}),
    ...(scope.cohortIds ? { cohortId: { in: scope.cohortIds } } : {}),
  };
}

function buildRiskWhere(scope: ReportDataScope): Prisma.RiskFlagWhereInput {
  const and: Prisma.RiskFlagWhereInput[] = [];
  if (scope.studentIds) and.push({ userId: { in: scope.studentIds } });
  if (scope.courseIds || scope.cohortIds) {
    const or: Prisma.RiskFlagWhereInput[] = [];
    if (scope.courseIds) or.push({ courseId: { in: scope.courseIds } });
    if (scope.cohortIds) or.push({ cohortId: { in: scope.cohortIds } });
    if (scope.studentIds) or.push({ courseId: null, cohortId: null });
    and.push({ OR: or });
  }
  return and.length > 0 ? { AND: and } : {};
}

function buildCertificateWhere(scope: ReportDataScope): Prisma.CertificateWhereInput {
  return {
    ...(scope.studentIds ? { userId: { in: scope.studentIds } } : {}),
    ...(scope.courseIds ? { courseId: { in: scope.courseIds } } : {}),
  };
}

function assignmentCourseScope(scope: ReportDataScope): Prisma.AssignmentWhereInput | undefined {
  if (!scope.courseIds) return undefined;
  return {
    OR: [
      { courseId: { in: scope.courseIds } },
      { lesson: { module: { courseId: { in: scope.courseIds } } } },
    ],
  };
}

function buildAssignmentSubmissionWhere(scope: ReportDataScope): Prisma.AssignmentSubmissionWhereInput {
  const and: Prisma.AssignmentSubmissionWhereInput[] = [];
  if (scope.studentIds) and.push({ userId: { in: scope.studentIds } });
  const courseScope = assignmentCourseScope(scope);
  if (courseScope) and.push({ assignment: courseScope });
  return and.length > 0 ? { AND: and } : {};
}

export async function fetchProgressData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const where = buildEnrollmentWhere(scope);
  const enrollments = await prisma.enrollment.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, lastLoginAt: true } },
      course: { select: { id: true, title: true } },
      cohort: { select: { name: true } },
      courseProgress: { select: { percent: true } },
    },
    orderBy: [{ course: { title: "asc" } }, { cohort: { name: "asc" } }, { user: { name: "asc" } }],
    take: QUERY_LIMITS.reportRows,
  });

  const userIds = unique(enrollments.map((e) => e.userId));
  if (userIds.length === 0) return [];

  // Latest lesson progress with module/block/lesson info per user
  const latestProgressList = await prisma.lessonProgress.findMany({
    where: {
      userId: { in: userIds },
      ...(scope.courseIds ? { lesson: { module: { courseId: { in: scope.courseIds } } } } : {}),
    },
    orderBy: [{ userId: "asc" }, { updatedAt: "desc" }],
    distinct: ["userId"],
    take: QUERY_LIMITS.reportRows,
    include: {
      lesson: {
        include: {
          block: { select: { title: true } },
          module: { select: { title: true } },
        }
      }
    },
  });

  const progressMap = new Map(latestProgressList.map((lp) => [lp.userId, lp]));

  // Avg lesson time — aggregate in DB instead of fetching 50K rows to Node.js
  let timeSql = Prisma.sql`
    SELECT lp."user_id", CAST(COUNT(*) AS INTEGER) AS count, CAST(SUM(l."duration_minutes") AS INTEGER) AS total
    FROM "lesson_progress" lp
    INNER JOIN "lessons" l ON lp."lesson_id" = l."id"
    INNER JOIN "modules" m ON l."module_id" = m."id"
    WHERE lp."user_id" IN (${Prisma.join(userIds)})
  `;
  if (scope.courseIds) {
    timeSql = Prisma.sql`
      ${timeSql} AND m."course_id" IN (${Prisma.join(scope.courseIds)})
    `;
  }
  timeSql = Prisma.sql`${timeSql} GROUP BY lp."user_id"`;

  type TimeRow = { user_id: string; count: number; total: number | null };
  const timeResults = await prisma.$queryRaw<TimeRow[]>(timeSql);
  const timeMap = new Map<string, { count: number; total: number }>();
  for (const row of timeResults) {
    timeMap.set(row.user_id, { count: row.count, total: row.total ?? 0 });
  }

  // Risk counts
  const riskCounts = await prisma.riskFlag.groupBy({
    by: ["userId"],
    where: { ...buildRiskWhere({ ...scope, studentIds: userIds }), status: "open" },
    _count: { _all: true },
  });
  const riskMap = new Map(riskCounts.map((r) => [r.userId, r._count._all]));

  const rows: ProgressRow[] = enrollments.map((e) => {
    const lp = progressMap.get(e.userId);
    const td = timeMap.get(e.userId);
    return {
      studentName: e.user.name || e.user.email,
      email: e.user.email,
      course: e.course.title,
      cohort: e.cohort?.name || "Без потока",
      progressPercent: e.courseProgress[0]?.percent ?? 0,
      currentModule: lp?.lesson.module.title,
      currentBlock: lp?.lesson.block?.title,
      currentLesson: lp?.lesson.title,
      lastLoginAt: e.user.lastLoginAt?.toISOString() ?? undefined,
      avgLessonMinutes: td && td.count > 0 ? Math.round(td.total / td.count) : 0,
      riskCount: riskMap.get(e.userId) ?? 0,
    };
  });

  return rows;
}

export async function fetchRiskData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const risks = await prisma.riskFlag.findMany({
    where: buildRiskWhere(scope),
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: [{ severity: "desc" }, { user: { name: "asc" } }],
    take: QUERY_LIMITS.reportRows,
  });

  const rows: RiskRow[] = risks.map((r) => ({
    studentName: r.user.name || r.user.email,
    email: r.user.email,
    course: r.course?.title || "—",
    type: r.type,
    severity: r.severity,
    status: r.status,
  }));

  return rows;
}

export async function fetchCertificateData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const certs = await prisma.certificate.findMany({
    where: buildCertificateWhere(scope),
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
    },
    orderBy: [{ issuedAt: "desc" }],
    take: QUERY_LIMITS.reportRows,
  });

  const rows: CertificateRow[] = certs.map((c) => ({
    number: c.number,
    studentName: c.user.name || c.user.email,
    email: c.user.email,
    course: c.course.title,
    issuedAt: c.issuedAt.toISOString().slice(0, 10),
    status: c.revokedAt ? "Отозван" : "Действителен",
    revokedAt: c.revokedAt?.toISOString().slice(0, 10) ?? null,
  }));

  return rows;
}

export async function fetchAssignmentData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const submissions = await prisma.assignmentSubmission.findMany({
    where: buildAssignmentSubmissionWhere(scope),
    include: {
      user: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      assignment: {
        include: {
          course: { select: { title: true } },
          lesson: {
            select: {
              title: true,
              module: { select: { course: { select: { title: true } } } },
            },
          },
        },
      },
    },
    orderBy: [{ submittedAt: "desc" }],
    take: QUERY_LIMITS.reportRows,
  });

  const rows: AssignmentRow[] = submissions.map((submission) => ({
    studentName: submission.user.name || submission.user.email,
    email: submission.user.email,
    course: submission.assignment.course?.title ?? submission.assignment.lesson?.module.course.title ?? "—",
    lesson: submission.assignment.lesson?.title,
    assignment: submission.assignment.title,
    status: submission.status,
    score: submission.score,
    submittedAt: submission.submittedAt.toISOString().slice(0, 10),
    reviewedAt: submission.reviewedAt?.toISOString().slice(0, 10) ?? null,
    reviewerName: submission.reviewedBy?.name ?? submission.reviewedBy?.email ?? null,
  }));

  return rows;
}

export async function fetchCuratorWorkloadData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const assignments = await prisma.curatorAssignment.findMany({
    where: {
      active: true,
      ...(scope.curatorIds ? { curatorId: { in: scope.curatorIds } } : {}),
      ...(scope.cohortIds ? { cohortId: { in: scope.cohortIds } } : {}),
      ...(scope.studentIds ? { studentId: { in: scope.studentIds } } : {}),
    },
    include: {
      curator: { select: { id: true, name: true, email: true } },
      cohort: { select: { id: true, name: true, courseId: true } },
    },
    orderBy: [{ curator: { name: "asc" } }, { assignedAt: "desc" }],
    take: QUERY_LIMITS.reportRows,
  });

  if (assignments.length === 0) return [];

  const studentIds = unique(assignments.map((assignment) => assignment.studentId));
  const courseIds = scope.courseIds ?? unique(assignments.map((assignment) => assignment.cohort.courseId).filter((id): id is string => Boolean(id)));
  const scopedForStudents: ReportDataScope = { ...scope, studentIds, courseIds };

  const [questions, submissions, risks, progressRows] = await Promise.all([
    prisma.lessonQuestion.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: [QuestionStatus.OPEN, QuestionStatus.FORWARDED] },
        ...(courseIds.length > 0 ? { lesson: { module: { courseId: { in: courseIds } } } } : {}),
      },
      select: { studentId: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        ...buildAssignmentSubmissionWhere(scopedForStudents),
        status: { in: ["SUBMITTED", "IN_REVIEW"] },
      },
      select: { userId: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.riskFlag.findMany({
      where: { ...buildRiskWhere(scopedForStudents), status: "open", resolvedAt: null },
      select: { userId: true, severity: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.courseProgress.findMany({
      where: {
        userId: { in: studentIds },
        ...(courseIds.length > 0 ? { courseId: { in: courseIds } } : {}),
      },
      select: { userId: true, percent: true },
      take: QUERY_LIMITS.reportRows,
    }),
  ]);

  const groups = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const group = groups.get(assignment.curatorId) ?? [];
    group.push(assignment);
    groups.set(assignment.curatorId, group);
  }

  const rows: CuratorWorkloadRow[] = Array.from(groups.entries()).map(([, curatorAssignments]) => {
    const first = curatorAssignments[0]!;
    const curatorStudentIds = new Set(curatorAssignments.map((assignment) => assignment.studentId));
    const progressValues = progressRows
      .filter((progress) => curatorStudentIds.has(progress.userId))
      .map((progress) => progress.percent);
    const activeRisks = risks.filter((risk) => curatorStudentIds.has(risk.userId));
    return {
      curatorName: first.curator.name ?? first.curator.email,
      curatorEmail: first.curator.email,
      cohorts: unique(curatorAssignments.map((assignment) => assignment.cohort.name)).join(", "),
      studentsCount: curatorStudentIds.size,
      avgProgress: progressValues.length > 0 ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : 0,
      openQuestions: questions.filter((question) => curatorStudentIds.has(question.studentId)).length,
      pendingAssignments: submissions.filter((submission) => curatorStudentIds.has(submission.userId)).length,
      activeRisks: activeRisks.length,
      criticalRisks: activeRisks.filter((risk) => risk.severity === "critical").length,
    };
  });

  return rows.sort((a, b) => b.criticalRisks - a.criticalRisks || b.activeRisks - a.activeRisks || b.pendingAssignments - a.pendingAssignments);
}

export async function fetchProductivityScoreData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...buildEnrollmentWhere(scope),
      status: "ACTIVE",
    },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } },
      cohort: { select: { name: true } },
    },
    orderBy: [{ course: { title: "asc" } }, { cohort: { name: "asc" } }, { user: { name: "asc" } }],
    take: QUERY_LIMITS.reportRows,
  });

  const rows: ProductivityScoreRow[] = [];

  for (const enrollment of enrollments) {
    if (!enrollment.courseId) continue;
    try {
      const score = await calculateForUser(enrollment.userId, enrollment.courseId);
      const testsComp = score.components.find((c) => c.key === "tests");
      const assignmentsComp = score.components.find((c) => c.key === "assignments");
      const finalProjectComp = score.components.find((c) => c.key === "final_project");
      const activityComp = score.components.find((c) => c.key === "activity");
      const diagnosticsComp = score.components.find((c) => c.key === "diagnostics");

      rows.push({
        studentName: enrollment.user.name || enrollment.user.email,
        email: enrollment.user.email,
        course: enrollment.course.title,
        cohort: enrollment.cohort?.name || "Без потока",
        totalScore: score.totalScore,
        level: score.level,
        testsScore: testsComp?.score ?? 0,
        assignmentsScore: assignmentsComp?.score ?? 0,
        finalProjectScore: finalProjectComp?.score ?? 0,
        activityScore: activityComp?.score ?? 0,
        diagnosticsScore: diagnosticsComp?.score ?? 0,
      });
    } catch {
      // Silently skip students where score calculation fails
      continue;
    }
  }

  return rows;
}

// ── Weekly Cohort Report ──────────────────────────────────────────────

export async function fetchWeeklyCohortData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const cohortWhere: Prisma.CohortWhereInput = {};
  if (scope.cohortIds) cohortWhere.id = { in: scope.cohortIds };
  if (scope.courseIds) cohortWhere.courseId = { in: scope.courseIds };

  const cohorts = await prisma.cohort.findMany({
    where: cohortWhere,
    include: {
      course: { select: { id: true, title: true } },
      enrollments: {
        where: {
          status: "ACTIVE",
          ...(scope.studentIds ? { userId: { in: scope.studentIds } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
          courseProgress: { select: { percent: true }, where: { courseId: scope.courseIds ? { in: scope.courseIds } : undefined } },
        },
      },
    },
    orderBy: [{ course: { title: "asc" } }, { name: "asc" }],
    take: QUERY_LIMITS.reportRows,
  });

  if (cohorts.length === 0) return [];

  // Collect all student IDs from all cohorts
  const allStudentIds = cohorts.flatMap((cohort) =>
    cohort.enrollments.map((e) => e.userId),
  );
  if (allStudentIds.length === 0) return [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Batch queries for risk flags, questions, submissions in the past 7 days
  const [risks, questions, submissions] = await Promise.all([
    prisma.riskFlag.findMany({
      where: {
        userId: { in: allStudentIds },
        status: "open",
        resolvedAt: null,
      },
      select: { userId: true, severity: true, cohortId: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.lessonQuestion.findMany({
      where: {
        studentId: { in: allStudentIds },
        createdAt: { gte: weekAgo },
      },
      select: { studentId: true, answeredAt: true, createdAt: true, answer: true, status: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        userId: { in: allStudentIds },
        submittedAt: { gte: weekAgo },
      },
      select: { userId: true, score: true, status: true },
      take: QUERY_LIMITS.reportRows,
    }),
  ]);

  // Index data by student ID
  const riskCountByStudent = new Map<string, number>();
  const criticalRiskCountByStudent = new Map<string, number>();
  for (const risk of risks) {
    riskCountByStudent.set(risk.userId, (riskCountByStudent.get(risk.userId) ?? 0) + 1);
    if (risk.severity === "critical") {
      criticalRiskCountByStudent.set(risk.userId, (criticalRiskCountByStudent.get(risk.userId) ?? 0) + 1);
    }
  }

  // Questions: per-student last-7-days stats
  const questionCountByStudent = new Map<string, number>();
  const responseHoursByStudent: { studentId: string; hours: number }[] = [];
  for (const q of questions) {
    questionCountByStudent.set(q.studentId, (questionCountByStudent.get(q.studentId) ?? 0) + 1);
    if (q.answeredAt && q.answer) {
      const hours = (q.answeredAt.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60);
      responseHoursByStudent.push({ studentId: q.studentId, hours });
    }
  }

  // Submissions: per-student last-7-days stats
  const submissionCountByStudent = new Map<string, number>();
  const submissionScoresByStudent: { studentId: string; score: number }[] = [];
  for (const s of submissions) {
    submissionCountByStudent.set(s.userId, (submissionCountByStudent.get(s.userId) ?? 0) + 1);
    if (s.score != null) {
      submissionScoresByStudent.push({ studentId: s.userId, score: s.score });
    }
  }

  const rows: WeeklyCohortRow[] = [];

  for (const cohort of cohorts) {
    const enrollments = cohort.enrollments;
    const total = enrollments.length;
    if (total === 0) continue;

    const activeStudents = enrollments.filter(
      (e) => e.user.lastLoginAt && e.user.lastLoginAt > weekAgo,
    ).length;

    const avgProgress =
      total > 0
        ? Math.round(
            enrollments.reduce(
              (sum, e) => sum + (e.courseProgress[0]?.percent ?? 0),
              0,
            ) / total,
          )
        : 0;

    const completedWeek = enrollments.filter(
      (e) => (e.courseProgress[0]?.percent ?? 0) >= 100,
    ).length;

    const cohortStudentIds = enrollments.map((e) => e.userId);
    const behind = cohortStudentIds.filter(
      (sid) => (riskCountByStudent.get(sid) ?? 0) > 0,
    ).length;
    const criticalRisks = cohortStudentIds.reduce(
      (sum, sid) => sum + (criticalRiskCountByStudent.get(sid) ?? 0),
      0,
    );

    const totalQuestions = cohortStudentIds.reduce(
      (sum, sid) => sum + (questionCountByStudent.get(sid) ?? 0),
      0,
    );

    const cohortResponseHours = responseHoursByStudent.filter((r) =>
      cohortStudentIds.includes(r.studentId),
    );
    const avgResponseTimeHours =
      cohortResponseHours.length > 0
        ? Math.round(
            (cohortResponseHours.reduce((sum, r) => sum + r.hours, 0) /
              cohortResponseHours.length) *
              10,
          ) / 10
        : 0;

    const submittedAssignments = cohortStudentIds.reduce(
      (sum, sid) => sum + (submissionCountByStudent.get(sid) ?? 0),
      0,
    );

    const cohortScores = submissionScoresByStudent.filter((s) =>
      cohortStudentIds.includes(s.studentId),
    );
    const avgAssignmentScore =
      cohortScores.length > 0
        ? Math.round(
            cohortScores.reduce((sum, s) => sum + s.score, 0) /
              cohortScores.length,
          )
        : 0;

    // Period covers the report week
    const periodStart = weekAgo.toISOString().slice(0, 10);
    const periodEnd = now.toISOString().slice(0, 10);

    rows.push({
      cohortName: cohort.name,
      course: cohort.course?.title ?? "—",
      periodStart,
      periodEnd,
      weekNumber: 0, // Placeholder — real week number would need cohort start date
      totalStudents: total,
      activeStudents,
      activePercent: Math.round((activeStudents / total) * 100),
      moduleProgressPercent: avgProgress,
      completedWeekCount: completedWeek,
      completedWeekPercent: Math.round((completedWeek / total) * 100),
      behindCount: behind,
      behindPercent: Math.round((behind / total) * 100),
      criticalRisks,
      totalQuestions,
      avgResponseTimeHours,
      submittedAssignments,
      avgAssignmentScore,
      currentModule: "", // Will be populated from ModuleProgress data if available
    });
  }

  return rows;
}

export async function fetchWeeklyCohortRisks(cohortIds: string[]): Promise<WeeklyCohortRiskRow[]> {
  if (cohortIds.length === 0) return [];

  const riskFlags = await prisma.riskFlag.findMany({
    where: {
      cohortId: { in: cohortIds },
      status: "open",
      resolvedAt: null,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: QUERY_LIMITS.reportRows,
  });

  return riskFlags.map((rf) => ({
    studentName: rf.user.name || rf.user.email,
    email: rf.user.email,
    riskType: rf.type,
    severity: rf.severity,
    action: "", // Not stored in system; curator would document externally
    status: rf.status,
  }));
}

export async function fetchWeeklyCohortQuestions(cohortIds: string[]): Promise<WeeklyCohortQuestionRow[]> {
  if (cohortIds.length === 0) return [];

  // Get student IDs enrolled in these cohorts
  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: { in: cohortIds }, status: "ACTIVE" },
    select: { userId: true },
    take: QUERY_LIMITS.reportRows,
  });
  const studentIds = enrollments.map((e) => e.userId);
  if (studentIds.length === 0) return [];

  const questions = await prisma.lessonQuestion.findMany({
    where: { studentId: { in: studentIds }, answer: { not: null } },
    include: {
      student: { select: { name: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: QUERY_LIMITS.reportRows,
  });

  return questions.map((q) => ({
    studentName: q.student.name || q.student.email,
    email: q.student.email,
    question: q.text,
    answer: q.answer ?? "",
    responseTimeHours:
      q.answeredAt
        ? Math.round(
            ((q.answeredAt.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60)) * 10,
          ) / 10
        : 0,
  }));
}

export async function fetchWeeklyCohortModuleProgress(cohortIds: string[]): Promise<WeeklyCohortModuleRow[]> {
  if (cohortIds.length === 0) return [];

  // Get course IDs from cohorts
  const cohorts = await prisma.cohort.findMany({
    where: { id: { in: cohortIds } },
    select: { courseId: true },
  });
  const courseIds = unique(cohorts.map((c) => c.courseId).filter((id): id is string => Boolean(id)));
  if (courseIds.length === 0) return [];

  // Get student IDs enrolled in these cohorts
  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: { in: cohortIds }, status: "ACTIVE" },
    select: { userId: true },
    take: QUERY_LIMITS.reportRows,
  });
  const studentIds = new Set(enrollments.map((e) => e.userId));

  const modules = await prisma.module.findMany({
    where: { courseId: { in: courseIds } },
    include: {
      progress: {
        where: {
          userId: { in: [...studentIds] },
        },
        select: { userId: true, percent: true },
      },
    },
    orderBy: [{ courseId: "asc" }, { order: "asc" }],
    take: QUERY_LIMITS.reportRows,
  });
  if (studentIds.size === 0) return [];

  // Quiz attempts per module — aggregate to get avg test scores
  // We need to map quizzes → lessons → modules
  const quizzes = await prisma.quiz.findMany({
    where: { courseId: { in: courseIds } },
    select: {
      id: true,
      lesson: { select: { moduleId: true } },
    },
  });
  const quizToModule = new Map<string, string>();
  for (const q of quizzes) {
    if (q.lesson?.moduleId) quizToModule.set(q.id, q.lesson.moduleId);
  }

  const quizIds = [...quizToModule.keys()];
  let quizScoresByModule = new Map<string, number[]>();
  if (quizIds.length > 0) {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: { in: quizIds },
        userId: { in: [...studentIds] },
        passed: true,
        score: { gt: 0 },
      },
      select: { quizId: true, score: true },
      take: QUERY_LIMITS.reportRows,
    });
    for (const att of attempts) {
      const moduleId = quizToModule.get(att.quizId);
      if (moduleId) {
        const scores = quizScoresByModule.get(moduleId) ?? [];
        scores.push(att.score);
        quizScoresByModule.set(moduleId, scores);
      }
    }
  }

  // Assignment submissions per module
  const lessons = await prisma.lesson.findMany({
    where: { moduleId: { in: modules.map((m) => m.id) } },
    select: { id: true, moduleId: true },
  });
  const lessonToModule = new Map(lessons.map((l) => [l.id, l.moduleId]));

  const assignments = await prisma.assignment.findMany({
    where: { lessonId: { in: [...lessonToModule.keys()] } },
    select: { id: true, lessonId: true },
  });

  const assignmentIds = assignments.map((a) => a.id);
  let submissionsByModule = new Map<string, { total: number; submitted: number }>();
  if (assignmentIds.length > 0) {
    const subs = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        userId: { in: [...studentIds] },
      },
      select: { assignmentId: true, status: true },
      take: QUERY_LIMITS.reportRows,
    });
    for (const sub of subs) {
      const assignment = assignments.find((a) => a.id === sub.assignmentId);
      if (!assignment || !assignment.lessonId) continue;
      const moduleId = lessonToModule.get(assignment.lessonId);
      if (!moduleId) continue;
      const current = submissionsByModule.get(moduleId) ?? { total: 0, submitted: 0 };
      current.total++;
      if (sub.status !== "DRAFT") current.submitted++;
      submissionsByModule.set(moduleId, current);
    }
  }

  const rows: WeeklyCohortModuleRow[] = [];
  for (const mod of modules) {
    const progressPercentages = mod.progress
      .filter((p) => studentIds.has(p.userId))
      .map((p) => p.percent);
    const completionPercent =
      progressPercentages.length > 0
        ? Math.round(
            progressPercentages.reduce((sum, p) => sum + p, 0) / progressPercentages.length,
          )
        : 0;

    const moduleQuizScores = quizScoresByModule.get(mod.id) ?? [];
    const avgTestScore =
      moduleQuizScores.length > 0
        ? Math.round(
            moduleQuizScores.reduce((sum, s) => sum + s, 0) / moduleQuizScores.length,
          )
        : 0;

    const subs = submissionsByModule.get(mod.id);
    const assignmentSubmittedPercent =
      subs && subs.total > 0 ? Math.round((subs.submitted / subs.total) * 100) : 0;

    rows.push({
      moduleName: mod.title,
      completionPercent,
      avgTestScore,
      assignmentSubmittedPercent,
    });
  }

  return rows;
}

// ── Final Cohort Report ──────────────────────────────────────────────

export async function fetchFinalCohortData(input?: ReportDataScope | string[]) {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const cohortWhere: Prisma.CohortWhereInput = {};
  if (scope.cohortIds) cohortWhere.id = { in: scope.cohortIds };
  if (scope.courseIds) cohortWhere.courseId = { in: scope.courseIds };

  const cohorts = await prisma.cohort.findMany({
    where: cohortWhere,
    include: {
      course: { select: { id: true, title: true, completionThreshold: true, finalAssignmentId: true } },
      enrollments: {
        where: {
          ...(scope.studentIds ? { userId: { in: scope.studentIds } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          courseProgress: { select: { percent: true } },
        },
      },
    },
    orderBy: [{ course: { title: "asc" } }, { name: "asc" }],
    take: QUERY_LIMITS.reportRows,
  });

  if (cohorts.length === 0) return [];

  const allStudentIds = cohorts.flatMap((c) => c.enrollments.map((e) => e.userId));
  if (allStudentIds.length === 0) return [];

  // Batch: certificates, final assignment submissions, quiz attempts, graded submissions, satisfaction
  const [certs, finalSubmissions, quizAttempts, gradedSubmissions, surveys] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId: { in: allStudentIds } },
      select: { userId: true, courseId: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        userId: { in: allStudentIds },
        assignment: {
          courseId: { not: null },
          lessonId: null,
        },
      },
      include: { assignment: { select: { id: true, title: true, courseId: true } } },
      orderBy: { submittedAt: "desc" },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.quizAttempt.findMany({
      where: { userId: { in: allStudentIds }, passed: true, score: { gt: 0 } },
      select: { userId: true, score: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.assignmentSubmission.findMany({
      where: { userId: { in: allStudentIds }, score: { not: null }, status: "ACCEPTED" },
      select: { userId: true, score: true },
      take: QUERY_LIMITS.reportRows,
    }),
    prisma.courseSurvey.findMany({
      where: { userId: { in: allStudentIds } },
      select: { userId: true, courseId: true, data: true },
      take: QUERY_LIMITS.reportRows,
    }),
  ]);

  // Index data
  const certsByUser = new Map<string, Set<string>>();
  for (const c of certs) {
    const set = certsByUser.get(c.userId) ?? new Set();
    set.add(c.courseId);
    certsByUser.set(c.userId, set);
  }

  const finalSubByUser = new Map<string, { title: string; courseId: string; score: number | null }>();
  for (const sub of finalSubmissions) {
    const key = `${sub.userId}:${sub.assignment.courseId}`;
    if (!finalSubByUser.has(key)) {
      finalSubByUser.set(key, {
        title: sub.assignment.title,
        courseId: sub.assignment.courseId ?? "",
        score: sub.score,
      });
    }
  }

  // Scores per user per course
  const quizScoresByUser = new Map<string, number[]>();
  for (const qa of quizAttempts) {
    const scores = quizScoresByUser.get(qa.userId) ?? [];
    scores.push(qa.score);
    quizScoresByUser.set(qa.userId, scores);
  }

  const assignmentScoresByUser = new Map<string, number[]>();
  for (const sub of gradedSubmissions) {
    const scores = assignmentScoresByUser.get(sub.userId) ?? [];
    scores.push(sub.score!);
    assignmentScoresByUser.set(sub.userId, scores);
  }

  // Satisfaction scores per user per course
  const satisfactionScores: number[] = [];
  const npsScores: number[] = [];
  for (const survey of surveys) {
    const data = survey.data as Record<string, unknown> | null;
    if (data) {
      const score = typeof data.satisfaction === "number" ? data.satisfaction
        : typeof data.rating === "number" ? data.rating
        : null;
      if (score != null) satisfactionScores.push(score);
      const nps = typeof data.nps === "number" ? data.nps : null;
      if (nps != null) npsScores.push(nps);
    }
  }

  // Productivity scores
  const productivityScores: number[] = [];
  for (const cohort of cohorts) {
    if (!cohort.courseId) continue;
    for (const enrollment of cohort.enrollments) {
      try {
        const { calculateForUser } = await import("@/server/modules/productivity-score/service");
        const score = await calculateForUser(enrollment.userId, cohort.courseId);
        productivityScores.push(score.totalScore);
      } catch {
        // Skip students with errors
      }
    }
  }

  const rows: FinalCohortRow[] = [];

  for (const cohort of cohorts) {
    const enrollments = cohort.enrollments;
    const total = enrollments.length;
    if (total === 0) continue;

    const threshold = cohort.course?.completionThreshold ?? 85;
    const completed = enrollments.filter(
      (e) => (e.courseProgress[0]?.percent ?? 0) >= threshold,
    ).length;

    const studentIds = enrollments.map((e) => e.userId);
    const courseId = cohort.courseId;

    // Final project: submissions matching course's final assignment
    let fpSubmitted = 0;
    let fpScores: number[] = [];
    const finalAssignmentId = cohort.course?.finalAssignmentId;
    if (finalAssignmentId) {
      const fpSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          assignmentId: finalAssignmentId,
          userId: { in: studentIds },
        },
        select: { score: true, status: true },
        take: QUERY_LIMITS.reportRows,
      });
      fpSubmitted = fpSubmissions.filter((s) => s.status !== "DRAFT").length;
      fpScores = fpSubmissions
        .filter((s) => s.score != null && s.status === "ACCEPTED")
        .map((s) => s.score!);
    }

    const certCount = studentIds.filter(
      (sid) => courseId && certsByUser.get(sid)?.has(courseId),
    ).length;

    // Avg scores for this cohort
    const cohortQuizScores = studentIds.flatMap((sid) => quizScoresByUser.get(sid) ?? []);
    const cohortAssignmentScores = studentIds.flatMap((sid) => assignmentScoresByUser.get(sid) ?? []);

    const cohortProductivityScores = productivityScores.filter((_, i) => {
      // Match by index in the original enrollment list
      const enrollment = cohort.enrollments.find((e) => e.userId === studentIds[i]);
      return !!enrollment;
    });

    rows.push({
      cohortName: cohort.name,
      course: cohort.course?.title ?? "—",
      periodStart: cohort.createdAt.toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
      totalEnrolled: total,
      completedCount: completed,
      completedPercent: Math.round((completed / total) * 100),
      finalProjectSubmitted: fpSubmitted,
      finalProjectPercent: total > 0 ? Math.round((fpSubmitted / total) * 100) : 0,
      certificatesIssued: certCount,
      certificatesPercent: total > 0 ? Math.round((certCount / total) * 100) : 0,
      avgProductivityScore:
        cohortProductivityScores.length > 0
          ? Math.round(
              cohortProductivityScores.reduce((s, v) => s + v, 0) /
                cohortProductivityScores.length,
            )
          : 0,
      avgTestScore:
        cohortQuizScores.length > 0
          ? Math.round(
              cohortQuizScores.reduce((s, v) => s + v, 0) / cohortQuizScores.length,
            )
          : 0,
      avgAssignmentScore:
        cohortAssignmentScores.length > 0
          ? Math.round(
              cohortAssignmentScores.reduce((s, v) => s + v, 0) /
                cohortAssignmentScores.length,
            )
          : 0,
      avgFinalProjectScore:
        fpScores.length > 0
          ? Math.round(fpScores.reduce((s, v) => s + v, 0) / fpScores.length)
          : 0,
      satisfactionScore:
        satisfactionScores.length > 0
          ? Math.round(
              (satisfactionScores.reduce((s, v) => s + v, 0) / satisfactionScores.length) * 10,
            ) / 10
          : 0,
      nps:
        npsScores.length > 0
          ? Math.round(
              npsScores.reduce((s, v) => s + v, 0) / npsScores.length,
            )
          : 0,
      automatedTasksCount: 0, // Not stored in current schema
    });
  }

  return rows;
}

export async function fetchFinalCohortScoreDistribution(input?: ReportDataScope | string[]): Promise<FinalCohortScoreDistributionRow[]> {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...buildEnrollmentWhere(scope),
    },
    select: { userId: true, courseId: true },
    take: QUERY_LIMITS.reportRows,
  });

  const levels: Record<string, number> = {
    "AI Productivity Champion (90–100)": 0,
    "Advanced User (70–89)": 0,
    "Practitioner (40–69)": 0,
    "Beginner (0–39)": 0,
  };
  let total = 0;

  for (const enrollment of enrollments) {
    if (!enrollment.courseId) continue;
    try {
      const { calculateForUser } = await import("@/server/modules/productivity-score/service");
      const score = await calculateForUser(enrollment.userId, enrollment.courseId);
      total++;
      if (score.totalScore >= 90) levels["AI Productivity Champion (90–100)"]++;
      else if (score.totalScore >= 70) levels["Advanced User (70–89)"]++;
      else if (score.totalScore >= 40) levels["Practitioner (40–69)"]++;
      else levels["Beginner (0–39)"]++;
    } catch {
      continue;
    }
  }

  return Object.entries(levels)
    .filter(([, count]) => count > 0 || total > 0)
    .map(([level, count]) => ({
      level,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export async function fetchFinalCohortGraduates(input?: ReportDataScope | string[]): Promise<FinalCohortGraduateRow[]> {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...buildEnrollmentWhere(scope),
    },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { id: true, title: true, finalAssignmentId: true } },
      courseProgress: { select: { percent: true } },
    },
    orderBy: [{ user: { name: "asc" } }],
    take: QUERY_LIMITS.reportRows,
  });

  const rows: FinalCohortGraduateRow[] = [];
  // Only include graduates (completed >= 85%)
  const threshold = 85;

  for (const enrollment of enrollments) {
    if ((enrollment.courseProgress[0]?.percent ?? 0) < threshold) continue;
    if (!enrollment.courseId) continue;

    let productivityScore = 0;
    let level = "—";
    try {
      const { calculateForUser } = await import("@/server/modules/productivity-score/service");
      const score = await calculateForUser(enrollment.userId, enrollment.courseId);
      productivityScore = score.totalScore;
      level = score.level;
    } catch {
      // Use defaults
    }

    let finalProjectTitle = "";
    const finalAssignmentId = enrollment.course.finalAssignmentId;
    if (finalAssignmentId) {
      const sub = await prisma.assignmentSubmission.findFirst({
        where: { userId: enrollment.userId, assignmentId: finalAssignmentId },
        orderBy: { submittedAt: "desc" },
        select: { status: true },
      });
      if (sub && sub.status !== "DRAFT") {
        finalProjectTitle = "Сдано";
        if (sub.status === "ACCEPTED") finalProjectTitle = "Принято";
        if (sub.status === "NEEDS_REVISION") finalProjectTitle = "На доработке";
      }
    }

    const cert = await prisma.certificate.findFirst({
      where: { userId: enrollment.userId, courseId: enrollment.courseId },
      select: { id: true },
    });

    rows.push({
      studentName: enrollment.user.name || enrollment.user.email,
      email: enrollment.user.email,
      productivityScore,
      level,
      finalProjectTitle,
      certificateStatus: cert ? "✅" : "—",
    });
  }

  return rows;
}

export async function fetchFinalCohortRiskSummary(input?: ReportDataScope | string[]): Promise<FinalCohortRiskSummaryRow[]> {
  const scope = normalizeScope(input);
  if (hasEmptyExplicitScope(scope)) return [];

  const risks = await prisma.riskFlag.findMany({
    where: buildRiskWhere(scope),
    select: { type: true, status: true, resolvedAt: true },
    take: QUERY_LIMITS.reportRows,
  });

  const grouped = new Map<string, { total: number; resolved: number; unresolved: number }>();
  for (const risk of risks) {
    const current = grouped.get(risk.type) ?? { total: 0, resolved: 0, unresolved: 0 };
    current.total++;
    if (risk.status !== "open" || risk.resolvedAt) current.resolved++;
    else current.unresolved++;
    grouped.set(risk.type, current);
  }

  return Array.from(grouped.entries()).map(([riskType, stats]) => ({
    riskType,
    totalCount: stats.total,
    resolvedCount: stats.resolved,
    unresolvedCount: stats.unresolved,
  }));
}

export function groupByCourse<T extends { course: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const existing = map.get(row.course) ?? [];
    existing.push(row);
    map.set(row.course, existing);
  }
  return map;
}
