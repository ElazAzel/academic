"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";
import { ApiError } from "@/lib/http";

const prisma = getPrisma();

function throwAnalyticsActionError(error: unknown, label: string): never {
  if (error instanceof ApiError) throw error;
  console.error(label, error);
  throw new ApiError("internal_error", "Внутренняя ошибка сервера", 500);
}

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

const GenerateReportActionSchema = z.object({
  projectId: z.string().min(1, "ID проекта обязателен"),
  type: z.string().min(1, "Тип отчёта обязателен"),
});

export async function generateReportAction(projectId: string, type: string) {
  try {
    const parsed = GenerateReportActionSchema.safeParse({ projectId, type });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

    const actor = await requireRole(["admin", "instructor", "super_curator", "customer_observer"]);

    const report = await prisma.report.create({
      data: {
        projectId,
        type,
        status: "ready",
        url: `/api/v1/reports?type=${type}&format=csv`
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
  } catch (error) {
    throwAnalyticsActionError(error, "[generateReportAction]");
  }
}

const CreateRiskFlagActionSchema = z.object({
  userId: z.string().min(1, "ID пользователя обязателен"),
  type: z.string().min(1, "Тип риска обязателен"),
  courseId: z.string().optional(),
  cohortId: z.string().optional(),
});

export async function createRiskFlagAction(userId: string, type: string, courseId?: string, cohortId?: string) {
  try {
    const parsed = CreateRiskFlagActionSchema.safeParse({ userId, type, courseId, cohortId });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

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
  } catch (error) {
    throwAnalyticsActionError(error, "[createRiskFlagAction]");
  }
}

const ResolveRiskFlagActionSchema = z.object({
  flagId: z.string().min(1, "ID флага обязателен"),
});

export async function resolveRiskFlagAction(flagId: string) {
  try {
    const parsed = ResolveRiskFlagActionSchema.safeParse({ flagId });
    if (!parsed.success) {
      throw new ApiError("validation_error", parsed.error.errors[0]?.message || "Ошибка валидации", 422);
    }

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
  } catch (error) {
    throwAnalyticsActionError(error, "[resolveRiskFlagAction]");
  }
}
