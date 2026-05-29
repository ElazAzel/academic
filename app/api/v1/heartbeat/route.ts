import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { touchAuthDeviceSession } from "@/server/modules/auth/device-sessions";

const prisma = getPrisma();

/**
 * Heartbeat API — вызывается с клиента каждые 5 минут.
 * Обновляет lastLoginAt пользователя для отслеживания онлайна.
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      // Silently succeed for unauthenticated users (heartbeat runs globally)
      return NextResponse.json({ ok: true });
    }

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      user.authDeviceSessionId
        ? touchAuthDeviceSession(user.id, user.authDeviceSessionId)
        : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    // Silently succeed even on errors to avoid console noise
    return NextResponse.json({ ok: true });
  }
}
