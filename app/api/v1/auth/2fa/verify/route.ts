import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { verifyTotp, enable2fa } from "@/server/modules/2fa/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ApiError, errorResponse, parseJson } from "@/lib/http";

const Verify2faSchema = z.object({
  secret: z.string().trim().min(1, "Укажите секрет 2FA"),
  token: z.string().trim().min(1, "Укажите код подтверждения"),
});

/**
 * POST /api/v1/auth/2fa/verify
 * Verify a TOTP token and enable 2FA for the user.
 * Body: { secret: string, token: string }
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();

    // Enforce strict per-user verification rate limit (max 5 verification attempts per window)
    const rl = await checkRateLimit(`2fa-verify:${user.id}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много попыток. Попробуйте позже.", 429);
    }

    const { secret, token } = await parseJson(req, Verify2faSchema);

    if (!verifyTotp(token, secret)) {
      throw new ApiError("bad_request", "Неверный код. Попробуйте снова.", 400);
    }

    const { backupCodes } = await enable2fa(user.id, secret);

    return NextResponse.json({ success: true, backupCodes });
  } catch (error) {
    return errorResponse(error);
  }
}
