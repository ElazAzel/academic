"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError, getSafeErrorMetadata } from "@/lib/http";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";
import { createNotification } from "@/server/modules/notifications/service";
import { maskStudentName } from "@/lib/utils";
import { QuestionStatus } from "@prisma/client";

const prisma = getPrisma();

function throwSuperCuratorReadActionError(error: unknown, label: string, message: string): never {
  if (error instanceof ApiError) throw error;
  console.error(label, getSafeErrorMetadata(error));
  throw new ApiError("internal_error", message, 500);
}

function toSuperCuratorMutationResult(error: unknown, label: string, fallback: string) {
  if (error instanceof ApiError) throw error;
  console.error(label, getSafeErrorMetadata(error));
  return { success: false, error: fallback };
}

// ─── Cohort CRUD ────────────────────────────────────────────────────

export async function getSuperCuratorCohorts() {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);

    const cohorts = await prisma.cohort.findMany({
      where: scope.isGlobal ? {} : { id: { in: scope.cohortIds } },
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
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getSuperCuratorCohorts]", "Не удалось загрузить потоки");
  }
}

export async function createCohortAction(formData: FormData) {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const name = formData.get("name") as string;
    const courseId = formData.get("courseId") as string;
    const startsAt = (formData.get("startsAt") as string) || undefined;
    const endsAt = (formData.get("endsAt") as string) || undefined;

    if (!name || !courseId) throw new ApiError("bad_request", "Название и курс обязательны", 400);

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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[createCohortAction]", "Произошла ошибка при создании потока");
  }
}

export async function updateCohortAction(formData: FormData) {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const startsAt = (formData.get("startsAt") as string) || undefined;
    const endsAt = (formData.get("endsAt") as string) || undefined;
    const status = formData.get("status") as string;

    if (!id || !name) throw new ApiError("bad_request", "ID и название обязательны", 400);

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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[updateCohortAction]", "Произошла ошибка при обновлении потока");
  }
}

const DeleteCohortActionSchema = z.object({
  id: z.string().min(1, "ID потока обязателен"),
});

export async function deleteCohortAction(id: string) {
  try {
    const parsed = DeleteCohortActionSchema.safeParse({ id });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[deleteCohortAction]", "Произошла ошибка при архивации потока");
  }
}

const GetCohortDetailSchema = z.object({
  cohortId: z.string().min(1, "ID потока обязателен"),
});

export async function getCohortDetail(cohortId: string) {
  try {
    const parsed = GetCohortDetailSchema.safeParse({ cohortId });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);
    if (!scope.isGlobal && !scope.cohortIds.includes(cohortId)) return null;

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
        name: maskStudentName(e.user.id),
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
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getCohortDetail]", "Не удалось загрузить поток");
  }
}

// ─── Participant management ─────────────────────────────────────────

export async function addStudentToCohortAction(formData: FormData) {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const cohortId = formData.get("cohortId") as string;
    const email = formData.get("email") as string;
    const courseId = formData.get("courseId") as string;

    if (!cohortId || !email || !courseId) throw new ApiError("bad_request", "Все поля обязательны", 400);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError("not_found", "Пользователь с таким email не найден", 404);
    const studentId = user.id;

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
    });

    if (existing) {
      const enrollment = await prisma.enrollment.update({
        where: { id: existing.id },
        data: { cohortId, status: "ACTIVE" },
      });
      await createNotification({
        userId: studentId,
        event: "access_granted",
        refType: "enrollment",
        refId: enrollment.id,
        data: { courseId, cohortId, enrollmentId: enrollment.id, link: `/student/courses/${courseId}` },
      });
    } else {
      const enrollment = await prisma.enrollment.create({
        data: { userId: studentId, courseId, cohortId, status: "ACTIVE" },
      });
      await createNotification({
        userId: studentId,
        event: "access_granted",
        refType: "enrollment",
        refId: enrollment.id,
        data: { courseId, cohortId, enrollmentId: enrollment.id, link: `/student/courses/${courseId}` },
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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[addStudentToCohortAction]", "Произошла ошибка при добавлении студента");
  }
}

const RemoveStudentFromCohortActionSchema = z.object({
  enrollmentId: z.string().min(1, "ID зачисления обязателен"),
});

export async function removeStudentFromCohortAction(enrollmentId: string) {
  try {
    const parsed = RemoveStudentFromCohortActionSchema.safeParse({ enrollmentId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[removeStudentFromCohortAction]", "Произошла ошибка при удалении студента");
  }
}

// ─── Curator management ─────────────────────────────────────────────

export async function getSuperCuratorCurators() {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);
    if (!scope.isGlobal && scope.curatorIds.length === 0) return [];

    const curatorAssignments = await prisma.curatorAssignment.findMany({
      where: {
        active: true,
        ...(scope.isGlobal ? {} : { superCuratorId: actor.id }),
      },
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
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getSuperCuratorCurators]", "Не удалось загрузить кураторов");
  }
}

export async function addCuratorAction(formData: FormData) {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;

    if (!email) throw new ApiError("bad_request", "Email обязателен", 400);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const role = await prisma.role.findUnique({ where: { key: "curator" } });
      if (!role) throw new ApiError("not_found", "Роль куратора не найдена", 404);
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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[addCuratorAction]", "Произошла ошибка при добавлении куратора");
  }
}

const RemoveCuratorActionSchema = z.object({
  curatorId: z.string().min(1, "ID куратора обязателен"),
});

export async function removeCuratorAction(curatorId: string) {
  try {
    const parsed = RemoveCuratorActionSchema.safeParse({ curatorId });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Ошибка валидации" };
    }

    const actor = await requireRole(["super_curator", "admin"]);

    const role = await prisma.role.findUnique({ where: { key: "curator" } });
    if (!role) throw new ApiError("not_found", "Роль куратора не найдена", 404);

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
  } catch (error) {
    return toSuperCuratorMutationResult(error, "[removeCuratorAction]", "Произошла ошибка при удалении куратора");
  }
}

