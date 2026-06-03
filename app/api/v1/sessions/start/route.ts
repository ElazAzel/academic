import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

/**
 * POST /api/v1/sessions/start
 * Creates a new visit session and logs the initial page view.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const prisma = getPrisma();

    const ipAddress =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // Use the first available role (highest privilege) as the session role
    const role = user.roles[0] ?? "student";

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        role,
        ipAddress,
        userAgent,
      },
    });

    // Log initial page view linked to this session
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "PAGE_VIEW",
        resource: "app",
        ipAddress,
        sessionId: session.id,
        metadata: { source: "session_start" },
      },
    });

    return ok({
      sessionId: session.id,
      startedAt: session.startedAt.toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/v1/sessions/start]", {
      error: "Не удалось начать сессию посещения",
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return errorResponse(error);
  }
}
