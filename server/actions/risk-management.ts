"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

export async function getRiskOverview(filters?: {
  cohortId?: string;
  curatorId?: string;
  type?: string;
  severity?: string;
  search?: string;
}) {
  await requireRole(["super_curator", "admin"]);

  const where: Record<string, unknown> = { resolvedAt: null };
  if (filters?.cohortId) where.cohortId = filters.cohortId;
  if (filters?.type) where.type = filters.type;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.search) {
    where.user = { name: { contains: filters.search, mode: "insensitive" } };
  }

  const risks = await prisma.riskFlag.findMany({
    where: where as Prisma.RiskFlagWhereInput,
    include: {
      user: { select: { id: true, name: true, email: true, lastLoginAt: true, organization: true } },
      course: { select: { title: true } },
      cohort: { select: { id: true, name: true, curatorAssignments: { where: { active: true }, include: { curator: { select: { id: true, name: true, email: true } } } } } },
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  // Get all cohorts and curators for filter dropdowns
  const [cohorts, curators] = await Promise.all([
    prisma.cohort.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { roles: { some: { role: { key: "curator" } } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Severity counts
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of risks) {
    bySeverity[r.severity as keyof typeof bySeverity]++;
  }

  return {
    risks: risks.map((r) => {
      const curator = r.cohort?.curatorAssignments?.[0]?.curator ?? null;
      return {
        id: r.id,
        type: r.type,
        severity: r.severity,
        studentId: r.userId,
        studentName: r.user.name ?? r.user.email,
        studentEmail: r.user.email,
        studentRealName: r.user.organization ?? null,
        courseTitle: r.course?.title ?? "",
        cohortId: r.cohort?.id ?? null,
        cohortName: r.cohort?.name ?? null,
        curatorId: curator?.id ?? null,
        curatorName: curator?.name ?? null,
        createdAt: r.createdAt.toISOString(),
        daysSinceLogin: r.user.lastLoginAt
          ? Math.floor((Date.now() - r.user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
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
  const userId = formData.get("userId") as string;
  const type = formData.get("type") as string;
  const severity = (formData.get("severity") as string) || "medium";
  const courseId = formData.get("courseId") as string;
  const cohortId = formData.get("cohortId") as string;

  if (!userId || !type) throw new Error("Студент и тип риска обязательны");

  await prisma.riskFlag.create({ data: { userId, type, severity, courseId: courseId || undefined, cohortId: cohortId || undefined } });

  await logAudit({ actorId: actor.id, action: "risk_flag.created", entity: "risk_flag", metadata: { userId, type, severity } });

  revalidatePath("/super-curator/risks");
  revalidatePath("/curator/risks");
  return { success: true };
}

export async function resolveRiskAction(flagId: string) {
  const actor = await requireRole(["admin", "super_curator", "curator"]);
  await prisma.riskFlag.update({ where: { id: flagId }, data: { status: "resolved", resolvedAt: new Date() } });
  await logAudit({ actorId: actor.id, action: "risk_flag.resolved", entity: "risk_flag", entityId: flagId });
  revalidatePath("/super-curator/risks");
  revalidatePath("/curator/risks");
  return { success: true };
}

export async function getStudentsForRisk() {
  await requireRole(["admin", "super_curator"]);
  return prisma.user.findMany({
    where: { roles: { some: { role: { key: "student" } } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}
