import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";

const prisma = getPrisma();

export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: toJsonValue(input.metadata ?? {})
    }
  });
}

export async function listAuditLogs(page = 1, limit = 25) {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, email: true, name: true } }
      }
    }),
    prisma.auditLog.count()
  ]);
  return { logs, total, page, limit, pages: Math.ceil(total / limit) };
}
