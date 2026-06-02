import { z } from "zod";
import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { touchAuthDeviceSession } from "@/server/modules/auth/device-sessions";

const sessionPayloadSchema = z.object({
  sessionId: z.string().trim().min(1, "Не указан sessionId"),
});

/**
 * POST /api/v1/sessions/heartbeat
 * Touches the session to keep it alive and log a heartbeat activity.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const prisma = getPrisma();

    const body = await parseJson(request, sessionPayloadSchema);

    const session = await prisma.userSession.findFirst({
      where: { id: body.sessionId, userId: user.id, durationSec: null },
    });

    if (!session) {
      return errorResponse(
        new ApiError("not_found", "Сессия не найдена или уже завершена", 404),
      );
    }

    if (user.authDeviceSessionId) {
      const touched = await touchAuthDeviceSession(user.id, user.authDeviceSessionId);
      if (touched.count === 0) {
        throw new ApiError(
          "forbidden",
          "Сессия устройства отозвана. Войдите снова.",
          403,
          { reason: "device-limit" },
        );
      }
    }

    // Extend endedAt forward so end-of-session calculation can use it
    const now = new Date();
    await prisma.userSession.update({
      where: { id: body.sessionId },
      data: { endedAt: now },
    });

    return ok({ sessionId: session.id });
  } catch (error) {
    return errorResponse(error);
  }
}
