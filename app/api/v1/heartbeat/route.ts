import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const prisma = getPrisma();

/**
 * Heartbeat API — вызывается с клиента каждые 5 минут.
 * Обновляет lastLoginAt пользователя для отслеживания онлайна.
 */
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      // Silently succeed for unauthenticated users (heartbeat runs globally)
      return NextResponse.json({ ok: true });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Silently succeed even on errors to avoid console noise
    return NextResponse.json({ ok: true });
  }
}
