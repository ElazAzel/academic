import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { touchAuthDeviceSession } from "@/server/modules/auth/device-sessions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { ApiError, errorResponse } from "@/lib/http";

const prisma = getPrisma();

/**
 * Heartbeat API — вызывается с клиента каждые 5 минут.
 * Обновляет lastLoginAt пользователя для отслеживания онлайна.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      // Silently succeed for unauthenticated users (heartbeat runs globally)
      return NextResponse.json({ ok: true });
    }
    if (session.authDeviceSessionRevoked) {
      return errorResponse(
        new ApiError(
          "forbidden",
          "Сессия устройства отозвана. Войдите снова.",
          403,
          { reason: "device-limit" },
        ),
      );
    }

    const user = await getCurrentUser();
    if (!user?.id) {
      return errorResponse(
        new ApiError(
          "forbidden",
          "Сессия устройства отозвана. Войдите снова.",
          403,
          { reason: "device-limit" },
        ),
      );
    }

    if (user.authDeviceSessionId) {
      const touched = await touchAuthDeviceSession(user.id, user.authDeviceSessionId);
      if (touched.count === 0) {
        return errorResponse(
          new ApiError(
            "forbidden",
            "Сессия устройства отозвана. Войдите снова.",
            403,
            { reason: "device-limit" },
          ),
        );
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    // Silently succeed even on errors to avoid console noise
    return NextResponse.json({ ok: true });
  }
}
