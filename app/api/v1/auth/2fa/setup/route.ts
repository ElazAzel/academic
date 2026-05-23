import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { generateTotpSecret } from "@/server/modules/2fa/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ApiError, errorResponse } from "@/lib/http";

/**
 * POST /api/v1/auth/2fa/setup
 * Generate a new TOTP secret for the current user.
 * Returns the secret and a QR-ready otpauth URL.
 */
export async function POST() {
  try {
    const user = await requireUser();

    // Enforce per-user rate limit: 10 requests per window
    const rl = await checkRateLimit(`2fa-setup:${user.id}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много запросов. Попробуйте позже.", 429);
    }

    const { secret, otpauthUrl } = generateTotpSecret(user.email!);

    return NextResponse.json({ secret, otpauthUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
