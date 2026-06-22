import { getPrisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/json";
import { getSafeErrorMetadata } from "@/lib/http";
import { createNotification } from "@/server/modules/notifications/service";

export const MAX_ACTIVE_DEVICE_SESSIONS = 2;
export const DEVICE_LIMIT_REVOKE_REASON = "device_limit_exceeded";

const DEVICE_LIMIT_NOTIFICATION = {
  title: "Ограничение входа по устройствам",
  body:
    "Выполнен вход на третьем устройстве. В целях безопасности один из предыдущих сеансов завершен. Не передавайте логин и пароль третьим лицам.",
};

export interface AuthDeviceSessionResult {
  id: string;
  startedAt: Date;
  revokedSessionIds: string[];
}

export async function registerAuthDeviceSession(input: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: string;
}): Promise<AuthDeviceSessionResult> {
  const prisma = getPrisma();
  const now = new Date();
  const source = input.source ?? "web";

  const result = await prisma.$transaction(
    async (tx) => {
      const session = await tx.authDeviceSession.create({
        data: {
          userId: input.userId,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          source,
          startedAt: now,
          lastSeenAt: now,
        },
        select: {
          id: true,
          startedAt: true,
        },
      });

      const previousActiveSessions = await tx.authDeviceSession.findMany({
        where: {
          userId: input.userId,
          revokedAt: null,
          id: { not: session.id },
        },
        orderBy: [{ startedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          startedAt: true,
          lastSeenAt: true,
          ipAddress: true,
          userAgent: true,
        },
      });

      const revokeCount = Math.max(
        0,
        previousActiveSessions.length + 1 - MAX_ACTIVE_DEVICE_SESSIONS,
      );
      const revokedSessions = previousActiveSessions.slice(0, revokeCount);
      const revokedSessionIds = revokedSessions.map((item) => item.id);

      if (revokedSessionIds.length > 0) {
        await tx.authDeviceSession.updateMany({
          where: { id: { in: revokedSessionIds }, userId: input.userId },
          data: {
            revokedAt: now,
            revokedReason: DEVICE_LIMIT_REVOKE_REASON,
            lastSeenAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: input.userId,
            action: "auth.device_limit_exceeded",
            entity: "auth_device_session",
            entityId: session.id,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            metadata: toJsonValue({
              maxActiveDeviceSessions: MAX_ACTIVE_DEVICE_SESSIONS,
              newSessionId: session.id,
              revokedSessionIds,
              revokedReason: DEVICE_LIMIT_REVOKE_REASON,
            }),
          },
        });
      }

      return {
        id: session.id,
        startedAt: session.startedAt,
        revokedSessionIds,
      };
    },
    { timeout: 10_000 },
  );

  if (result.revokedSessionIds.length > 0) {
    try {
      await createNotification({
        userId: input.userId,
        event: DEVICE_LIMIT_REVOKE_REASON,
        channel: "push",
        title: DEVICE_LIMIT_NOTIFICATION.title,
        body: DEVICE_LIMIT_NOTIFICATION.body,
        refType: "auth_device_session",
        refId: result.id,
        persist: false, // не сохраняем в БД — только push-уведомление
        data: {
          maxActiveDeviceSessions: MAX_ACTIVE_DEVICE_SESSIONS,
          revokedSessionIds: result.revokedSessionIds,
        },
      });
    } catch (error) {
      console.error("[auth-device-sessions] Failed to create device limit notification", getSafeErrorMetadata(error));
    }
  }

  return result;
}

export async function isAuthDeviceSessionActive(userId: string, sessionId: string) {
  const prisma = getPrisma();
  const session = await prisma.authDeviceSession.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
    select: { id: true },
  });

  return Boolean(session);
}

export async function touchAuthDeviceSession(userId: string, sessionId: string) {
  const prisma = getPrisma();
  return prisma.authDeviceSession.updateMany({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
    },
    data: { lastSeenAt: new Date() },
  });
}
