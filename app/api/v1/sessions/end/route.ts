import { ApiError, errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

/**
 * POST /api/v1/sessions/end
 * Closes a visit session and computes duration in seconds.
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
      where: { id: body.sessionId, userId: user.id, durationSec: null },
    });

    if (!session) {
      return errorResponse(
        new ApiError("not_found", "Сессия не найдена или уже завершена", 404),
      );
    }

    const now = new Date();
    const durationSec = Math.round(
      (now.getTime() - session.startedAt.getTime()) / 1000,
    );

    await prisma.userSession.update({
      where: { id: body.sessionId },
      data: { endedAt: now, durationSec },
    });

    return ok({
      sessionId: session.id,
      durationSec,
      endedAt: now.toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
