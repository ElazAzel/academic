import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/prisma";
import { disable2fa } from "@/server/modules/2fa/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ApiError, errorResponse, parseJson } from "@/lib/http";

const prisma = getPrisma();

const Disable2faSchema = z.object({
  password: z.string().min(1, "Укажите пароль"),
});

/**
 * POST /api/v1/auth/2fa/disable
 * Disable 2FA for the current user. Requires current password.
 * Body: { password: string }
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    // Enforce strict rate limit on security mutations: max 5 requests per window
    const rl = await checkRateLimit(`2fa-disable:${user.id}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много попыток. Попробуйте позже.", 429);
    }

    const { password } = await parseJson(req, Disable2faSchema);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!dbUser?.passwordHash) {
      throw new ApiError("bad_request", "Пароль не установлен", 400);
    }

    const valid = await verifyPassword(dbUser.passwordHash, password);
    if (!valid) {
      throw new ApiError("forbidden", "Неверный пароль", 403);
    }

    await disable2fa(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
