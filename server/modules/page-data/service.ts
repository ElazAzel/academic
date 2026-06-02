import { CourseStatus, Prisma, ProgressStatus, QuestionStatus, SubmissionStatus, UserAccountStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/page-guards";
import { buildMessagePreview } from "@/lib/chat/utils";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { maskStudentName } from "@/lib/utils";
import type { RoleKey, SubmissionForReview } from "@/types/domain";

const prisma = getPrisma();

function hasGlobalInstructorPageAccess(roleKeys: RoleKey[]) {
  return roleKeys.includes("admin");
}

function instructorAssignmentWhere(userId: string, roleKeys: RoleKey[]): Prisma.AssignmentWhereInput {
  if (hasGlobalInstructorPageAccess(roleKeys)) return {};

  return {
    OR: [
      { course: { instructors: { some: { userId } } } },
      { lesson: { module: { course: { instructors: { some: { userId } } } } } },
    ],
  };
}

function instructorQuizWhere(userId: string, roleKeys: RoleKey[]): Prisma.QuizWhereInput {
  if (hasGlobalInstructorPageAccess(roleKeys)) return {};

  return {
    OR: [
      { course: { instructors: { some: { userId } } } },
      { lesson: { module: { course: { instructors: { some: { userId } } } } } },
    ],
  };
}

function quizWhereForCourseIds(courseIds: string[]): Prisma.QuizWhereInput {
  return {
    OR: [
      { courseId: { in: courseIds } },
      { lesson: { module: { courseId: { in: courseIds } } } },
    ],
  };
}

export async function getAdminAnalyticsPageData() {
  const [
    activeUsersCount,
    avgProgressAgg,
    completedCount,
    certsCount,
    coursesDb,
    totalUsers,
    usersByStatus,
    recentUsers,
    roleGroups,
  ] = await Promise.all([
    prisma.user.count({ where: { status: UserAccountStatus.ACTIVE } }),
    prisma.courseProgress.aggregate({ _avg: { percent: true } }),
    prisma.courseProgress.count({ where: { status: ProgressStatus.COMPLETED } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      take: QUERY_LIMITS.reportSummaryCourses,
      include: {
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, email: true, status: true, createdAt: true },
    }),
    prisma.userRole.groupBy({
      by: ["roleId"],
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),
  ]);

  const roleIds = roleGroups.map((roleGroup) => roleGroup.roleId);
  const roles = roleIds.length > 0
    ? await prisma.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true, name: true },
      })
    : [];
  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const courseIds = coursesDb.map((course) => course.id);
  const [courseProgressAverages, courseCompletedCounts] = courseIds.length > 0
    ? await Promise.all([
        prisma.courseProgress.groupBy({
          by: ["courseId"],
          where: { courseId: { in: courseIds } },
          _avg: { percent: true },
        }),
        prisma.courseProgress.groupBy({
          by: ["courseId"],
          where: { courseId: { in: courseIds }, status: ProgressStatus.COMPLETED },
          _count: { _all: true },
        }),
      ])
    : [[], []] as const;
  const avgProgressByCourse = new Map(
    courseProgressAverages.map((row) => [row.courseId, Math.round(row._avg.percent ?? 0)]),
  );
  const completedByCourse = new Map(
    courseCompletedCounts.map((row) => [row.courseId, row._count._all]),
  );

  const activeFromStatus = usersByStatus.find((user) => user.status === UserAccountStatus.ACTIVE)?._count._all ?? 0;
  const inactiveFromStatus = usersByStatus.find((user) => user.status === UserAccountStatus.INACTIVE)?._count._all ?? 0;
  const avgProgress = Math.round(avgProgressAgg._avg.percent ?? 0);
  const courseStats = coursesDb.map((course) => {
    const enrollments = course._count.enrollments;
    const completed = completedByCourse.get(course.id) ?? 0;
    const courseAvgProgress = avgProgressByCourse.get(course.id) ?? 0;
    return { title: course.title, enrolled: enrollments, completed, avgProgress: courseAvgProgress };
  });
  const bestCourse = [...courseStats].sort((a, b) => b.avgProgress - a.avgProgress)[0];

  return {
    activeUsersCount,
    avgProgress,
    completedCount,
    certsCount,
    totalUsers,
    activeFromStatus,
    inactiveFromStatus,
    courseStats,
    bestCourse,
    recentUsers,
    roleGroups: roleGroups.map((roleGroup) => ({
      roleId: roleGroup.roleId,
      count: roleGroup._count._all,
      name: roleMap.get(roleGroup.roleId)?.name ?? roleGroup.roleId,
    })),
  };
}