const GetCuratorActivitySchema = z.object({
  curatorId: z.string().min(1, "ID куратора обязателен"),
});

export async function getCuratorActivity(curatorId: string) {
  try {
    const parsed = GetCuratorActivitySchema.safeParse({ curatorId });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);
    if (!scope.isGlobal && !scope.curatorIds.includes(curatorId)) return null;

    const curator = await prisma.user.findUnique({
    where: { id: curatorId },
    select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true },
  });
  if (!curator) return null;

  const curatorStudentIds = [...new Set((await prisma.curatorAssignment.findMany({
    where: { curatorId, active: true },
    select: { studentId: true },
  })).map((a) => a.studentId))];

  const [questions, submissions, activityLogs, chatMsgs] = await Promise.all([
    prisma.lessonQuestion.findMany({
      where: { curatorId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        student: { select: { id: true, name: true, email: true } },
        lesson: { select: { title: true } },
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: { reviewedById: curatorId },
      orderBy: { submittedAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignment: { select: { title: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId: curatorId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: { in: curatorStudentIds }, receiverId: curatorId },
          { senderId: curatorId, receiverId: { in: curatorStudentIds } },
        ],
      },
      select: { senderId: true, receiverId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
  ]);

  const studentNames = new Map<string, string>();
  for (const q of questions) {
    if (!studentNames.has(q.studentId)) studentNames.set(q.studentId, q.student.name ?? q.student.email);
  }
  const curatorStudents = await prisma.user.findMany({
    where: { id: { in: curatorStudentIds.filter((sid) => !studentNames.has(sid)) } },
    select: { id: true, name: true, email: true },
  });
  for (const s of curatorStudents) {
    if (!studentNames.has(s.id)) studentNames.set(s.id, s.name ?? s.email);
  }

  const chatGrouped = new Map<string, typeof chatMsgs>();
  for (const msg of chatMsgs) {
    const otherId = msg.senderId === curatorId ? (msg.receiverId ?? "") : msg.senderId;
    const list = chatGrouped.get(otherId) ?? [];
    list.push(msg);
    chatGrouped.set(otherId, list);
  }

  const studentResponseBreakdown = curatorStudentIds.map((sid) => {
    const qHours = questions
      .filter((q): q is typeof q & { answeredAt: Date } => q.studentId === sid && q.answeredAt !== null)
      .reduce((sum, q) => sum + (q.answeredAt.getTime() - q.createdAt.getTime()) / (1000 * 60 * 60), 0);
    const qCount = questions.filter((q) => q.studentId === sid && q.answeredAt !== null).length;

    const sidMsgs = chatGrouped.get(sid) ?? [];
    let chatTotal = 0;
    let chatCount = 0;
    for (let i = 0; i < sidMsgs.length - 1; i++) {
      const cur = sidMsgs[i];
      const next = sidMsgs[i + 1];
      if (!(cur.senderId === sid && next.senderId === curatorId)) continue;
      chatTotal += (next.createdAt.getTime() - cur.createdAt.getTime()) / (1000 * 60 * 60);
      chatCount++;
    }

    return {
      studentId: sid,
      studentName: actor.roles.includes("admin")
        ? (studentNames.get(sid) ?? "Неизвестно")
        : maskStudentName(sid),
      avgQuestionHours: qCount > 0 ? Math.round((qHours / qCount) * 10) / 10 : 0,
      questionCount: qCount,
      avgChatHours: chatCount > 0 ? Math.round((chatTotal / chatCount) * 10) / 10 : 0,
      chatResponseCount: chatCount,
    };
  }).filter((s) => s.questionCount > 0 || s.chatResponseCount > 0);

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
      studentName: maskStudentName(q.student.id),
      lessonTitle: q.lesson.title,
      createdAt: q.createdAt.toISOString(),
      answeredAt: q.answeredAt?.toISOString() ?? null,
    })),
    reviews: submissions.map((s) => ({
      id: s.id,
      assignmentTitle: s.assignment.title,
      studentName: maskStudentName(s.user.id),
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
    studentResponseBreakdown,
  };
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getCuratorActivity]", "Не удалось загрузить активность куратора");
  }
}

