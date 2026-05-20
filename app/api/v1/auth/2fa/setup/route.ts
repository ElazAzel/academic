import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import {
  generateTotpSecret,
} from "@/server/modules/2fa/service";

/**
 * POST /api/v1/auth/2fa/setup
 * Generate a new TOTP secret for the current user.
 * Returns the secret and a QR-ready otpauth URL.
 */
export async function POST() {
  try {
    const user = await requireUser();
    const { secret, otpauthUrl } = generateTotpSecret(user.email!);

    return NextResponse.json({ secret, otpauthUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
