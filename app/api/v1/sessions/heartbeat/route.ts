import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

/**
 * POST /api/v1/sessions/heartbeat
 * Touches the session to keep it alive and log a heartbeat activity.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const prisma = getPrisma();

    const body = (await request.json()) as { sessionId: string };
    if (!body.sessionId) {
      return errorResponse(
        new ApiError("validation_error", "Не указан sessionId", 400),
      );
    }

    const session = await prisma.userSession.findFirst({
      where: { id: body.sessionId, userId: user.id, endedAt: null },
    });

    if (!session) {
      return errorResponse(
        new ApiError("not_found", "Сессия не найдена или уже завершена", 404),
      );
    }

    // Extend endedAt forward so end-of-session calculation can use it
    await prisma.userSession.update({
      where: { id: body.sessionId },
      data: { endedAt: new Date() },
    });

    return ok({ sessionId: session.id });
  } catch (error) {
    return errorResponse(error);
  }
}
