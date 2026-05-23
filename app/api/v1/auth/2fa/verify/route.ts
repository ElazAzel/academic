import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { verifyTotp, enable2fa } from "@/server/modules/2fa/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ApiError, errorResponse } from "@/lib/http";

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

    const { secret, token } = await req.json();

    if (!secret || !token) {
      throw new ApiError("bad_request", "Secret and token are required", 400);
    }

    if (!verifyTotp(token, secret)) {
      throw new ApiError("bad_request", "Неверный код. Попробуйте снова.", 400);
    }

    const { backupCodes } = await enable2fa(user.id, secret);

    return NextResponse.json({ success: true, backupCodes });
  } catch (error) {
    return errorResponse(error);
  }
}