export async function getAdminReportsPageData() {
  const [
    totalUsers,
    totalEnrollments,
    completedCourses,
    certsCount,
    courseStats,
    progressByCourse,
    completedByCourse,
    publishedCourses,
    draftCourses,
    openRisks,
    pendingReviews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.courseProgress.count({ where: { status: ProgressStatus.COMPLETED } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { title: "asc" },
      take: QUERY_LIMITS.reportSummaryCourses,
    }),
    prisma.courseProgress.groupBy({
      by: ["courseId"],
      _avg: { percent: true },
    }),
    prisma.courseProgress.groupBy({
      by: ["courseId"],
      where: { status: ProgressStatus.COMPLETED },
      _count: { _all: true },
    }),
    prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
    prisma.course.count({ where: { status: CourseStatus.DRAFT } }),
    prisma.riskFlag.count({ where: { status: "open", resolvedAt: null } }),
    prisma.assignmentSubmission.count({
      where: { status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.IN_REVIEW] } },
    }),
  ]);

  const avgProgressByCourse = new Map(progressByCourse.map((row) => [row.courseId, Math.round(row._avg.percent ?? 0)]));
  const completedCountByCourse = new Map(completedByCourse.map((row) => [row.courseId, row._count._all]));
  const coursesChart = courseStats.map((course) => {
    const completed = completedCountByCourse.get(course.id) ?? 0;
    const avgProgress = avgProgressByCourse.get(course.id) ?? 0;
    return {
      label: course.title,
      value: avgProgress,
      sublabel: `${completed}/${course._count.enrollments} Р·Р°РІРµСЂС€РёР»Рё`,
      color: avgProgress > 75 ? "#16a34a" : avgProgress > 40 ? "#ca8a04" : "#dc2626",
    };
  });

  return {
    totalUsers,
    totalEnrollments,
    completedCourses,
    certsCount,
    publishedCourses,
    draftCourses,
    openRisks,
    pendingReviews,
    coursesChart,
  };
}

