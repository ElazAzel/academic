import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { verifyTotp, enable2fa } from "@/server/modules/2fa/service";

/**
 * POST /api/v1/auth/2fa/verify
 * Verify a TOTP token and enable 2FA for the user.
 * Body: { secret: string, token: string }
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { secret, token } = await req.json();

    if (!secret || !token) {
      return NextResponse.json(
        { error: "Secret and token are required" },
        { status: 400 },
      );
    }

    if (!verifyTotp(token, secret)) {
      return NextResponse.json(
        { error: "Неверный код. Попробуйте снова." },
        { status: 400 },
      );
    }

    await enable2fa(user.id, secret);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
