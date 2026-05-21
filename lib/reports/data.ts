import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { Prisma, QuestionStatus } from "@prisma/client";
import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, ProgressRow, ReportDataScope, RiskRow } from "./types";

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
    SELECT lp."userId", CAST(COUNT(*) AS INTEGER) AS count, CAST(SUM(l."durationMinutes") AS INTEGER) AS total
    FROM "LessonProgress" lp
    INNER JOIN "Lesson" l ON lp."lessonId" = l."id"
    INNER JOIN "Module" m ON l."moduleId" = m."id"
    WHERE lp."userId" IN (${Prisma.join(userIds)})
  `;
  if (scope.courseIds) {
    timeSql = Prisma.sql`
      ${timeSql} AND m."courseId" IN (${Prisma.join(scope.courseIds)})
    `;
  }
  timeSql = Prisma.sql`${timeSql} GROUP BY lp."userId"`;

  type TimeRow = { userId: string; count: number; total: number | null };
  const timeResults = await prisma.$queryRaw<TimeRow[]>(timeSql);
  const timeMap = new Map<string, { count: number; total: number }>();
  for (const row of timeResults) {
    timeMap.set(row.userId, { count: row.count, total: row.total ?? 0 });
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

export function groupByCourse<T extends { course: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const existing = map.get(row.course) ?? [];
    existing.push(row);
    map.set(row.course, existing);
  }
  return map;
}
