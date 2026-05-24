"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { logAudit } from "@/server/modules/audit/service";
import { maskStudentName } from "@/lib/utils";
import { ApiError } from "@/lib/http";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";

const prisma = getPrisma();

export async function getRiskOverview(filters?: {
  cohortId?: string;
  curatorId?: string;
  type?: string;
  severity?: string;
  search?: string;
}) {
  const actor = await requireRole(["super_curator", "admin"]);
  const scope = await getSuperCuratorScope(actor);

  if (!scope.isGlobal && scope.studentIds.length === 0) {
    return emptyRiskOverview();
  }

  const where: Record<string, unknown> = {
    resolvedAt: null,
    ...(scope.isGlobal ? {} : { userId: { in: scope.studentIds } }),
  };

  if (filters?.cohortId) {
    if (!scope.isGlobal && !scope.cohortIds.includes(filters.cohortId)) {
      return emptyRiskOverview();
    }
    where.cohortId = filters.cohortId;
  }

  if (filters?.curatorId) {
    if (!scope.isGlobal && !scope.curatorIds.includes(filters.curatorId)) {
      return emptyRiskOverview();
    }

    const studentIdsForCurator = scope.isGlobal
      ? (await prisma.curatorAssignment.findMany({
          where: { curatorId: filters.curatorId, active: true },
          select: { studentId: true },
        })).map((assignment) => assignment.studentId)
      : scope.assignments
          .filter((assignment) => assignment.curatorId === filters.curatorId)
          .map((assignment) => assignment.studentId);

    where.userId = { in: studentIdsForCurator };
  }

  if (filters?.type) where.type = filters.type;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.search) {
    where.user = {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ],
    };
  }

  const risks = await prisma.riskFlag.findMany({
    where: where as Prisma.RiskFlagWhereInput,
    include: {
      user: { select: { id: true, name: true, email: true, lastLoginAt: true, organization: true } },
      course: { select: { title: true } },
      cohort: {
        select: {
          id: true,
          name: true,
          curatorAssignments: {
            where: { active: true },
            include: { curator: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const [cohorts, curators] = await Promise.all([
    prisma.cohort.findMany({
      where: { status: "active", ...(scope.isGlobal ? {} : { id: { in: scope.cohortIds } }) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const risk of risks) {
    if (risk.severity in bySeverity) {
      bySeverity[risk.severity as keyof typeof bySeverity]++;
    }
  }

  const scopeAssignmentByStudentCohort = new Map(
    scope.assignments.map((assignment) => [`${assignment.cohortId}:${assignment.studentId}`, assignment]),
  );

  return {
    risks: risks.map((risk) => {
      const scopedAssignment = risk.cohortId
        ? scopeAssignmentByStudentCohort.get(`${risk.cohortId}:${risk.userId}`)
        : scope.assignments.find((assignment) => assignment.studentId === risk.userId);
      const curator = risk.cohort?.curatorAssignments?.find((assignment) => {
        return assignment.studentId === risk.userId || assignment.curatorId === scopedAssignment?.curatorId;
      })?.curator ?? risk.cohort?.curatorAssignments?.[0]?.curator ?? null;

      const isAdmin = actor.roles.includes("admin");
      return {
        id: risk.id,
        type: risk.type,
        severity: risk.severity,
        studentId: risk.userId,
        studentName: isAdmin ? (risk.user.name ?? risk.user.email) : maskStudentName(risk.userId),
        studentEmail: risk.user.email,
        studentRealName: risk.user.organization ?? null,
        courseTitle: risk.course?.title ?? "",
        cohortId: risk.cohort?.id ?? null,
        cohortName: risk.cohort?.name ?? null,
        curatorId: curator?.id ?? scopedAssignment?.curatorId ?? null,
        curatorName: curator?.name ?? curator?.email ?? null,
        createdAt: risk.createdAt.toISOString(),
        daysSinceLogin: risk.user.lastLoginAt
          ? Math.floor((Date.now() - risk.user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
    }),
    cohorts,
    curators,
    bySeverity,
    total: risks.length,
  };
}

export async function createRiskAction(formData: FormData) {
  const actor = await requireRole(["admin", "super_curator"]);
  const scope = await getSuperCuratorScope(actor);
  const userId = formData.get("userId") as string;
  const type = formData.get("type") as string;
  const severity = (formData.get("severity") as string) || "medium";
  const courseId = formData.get("courseId") as string;
  const cohortId = formData.get("cohortId") as string;

  if (!userId || !type) {
    throw new ApiError("bad_request", "Слушатель и тип риска обязательны", 400);
  }
  if (!scope.isGlobal) {
    if (!scope.studentIds.includes(userId)) {
      throw new ApiError("forbidden", "Слушатель вне зоны ответственности супер-куратора", 403);
    }
    if (cohortId && !scope.cohortIds.includes(cohortId)) {
      throw new ApiError("forbidden", "Поток вне зоны ответственности супер-куратора", 403);
    }
  }

  await prisma.riskFlag.create({
    data: { userId, type, severity, courseId: courseId || undefined, cohortId: cohortId || undefined },
  });

  await logAudit({
    actorId: actor.id,
    action: "risk_flag.created",
    entity: "risk_flag",
    metadata: { userId, type, severity },
  });

  revalidatePath("/super-curator/risks");
  revalidatePath("/curator/risks");
  return { success: true };
}

export async function resolveRiskAction(flagId: string) {
  const actor = await requireRole(["admin", "super_curator", "curator"]);

  if (actor.roles.includes("super_curator") && !actor.roles.includes("admin")) {
    const scope = await getSuperCuratorScope(actor);
    const risk = await prisma.riskFlag.findUnique({ where: { id: flagId }, select: { userId: true } });
    if (!risk) throw new ApiError("not_found", "Риск не найден", 404);
    if (!scope.studentIds.includes(risk.userId)) {
      throw new ApiError("forbidden", "Риск вне зоны ответственности супер-куратора", 403);
    }
  }

  await prisma.riskFlag.update({ where: { id: flagId }, data: { status: "resolved", resolvedAt: new Date() } });
  await logAudit({ actorId: actor.id, action: "risk_flag.resolved", entity: "risk_flag", entityId: flagId });
  revalidatePath("/super-curator/risks");
  revalidatePath("/curator/risks");
  return { success: true };
}

export async function getStudentsForRisk() {
  const actor = await requireRole(["admin", "super_curator"]);
  const scope = await getSuperCuratorScope(actor);

  return prisma.user.findMany({
    where: {
      roles: { some: { role: { key: "student" } } },
      ...(scope.isGlobal ? {} : { id: { in: scope.studentIds } }),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

function emptyRiskOverview() {
  return {
    risks: [],
    cohorts: [],
    curators: [],
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    total: 0,
  };
}
