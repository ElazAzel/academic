import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/prisma";
import { disable2fa } from "@/server/modules/2fa/service";

const prisma = getPrisma();

/**
 * POST /api/v1/auth/2fa/disable
 * Disable 2FA for the current user. Requires current password.
 * Body: { password: string }
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser?.passwordHash) {
      return NextResponse.json(
        { error: "Пароль не установлен" },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(dbUser.passwordHash, password);
    if (!valid) {
      return NextResponse.json(
        { error: "Неверный пароль" },
        { status: 403 },
      );
    }

    await disable2fa(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