export async function getAdminAuditPageData(input: { page: number; limit: number; search: string }) {
  const where: Prisma.AuditLogWhereInput = input.search
    ? {
        OR: [
          { action: { contains: input.search, mode: "insensitive" } },
          { entity: { contains: input.search, mode: "insensitive" } },
          { actor: { name: { contains: input.search, mode: "insensitive" } } },
          { actor: { email: { contains: input.search, mode: "insensitive" } } },
          { entityId: { contains: input.search, mode: "insensitive" } },
        ],
      }
    : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      include: { actor: { select: { id: true, email: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    pages: Math.ceil(total / input.limit),
  };
}

export async function getAdminManagementPageData() {
  const [users, cohorts, totalEnrollments] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        roles: { select: { role: { select: { key: true } } } },
        enrollments: {
          select: {
            id: true,
            course: { select: { title: true } },
            status: true,
            cohort: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.cohort.findMany({
      select: { id: true, name: true, status: true, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
  ]);

  return { users, cohorts, totalEnrollments };
}

export async function getAdminCertificatesPageData() {
  const [students, courses, certificates] = await Promise.all([
    prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { key: "student" },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.certificate.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            organization: true,
          },
        },
        course: {
          select: { title: true },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  return {
    students,
    courses,
    certificates: certificates.map((certificate) => ({
      id: certificate.id,
      number: certificate.number,
      verificationCode: certificate.verificationCode,
      verificationUrl: certificate.verificationUrl,
      issuedAt: certificate.issuedAt.toISOString(),
      revokedAt: certificate.revokedAt ? certificate.revokedAt.toISOString() : null,
      studentName: certificate.user.organization ?? certificate.user.name ?? certificate.user.email,
      studentEmail: certificate.user.email,
      courseTitle: certificate.course.title,
      forced: !!(certificate.metadata as Record<string, unknown>)?.forced,
    })),
  };
}

export async function getPublishedCourseOptions() {
  return prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function getCourseOptions() {
  return prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function getAdminCohortEditPageData(cohortId: string) {
  const [cohort, courses] = await Promise.all([
    prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        course: { select: { title: true } },
        _count: { select: { enrollments: true, curatorAssignments: true } },
      },
    }),
    getPublishedCourseOptions(),
  ]);

  return { cohort, courses };
}

export async function getCuratorAssignmentsPageData(input: {
  curatorId: string;
  status?: string;
  student?: string;
  page: number;
  itemsPerPage: number;
}) {
  const assignedStudents = await prisma.curatorAssignment.findMany({
    where: { curatorId: input.curatorId, active: true },
    select: { studentId: true },
    take: QUERY_LIMITS.dashboardStudents,
  });
  const studentIds = assignedStudents.map((assignment) => assignment.studentId);
  const statusFilter = input.status
    ? [input.status]
    : ["SUBMITTED", "IN_REVIEW", "NEEDS_REVISION"];

  const where: Prisma.AssignmentSubmissionWhereInput = {
    userId: { in: studentIds },
    status: { in: statusFilter as SubmissionStatus[] },
  };

  if (input.student) {
    const matchingUsers = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        OR: [
          { name: { contains: input.student, mode: "insensitive" } },
          { email: { contains: input.student, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: QUERY_LIMITS.dashboardStudents,
    });
    where.userId = { in: matchingUsers.map((user) => user.id) };
  }

  const [submissionsDb, total] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where,
      include: {
        user: true,
        assignment: { include: { course: true, lesson: true } },
      },
      orderBy: { submittedAt: "desc" },
      skip: (input.page - 1) * input.itemsPerPage,
      take: input.itemsPerPage,
    }),
    prisma.assignmentSubmission.count({ where }),
  ]);

  const submissions: SubmissionForReview[] = submissionsDb.map((submission) => ({
    id: submission.id,
    studentName: maskStudentName(submission.user.id),
    studentEmail: submission.user.email,
    assignmentTitle: submission.assignment.title,
    lessonTitle: submission.assignment.lesson?.title ?? "Р‘РµР· СѓСЂРѕРєР°",
    courseTitle: submission.assignment.course?.title ?? "Р‘РµР· РєСѓСЂСЃР°",
    attemptNumber: submission.attemptNumber,
    status: submission.status,
    submittedAt: submission.submittedAt.toISOString(),
  }));

  return {
    submissions,
    total,
    totalPages: Math.ceil(total / input.itemsPerPage),
  };
}

export async function getCuratorPopupStudents(curatorId: string) {
  const assignments = await prisma.curatorAssignment.findMany({
    where: { curatorId, active: true },
    select: {
      student: { select: { id: true, email: true } },
      cohort: { select: { name: true, course: { select: { title: true } } } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return assignments.map((assignment) => ({
    id: assignment.student.id,
    name: maskStudentName(assignment.student.id),
    email: assignment.student.email,
    cohortName: assignment.cohort.name,
    courseTitle: assignment.cohort.course?.title ?? "",
  }));
}

export async function getInstructorAssignmentsPageData(userId: string, roleKeys: RoleKey[]) {
  return prisma.assignment.findMany({
    where: instructorAssignmentWhere(userId, roleKeys),
    include: {
      course: true,
      lesson: { include: { module: { select: { courseId: true, course: { select: { id: true, title: true } } } } } },
      _count: { select: { submissions: { where: { status: "SUBMITTED" } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInstructorAssignmentEditData(assignmentId: string, userId: string, roleKeys: RoleKey[]) {
  return prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      ...instructorAssignmentWhere(userId, roleKeys),
    },
  });
}

export async function getInstructorQuizzesPageData(userId: string, roleKeys: RoleKey[]) {
  return prisma.quiz.findMany({
    where: instructorQuizWhere(userId, roleKeys),
    include: {
      course: true,
      lesson: { include: { module: { select: { courseId: true, course: { select: { id: true, title: true } } } } } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInstructorQuizEditData(quizId: string, userId: string, roleKeys: RoleKey[]) {
  return prisma.quiz.findFirst({
    where: {
      id: quizId,
      ...instructorQuizWhere(userId, roleKeys),
    },
    include: {
      questions: { orderBy: { order: "asc" } },
      course: { select: { id: true } },
      lesson: { select: { module: { select: { courseId: true } } } },
    },
  });
}

export async function getInstructorReportsPageData(userId: string) {
  const courses = await prisma.course.findMany({
    where: { instructors: { some: { userId } } },
    select: {
      id: true,
      title: true,
      _count: { select: { enrollments: true } },
      courseProgress: { select: { percent: true, status: true } },
    },
  });

  const courseIds = courses.map((course) => course.id);
  const totalStudents = courses.reduce((sum, course) => sum + course._count.enrollments, 0);
  const completed = courses.reduce(
    (sum, course) => sum + course.courseProgress.filter((progress) => progress.status === "COMPLETED").length,
    0,
  );
  const avgProgress = totalStudents > 0
    ? Math.round(courses.reduce((sum, course) => sum + course.courseProgress.reduce((courseSum, progress) => courseSum + progress.percent, 0), 0) / totalStudents)
    : 0;
  const [forwardedQuestions, reviewBacklog, quizAttempts, passedQuizAttempts] = await Promise.all([
    prisma.lessonQuestion.count({
      where: {
        lesson: { module: { courseId: { in: courseIds } } },
        status: QuestionStatus.FORWARDED,
      },
    }),
    prisma.assignmentSubmission.count({
      where: {
        status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.IN_REVIEW] },
        assignment: {
          OR: [
            { courseId: { in: courseIds } },
            { lesson: { module: { courseId: { in: courseIds } } } },
          ],
        },
      },
    }),
    prisma.quizAttempt.count({ where: { quiz: quizWhereForCourseIds(courseIds) } }),
    prisma.quizAttempt.count({ where: { quiz: quizWhereForCourseIds(courseIds), passed: true } }),
  ]);

  return {
    courses,
    totalStudents,
    completed,
    avgProgress,
    forwardedQuestions,
    reviewBacklog,
    passRate: quizAttempts > 0 ? Math.round((passedQuizAttempts / quizAttempts) * 100) : 0,
  };
}

export async function getSuperCuratorChatPageData(superCuratorId: string) {
  const curatorAssignments = await prisma.curatorAssignment.findMany({
    where: { active: true, superCuratorId },
    include: {
      curator: { select: { id: true, name: true, email: true } },
      student: { select: { id: true, name: true, email: true } },
    },
    take: QUERY_LIMITS.dashboardStudents,
  });

  const curatorIds = [...new Set(curatorAssignments.map((assignment) => assignment.curatorId))];
  const studentIds = [...new Set(curatorAssignments.map((assignment) => assignment.studentId))];
  const curatorIdSet = new Set(curatorIds);
  const studentIdSet = new Set(studentIds);
  const assignmentPairKeys = new Set(curatorAssignments.map((assignment) => `${assignment.curatorId}:${assignment.studentId}`));

  const [messages, unreadCounts] = curatorIds.length === 0 || studentIds.length === 0
    ? [[], []] as const
    : await Promise.all([
        prisma.message.findMany({
          where: {
            OR: [
              { senderId: { in: curatorIds }, receiverId: { in: studentIds } },
              { senderId: { in: studentIds }, receiverId: { in: curatorIds } },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: { text: true, createdAt: true, senderId: true, receiverId: true, attachmentUrl: true },
          take: QUERY_LIMITS.reportRows,
        }),
        prisma.message.groupBy({
          by: ["senderId", "receiverId"],
          where: {
            senderId: { in: studentIds },
            receiverId: { in: curatorIds },
            readAt: null,
          },
          _count: { _all: true },
        }),
      ]);

  const lastMessageByPair = new Map<string, (typeof messages)[number]>();
  for (const message of messages) {
    const curatorId = curatorIdSet.has(message.senderId)
      ? message.senderId
      : message.receiverId && curatorIdSet.has(message.receiverId)
        ? message.receiverId
        : null;
    const studentId = studentIdSet.has(message.senderId)
      ? message.senderId
      : message.receiverId && studentIdSet.has(message.receiverId)
        ? message.receiverId
        : null;
    if (!curatorId || !studentId) continue;
    const key = `${curatorId}:${studentId}`;
    if (assignmentPairKeys.has(key) && !lastMessageByPair.has(key)) {
      lastMessageByPair.set(key, message);
    }
  }

  const unreadByPair = new Map(
    unreadCounts.map((row) => [`${row.receiverId}:${row.senderId}`, row._count._all]),
  );
  const uniqueAssignments = Array.from(
    new Map(curatorAssignments.map((assignment) => [`${assignment.curatorId}:${assignment.studentId}`, assignment])).values(),
  );

  const pairs = uniqueAssignments.map((assignment) => {
    const key = `${assignment.curatorId}:${assignment.studentId}`;
    const lastMessage = lastMessageByPair.get(key);
    return {
      curatorId: assignment.curatorId,
      curatorName: assignment.curator.name ?? assignment.curator.email,
      studentId: assignment.studentId,
      studentName: maskStudentName(assignment.studentId),
      lastMessage: lastMessage ? buildMessagePreview(lastMessage.text ?? "", Boolean(lastMessage.attachmentUrl)) : null,
      lastDate: lastMessage?.createdAt?.toISOString() ?? null,
      lastSenderId: lastMessage?.senderId ?? null,
      unread: unreadByPair.get(key) ?? 0,
    };
  });

  const sorted = pairs.sort((a, b) => {
    if (a.unread > 0 && b.unread === 0) return -1;
    if (a.unread === 0 && b.unread > 0) return 1;
    if (!a.lastDate) return 1;
    if (!b.lastDate) return -1;
    return b.lastDate.localeCompare(a.lastDate);
  });

  const byCurator = new Map<string, typeof sorted>();
  for (const pair of sorted) {
    const list = byCurator.get(pair.curatorId) ?? [];
    list.push(pair);
    byCurator.set(pair.curatorId, list);
  }

  return byCurator;
}

export async function getStudentQuizResultPageData(input: {
  quizId: string;
  userId: string;
  attemptId?: string;
}) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: input.quizId },
    include: {
      lesson: true,
      questions: { orderBy: { order: "asc" } },
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) {
    return { quiz: null, allAttempts: [], attempt: null };
  }

  const allAttempts = await prisma.quizAttempt.findMany({
    where: { quizId: input.quizId, userId: input.userId },
    orderBy: { startedAt: "desc" },
  });
  const attempt = input.attemptId
    ? allAttempts.find((candidate) => candidate.id === input.attemptId) ?? allAttempts[0] ?? null
    : allAttempts[0] ?? null;

  return { quiz, allAttempts, attempt };
}

export async function getPerUserVisitRows(days: number, roleFilter?: string) {
  await requireRole(["admin", "super_curator"]);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const where: Prisma.UserSessionWhereInput = {
    startedAt: { gte: startDate },
    ...(roleFilter ? { role: roleFilter } : {}),
  };

  const sessions = await prisma.userSession.findMany({
    where,
    select: {
      userId: true,
      role: true,
      durationSec: true,
      startedAt: true,
    },
    orderBy: { startedAt: "desc" },
  });

  const userMap = new Map<
    string,
    {
      userId: string;
      role: string;
      sessions: number;
      totalDuration: number;
      durations: number[];
      lastVisit: Date;
    }
  >();

  for (const session of sessions) {
    let entry = userMap.get(session.userId);
    if (!entry) {
      entry = {
        userId: session.userId,
        role: session.role,
        sessions: 0,
        totalDuration: 0,
        durations: [],
        lastVisit: session.startedAt,
      };
      userMap.set(session.userId, entry);
    }
    entry.sessions++;
    if (session.durationSec !== null) {
      entry.totalDuration += session.durationSec;
      entry.durations.push(session.durationSec);
    }
    if (session.startedAt > entry.lastVisit) {
      entry.lastVisit = session.startedAt;
    }
  }

  const userIds = Array.from(userMap.keys());
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const nameMap = new Map(users.map((user) => [user.id, user.name ?? user.email]));

  return Array.from(userMap.values())
    .map((entry) => ({
      userId: entry.userId,
      userName: nameMap.get(entry.userId) ?? "РќРµРёР·РІРµСЃС‚РЅРѕ",
      role: entry.role,
      sessions: entry.sessions,
      avgDuration: entry.durations.length > 0
        ? Math.round(entry.totalDuration / entry.durations.length)
        : 0,
      totalDuration: entry.totalDuration,
      lastVisit: entry.lastVisit.toISOString(),
    }))
    .sort((a, b) => b.sessions - a.sessions);
}