// ─── Distribution scope ─────────────────────────────────────────────

export async function getSuperCuratorDistributionData() {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);

    if (!scope.isGlobal && scope.cohortIds.length === 0) {
      return { unassignedStudents: [], assignedStudents: [], curators: [] };
    }

    const cohortWhere = scope.isGlobal ? { not: null } : { in: scope.cohortIds };

    const [enrollments, activeAssignments, curators] = await Promise.all([
      prisma.enrollment.findMany({
        where: { status: "ACTIVE", cohortId: cohortWhere },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { title: true } },
          cohort: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.curatorAssignment.findMany({
        where: { active: true, cohortId: scope.isGlobal ? undefined : { in: scope.cohortIds } },
        include: {
          curator: { select: { id: true, name: true, email: true } },
          student: { select: { id: true, name: true, email: true } },
          cohort: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findMany({
        where: {
          roles: { some: { role: { key: "curator" } } },
          ...(scope.isGlobal ? {} : { id: { in: scope.curatorIds } }),
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const assignmentByCohortStudent = new Map(activeAssignments.map((assignment) => [`${assignment.cohortId}:${assignment.studentId}`, assignment]));
    const scopedAssignmentKeys = new Set(
      activeAssignments
        .filter((assignment) => scope.isGlobal || assignment.superCuratorId === actor.id)
        .map((assignment) => `${assignment.cohortId}:${assignment.studentId}`),
    );
    const loadByCurator = new Map<string, number>();
    for (const assignment of activeAssignments) {
      if (scope.isGlobal || assignment.superCuratorId === actor.id) {
        loadByCurator.set(assignment.curatorId, (loadByCurator.get(assignment.curatorId) ?? 0) + 1);
      }
    }

    const normalizedCurators = curators.map((curator) => ({
      ...curator,
      studentCount: loadByCurator.get(curator.id) ?? 0,
    }));

    const unassignedStudents = enrollments
      .filter((enrollment) => enrollment.cohortId && !assignmentByCohortStudent.has(`${enrollment.cohortId}:${enrollment.userId}`))
      .map((enrollment) => ({
        id: enrollment.user.id,
        name: maskStudentName(enrollment.user.id),
        email: enrollment.user.email,
        cohortId: enrollment.cohortId!,
        cohortName: enrollment.cohort?.name ?? "",
        courseTitle: enrollment.course.title,
      }));

    const assignedStudents = activeAssignments
      .filter((assignment) => scopedAssignmentKeys.has(`${assignment.cohortId}:${assignment.studentId}`))
      .map((assignment) => ({
        id: assignment.student.id,
        name: maskStudentName(assignment.student.id),
        email: assignment.student.email,
        cohortId: assignment.cohortId,
        cohortName: assignment.cohort.name,
        curatorId: assignment.curatorId,
        curatorName: assignment.curator.name ?? assignment.curator.email,
        curatorEmail: assignment.curator.email,
      }));

    return { unassignedStudents, assignedStudents, curators: normalizedCurators };
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getSuperCuratorDistributionData]", "Не удалось загрузить распределение кураторов");
  }
}

// ─── Enhanced risks ─────────────────────────────────────────────────

export async function getSuperCuratorRisks() {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);
    if (!scope.isGlobal && scope.studentIds.length === 0) return [];

    const risks = await prisma.riskFlag.findMany({
      where: {
        resolvedAt: null,
        ...(scope.isGlobal ? {} : { userId: { in: scope.studentIds } }),
      },
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
        take: QUERY_LIMITS.dashboardProgressRows,
      }),
      prisma.lessonQuestion.findMany({
        where: { studentId: { in: userIds } },
        select: { id: true, studentId: true, status: true, createdAt: true },
        take: QUERY_LIMITS.dashboardQueue,
      }),
      prisma.assignmentSubmission.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, status: true, submittedAt: true },
        take: QUERY_LIMITS.dashboardQueue,
      }),
      prisma.activityLog.findMany({
        where: {
          userId: { in: userIds },
          action: { in: ["user.login", "auth.login", "session.created"] },
        },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: QUERY_LIMITS.dashboardProgressRows,
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
        studentName: maskStudentName(risk.userId),
        studentEmail: risk.user?.email ?? "",
        courseTitle: risk.course?.title ?? "",
        cohortName: risk.cohort?.name ?? null,
        createdAt: risk.createdAt.toISOString(),
        progressPercent: progress?.percent ?? 0,
        progressStatus: progress?.status ?? "NOT_STARTED",
        openQuestions: studentQuestions.filter((q) => q.status === QuestionStatus.OPEN).length,
        pendingAssignments: studentAssignments.filter((s) => s.status === "SUBMITTED" || s.status === "IN_REVIEW").length,
        lastLoginAt: risk.user?.lastLoginAt?.toISOString() ?? lastLogin,
        daysSinceLastLogin,
        metadata: risk.metadata as Record<string, unknown> | null,
      };
    });
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getSuperCuratorRisks]", "Не удалось загрузить риски потоков");
  }
}

