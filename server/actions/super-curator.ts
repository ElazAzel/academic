"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

// ─── Cohort CRUD ────────────────────────────────────────────────────

export async function getSuperCuratorCohorts() {
  await requireRole(["super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  const cohorts = await prisma.cohort.findMany({
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { enrollments: true, curatorAssignments: true } },
      curatorAssignments: {
        where: { active: true },
        select: { curatorId: true },
        distinct: ["curatorId"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return cohorts.map((c) => ({
    id: c.id,
    name: c.name,
    courseId: c.courseId,
    courseTitle: c.course?.title ?? "",
    projectId: c.projectId,
    status: c.status,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    studentsCount: c._count.enrollments,
    curatorCount: c.curatorAssignments.length,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function createCohortAction(formData: FormData) {
  const actor = await requireRole(["super_curator", "admin"]);
  const name = formData.get("name") as string;
  const courseId = formData.get("courseId") as string;
  const startsAt = (formData.get("startsAt") as string) || undefined;
  const endsAt = (formData.get("endsAt") as string) || undefined;

  if (!name || !courseId) throw new Error("Название и курс обязательны");

  await prisma.cohort.create({
    data: {
      name,
      courseId,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      status: "active",
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "cohort.created",
    entity: "cohort",
    entityId: name,
    metadata: { courseId, startsAt, endsAt },
  });

  revalidatePath("/super-curator/cohorts");
  return { success: true };
}

export async function updateCohortAction(formData: FormData) {
  const actor = await requireRole(["super_curator", "admin"]);
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const startsAt = (formData.get("startsAt") as string) || undefined;
  const endsAt = (formData.get("endsAt") as string) || undefined;
  const status = formData.get("status") as string;

  if (!id || !name) throw new Error("ID и название обязательны");

  await prisma.cohort.update({
    where: { id },
    data: {
      name,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      status: status || "active",
    },
  });

  await logAudit({
    actorId: actor.id,
    action: "cohort.updated",
    entity: "cohort",
    entityId: id,
    metadata: { name, status },
  });

  revalidatePath("/super-curator/cohorts");
  return { success: true };
}

export async function deleteCohortAction(id: string) {
  const actor = await requireRole(["super_curator", "admin"]);

  await prisma.cohort.update({
    where: { id },
    data: { status: "archived" },
  });

  await logAudit({
    actorId: actor.id,
    action: "cohort.archived",
    entity: "cohort",
    entityId: id,
  });

  revalidatePath("/super-curator/cohorts");
  return { success: true };
}

export async function getCohortDetail(cohortId: string) {
  await requireRole(["super_curator", "admin"]);

  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      course: { select: { id: true, title: true } },
      enrollments: {
        include: {
          user: {
            select: {
              id: true, name: true, email: true, lastLoginAt: true,
              roles: { include: { role: { select: { key: true } } } },
            },
          },
          courseProgress: { select: { percent: true, status: true } },
        },
      },
      curatorAssignments: {
        where: { active: true },
        include: {
          curator: { select: { id: true, name: true, email: true } },
          student: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!cohort) return null;

  const curatorMap = new Map<string, { id: string; name: string; email: string; studentIds: string[] }>();
  for (const ca of cohort.curatorAssignments) {
    if (!curatorMap.has(ca.curatorId)) {
      curatorMap.set(ca.curatorId, { id: ca.curatorId, name: ca.curator.name ?? ca.curator.email, email: ca.curator.email, studentIds: [] });
    }
    curatorMap.get(ca.curatorId)!.studentIds.push(ca.studentId);
  }

  return {
    id: cohort.id,
    name: cohort.name,
    courseId: cohort.courseId ?? "",
    courseTitle: cohort.course?.title ?? "",
    status: cohort.status,
    startsAt: cohort.startsAt?.toISOString() ?? null,
    endsAt: cohort.endsAt?.toISOString() ?? null,
    students: cohort.enrollments.map((e) => ({
      id: e.user.id,
      name: e.user.name ?? e.user.email,
      email: e.user.email,
      enrollmentId: e.id,
      enrollmentStatus: e.status,
      progress: e.courseProgress[0]?.percent ?? 0,
      progressStatus: e.courseProgress[0]?.status ?? "NOT_STARTED",
      lastLoginAt: e.user.lastLoginAt?.toISOString() ?? null,
      curator: cohort.curatorAssignments.find((ca) => ca.studentId === e.user.id)?.curator ?? null,
    })),
    curators: Array.from(curatorMap.values()),
  };
}

// ─── Participant management ─────────────────────────────────────────

export async function addStudentToCohortAction(formData: FormData) {
  const actor = await requireRole(["super_curator", "admin"]);
  const cohortId = formData.get("cohortId") as string;
  const email = formData.get("email") as string;
  const courseId = formData.get("courseId") as string;

  if (!cohortId || !email || !courseId) throw new Error("Все поля обязательны");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Пользователь с таким email не найден");
  const studentId = user.id;

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
  });

  if (existing) {
    await prisma.enrollment.update({
      where: { id: existing.id },
      data: { cohortId, status: "ACTIVE" },
    });
  } else {
    await prisma.enrollment.create({
      data: { userId: studentId, courseId, cohortId, status: "ACTIVE" },
    });
  }

  await logAudit({
    actorId: actor.id,
    action: "cohort.student_added",
    entity: "enrollment",
    entityId: `${cohortId}-${studentId}`,
    metadata: { cohortId, studentId, courseId },
  });

  revalidatePath(`/super-curator/cohorts/${cohortId}`);
  return { success: true };
}

export async function removeStudentFromCohortAction(enrollmentId: string) {
  const actor = await requireRole(["super_curator", "admin"]);

  await prisma.enrollment.delete({ where: { id: enrollmentId } });

  await logAudit({
    actorId: actor.id,
    action: "cohort.student_removed",
    entity: "enrollment",
    entityId: enrollmentId,
  });

  revalidatePath("/super-curator/cohorts");
  return { success: true };
}

// ─── Curator management ─────────────────────────────────────────────

export async function getSuperCuratorCurators() {
  await requireRole(["super_curator", "admin"]);
  const user = await getCurrentUser();
  if (!user) return [];

  const curatorAssignments = await prisma.curatorAssignment.findMany({
    where: { superCuratorId: user.id, active: true },
    include: {
      curator: {
        select: {
          id: true, name: true, email: true, lastLoginAt: true, createdAt: true,
        },
      },
      cohort: { select: { id: true, name: true } },
      student: { select: { id: true } },
    },
  });

  const curatorMap = new Map<string, {
    id: string; name: string; email: string; lastLoginAt: Date | null; createdAt: Date;
    cohortNames: Set<string>; studentCount: number;
  }>();

  for (const ca of curatorAssignments) {
    if (!curatorMap.has(ca.curatorId)) {
      curatorMap.set(ca.curatorId, {
        id: ca.curator.id,
        name: ca.curator.name ?? ca.curator.email,
        email: ca.curator.email,
        lastLoginAt: ca.curator.lastLoginAt,
        createdAt: ca.curator.createdAt,
        cohortNames: new Set(),
        studentCount: 0,
      });
    }
    const entry = curatorMap.get(ca.curatorId)!;
    if (ca.cohort) entry.cohortNames.add(ca.cohort.name);
    entry.studentCount++;
  }

  const curatorIds = Array.from(curatorMap.keys());

  const [questionsCount, activityLogs] = await Promise.all([
    prisma.lessonQuestion.groupBy({
      by: ["curatorId"],
      where: { curatorId: { in: curatorIds } },
      _count: { _all: true },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: { in: curatorIds },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { userId: true, action: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const questionCountMap = new Map(questionsCount.map((q) => [q.curatorId, q._count._all]));

  return Array.from(curatorMap.entries()).map(([id, c]) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    cohorts: Array.from(c.cohortNames),
    studentCount: c.studentCount,
    questionsCount: questionCountMap.get(id) ?? 0,
    lastActions: activityLogs.filter((l) => l.userId === id).slice(0, 5).map((l) => ({
      action: l.action,
      createdAt: l.createdAt.toISOString(),
    })),
  }));
}

export async function addCuratorAction(formData: FormData) {
  const actor = await requireRole(["super_curator", "admin"]);
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;

  if (!email) throw new Error("Email обязателен");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const role = await prisma.role.findUnique({ where: { key: "curator" } });
    if (!role) throw new Error("Роль куратора не найдена");
    const hasRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: existingUser.id, roleId: role.id } },
    });
    if (!hasRole) {
      await prisma.userRole.create({ data: { userId: existingUser.id, roleId: role.id } });
    }
    return { success: true, userId: existingUser.id };
  }

  const { createUser } = await import("@/server/modules/users/service");
  const newUser = await createUser(actor, { email, name: name || undefined, roleKeys: ["curator"] });

  revalidatePath("/super-curator/curators");
  return { success: true, userId: newUser.id };
}

export async function removeCuratorAction(curatorId: string) {
  const actor = await requireRole(["super_curator", "admin"]);

  const role = await prisma.role.findUnique({ where: { key: "curator" } });
  if (!role) throw new Error("Роль куратора не найдена");

  await prisma.userRole.deleteMany({
    where: { userId: curatorId, roleId: role.id },
  });

  await prisma.curatorAssignment.updateMany({
    where: { curatorId, active: true },
    data: { active: false },
  });

  await logAudit({
    actorId: actor.id,
    action: "curator.removed",
    entity: "user",
    entityId: curatorId,
  });

  revalidatePath("/super-curator/curators");
  return { success: true };
}

export async function getCuratorActivity(curatorId: string) {
  await requireRole(["super_curator", "admin"]);

  const curator = await prisma.user.findUnique({
    where: { id: curatorId },
    select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true },
  });
  if (!curator) return null;

  const [questions, submissions, activityLogs] = await Promise.all([
    prisma.lessonQuestion.findMany({
      where: { curatorId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        student: { select: { name: true, email: true } },
        lesson: { select: { title: true } },
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: { reviewedById: curatorId },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        assignment: { select: { title: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId: curatorId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return {
    curator: {
      id: curator.id,
      name: curator.name ?? curator.email,
      email: curator.email,
      lastLoginAt: curator.lastLoginAt?.toISOString() ?? null,
      createdAt: curator.createdAt.toISOString(),
    },
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      answer: q.answer,
      status: q.status,
      studentName: q.student.name ?? q.student.email,
      lessonTitle: q.lesson.title,
      createdAt: q.createdAt.toISOString(),
      answeredAt: q.answeredAt?.toISOString() ?? null,
    })),
    reviews: submissions.map((s) => ({
      id: s.id,
      assignmentTitle: s.assignment.title,
      studentName: s.user.name ?? s.user.email,
      status: s.status,
      score: s.score,
      submittedAt: s.submittedAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
    })),
    activityLog: activityLogs.map((l) => ({
      action: l.action,
      resource: l.resource,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

// ─── Enhanced risks ─────────────────────────────────────────────────

export async function getSuperCuratorRisks() {
  await requireRole(["super_curator", "admin"]);

  const risks = await prisma.riskFlag.findMany({
    where: { resolvedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
      course: { select: { id: true, title: true } },
      cohort: { select: { id: true, name: true } },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  const userIds = risks.map((r) => r.userId).filter(Boolean);
  const [progressData, questionData, assignmentData, loginData] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, percent: true, status: true, updatedAt: true },
    }),
    prisma.lessonQuestion.findMany({
      where: { studentId: { in: userIds } },
      select: { id: true, studentId: true, status: true, createdAt: true },
    }),
    prisma.assignmentSubmission.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true, status: true, submittedAt: true },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: { in: userIds },
        action: { in: ["user.login", "auth.login", "session.created"] },
      },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const progressMap = new Map(progressData.map((p) => [p.userId, p]));
  const questionMap = new Map<string, typeof questionData>();
  const assignmentMap = new Map<string, typeof assignmentData>();

  for (const q of questionData) {
    const arr = questionMap.get(q.studentId) ?? [];
    arr.push(q);
    questionMap.set(q.studentId, arr);
  }
  for (const a of assignmentData) {
    const arr = assignmentMap.get(a.userId) ?? [];
    arr.push(a);
    assignmentMap.set(a.userId, arr);
  }

  const lastLoginMap = new Map<string, string>();
  for (const l of loginData) {
    if (!lastLoginMap.has(l.userId)) {
      lastLoginMap.set(l.userId, l.createdAt.toISOString());
    }
  }

  return risks.map((risk) => {
    const progress = risk.userId ? progressMap.get(risk.userId) : undefined;
    const studentQuestions = risk.userId ? questionMap.get(risk.userId) ?? [] : [];
    const studentAssignments = risk.userId ? assignmentMap.get(risk.userId) ?? [] : [];
    const lastLogin = risk.userId ? lastLoginMap.get(risk.userId) : null;

    const daysSinceLastLogin = lastLogin
      ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: risk.id,
      type: risk.type,
      severity: risk.severity,
      studentId: risk.userId,
      studentName: risk.user?.name ?? risk.user?.email ?? "Неизвестно",
      studentEmail: risk.user?.email ?? "",
      courseTitle: risk.course?.title ?? "",
      cohortName: risk.cohort?.name ?? null,
      createdAt: risk.createdAt.toISOString(),
      progressPercent: progress?.percent ?? 0,
      progressStatus: progress?.status ?? "NOT_STARTED",
      openQuestions: studentQuestions.filter((q) => q.status === "OPEN").length,
      pendingAssignments: studentAssignments.filter((s) => s.status === "SUBMITTED" || s.status === "IN_REVIEW").length,
      lastLoginAt: risk.user?.lastLoginAt?.toISOString() ?? lastLogin,
      daysSinceLastLogin,
      metadata: risk.metadata as Record<string, unknown> | null,
    };
  });
}

// ─── Reports ────────────────────────────────────────────────────────

export async function getSuperCuratorReportData() {
  await requireRole(["super_curator", "admin"]);

  const cohortStats = await prisma.cohort.findMany({
    include: {
      course: { select: { title: true } },
      _count: { select: { enrollments: true, curatorAssignments: true } },
    },
  });

  const cohortProgress = await Promise.all(
    cohortStats.map(async (c) => {
      const enrollments = await prisma.enrollment.findMany({
        where: { cohortId: c.id },
        include: {
          courseProgress: { select: { percent: true, status: true } },
          user: { select: { lastLoginAt: true } },
        },
      });

      const completed = enrollments.filter((e) => e.courseProgress[0]?.status === "COMPLETED").length;
      const inProgress = enrollments.filter((e) => e.courseProgress[0]?.status === "IN_PROGRESS").length;
      const notStarted = enrollments.filter((e) => !e.courseProgress[0] || e.courseProgress[0].status === "NOT_STARTED").length;
      const blocked = enrollments.filter((e) => e.courseProgress[0]?.status === "BLOCKED").length;
      const avgProgress = enrollments.length > 0
        ? Math.round(enrollments.reduce((s, e) => s + (e.courseProgress[0]?.percent ?? 0), 0) / enrollments.length)
        : 0;
      const daysSinceLastLogin = enrollments
        .map((e) => e.user.lastLoginAt ? Math.floor((Date.now() - e.user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)) : null)
        .filter((d): d is number => d !== null);

      return {
        cohortId: c.id,
        cohortName: c.name,
        courseTitle: c.course?.title ?? "",
        status: c.status,
        totalStudents: c._count.enrollments,
        curatorCount: c._count.curatorAssignments,
        completed,
        inProgress,
        notStarted,
        blocked,
        avgProgress,
        avgDaysSinceLastLogin: daysSinceLastLogin.length > 0
          ? Math.round(daysSinceLastLogin.reduce((s, d) => s + d, 0) / daysSinceLastLogin.length)
          : null,
      };
    }),
  );

  return cohortProgress;
}
