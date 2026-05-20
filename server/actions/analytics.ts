"use server";

import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

async function assertCuratorStudentAccess(actor: { id: string; roles: string[] }, studentId: string) {
  if (actor.roles.includes("admin")) return;
  const assignment = await prisma.curatorAssignment.findFirst({
    where: {
      studentId,
      active: true,
      ...(actor.roles.includes("super_curator")
        ? { superCuratorId: actor.id }
        : { curatorId: actor.id }),
    },
  });
  if (!assignment) {
    throw new ApiError("forbidden", "Доступ запрещен: студент не закреплен за вами", 403);
  }
}

export async function generateReportAction(projectId: string, type: string) {
  const actor = await requireRole(["admin", "instructor", "super_curator", "customer_observer"]);

  const report = await prisma.report.create({
    data: {
      projectId,
      type,
      status: "ready",
      url: `/api/v1/reports/download?id=${crypto.randomUUID()}` // Mock URL
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "report.generated",
    entity: "report",
    entityId: report.id,
    metadata: { projectId, type }
  });

  return report;
}

export async function createRiskFlagAction(userId: string, type: string, courseId?: string, cohortId?: string) {
  const actor = await requireRole(["admin", "super_curator", "curator"]);

  await assertCuratorStudentAccess(actor, userId);

  const flag = await prisma.riskFlag.create({
    data: {
      userId,
      type,
      courseId,
      cohortId,
      severity: "high",
      status: "open"
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "risk_flag.created",
    entity: "risk_flag",
    entityId: flag.id,
    metadata: { userId, type }
  });

  return flag;
}

export async function resolveRiskFlagAction(flagId: string) {
  const actor = await requireRole(["admin", "super_curator", "curator"]);

  const riskFlag = await prisma.riskFlag.findUnique({
    where: { id: flagId },
    select: { id: true, userId: true }
  });
  if (!riskFlag) {
    throw new ApiError("not_found", "Флаг риска не найден", 404);
  }

  await assertCuratorStudentAccess(actor, riskFlag.userId);

  const updated = await prisma.riskFlag.update({
    where: { id: flagId },
    data: {
      status: "resolved",
      resolvedAt: new Date()
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "risk_flag.resolved",
    entity: "risk_flag",
    entityId: riskFlag.id
  });

  return updated;
}