// ─── Reports ────────────────────────────────────────────────────────

export async function getSuperCuratorReportData() {
  try {
    const actor = await requireRole(["super_curator", "admin"]);
    const scope = await getSuperCuratorScope(actor);

    const cohortStats = await prisma.cohort.findMany({
      where: scope.isGlobal ? {} : { id: { in: scope.cohortIds } },
      include: {
        course: { select: { title: true } },
        _count: { select: { enrollments: true, curatorAssignments: true } },
      },
      take: QUERY_LIMITS.reportRows,
    });

    const cohortIds = cohortStats.map((cohort) => cohort.id);
    const enrollments = cohortIds.length === 0
      ? []
      : await prisma.enrollment.findMany({
          where: { cohortId: { in: cohortIds } },
          include: {
            courseProgress: { select: { percent: true, status: true } },
            user: { select: { lastLoginAt: true } },
          },
          take: QUERY_LIMITS.reportRows,
        });
    const enrollmentsByCohort = new Map<string, typeof enrollments>();
    for (const enrollment of enrollments) {
      if (!enrollment.cohortId) continue;
      const list = enrollmentsByCohort.get(enrollment.cohortId) ?? [];
      list.push(enrollment);
      enrollmentsByCohort.set(enrollment.cohortId, list);
    }

    const cohortProgress = cohortStats.map((c) => {
        const cohortEnrollments = enrollmentsByCohort.get(c.id) ?? [];
        const completed = cohortEnrollments.filter((e) => e.courseProgress[0]?.status === "COMPLETED").length;
        const inProgress = cohortEnrollments.filter((e) => e.courseProgress[0]?.status === "IN_PROGRESS").length;
        const notStarted = cohortEnrollments.filter((e) => !e.courseProgress[0] || e.courseProgress[0].status === "NOT_STARTED").length;
        const blocked = cohortEnrollments.filter((e) => e.courseProgress[0]?.status === "BLOCKED").length;
        const avgProgress = cohortEnrollments.length > 0
          ? Math.round(cohortEnrollments.reduce((s, e) => s + (e.courseProgress[0]?.percent ?? 0), 0) / cohortEnrollments.length)
          : 0;
        const daysSinceLastLogin = cohortEnrollments
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
      });

    return cohortProgress;
  } catch (error) {
    throwSuperCuratorReadActionError(error, "[getSuperCuratorReportData]", "Не удалось загрузить данные отчета супер-куратора");
  }
}
