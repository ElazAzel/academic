import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyTotp, verifyAndConsumeBackupCode } from "@/server/modules/2fa/service";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

/**
 * POST /api/v1/auth/2fa/verify-login
 * Verify TOTP during login flow. Updates the JWT to remove requires2fa flag.
 * Body: { token: string } or { backupCode: string }
 */
export async function POST(req: Request) {
  try {
    const { token, backupCode } = await req.json();
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Construct a minimal request-like object for getToken
    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
    const cookies: Record<string, string> = {};
    const cookieHeader = req.headers.get("cookie") || "";
    cookieHeader.split(";").forEach((c) => {
      const [k, ...v] = c.trim().split("=");
      if (k) cookies[k.trim()] = v.join("=");
    });

    const jwtToken = await getToken({
      req: {
        headers: { cookie: cookieHeader } as unknown as Headers,
        cookies: { get: (name: string) => cookies[name] ?? undefined },
      } as never,
      secret,
    });

    if (!jwtToken?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = jwtToken.sub;

    // Verify TOTP or backup code
    let valid = false;
    if (backupCode) {
      valid = await verifyAndConsumeBackupCode(userId, backupCode);
    } else if (token) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpSecret: true },
      });
      if (user?.totpSecret) {
        valid = verifyTotp(token, user.totpSecret);
      }
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Неверный код. Попробуйте снова." },
        { status: 400 },
      );
    }

    // Issue new JWT without requires2fa flag
    const { encode } = await import("next-auth/jwt");
    const newToken = { ...jwtToken, requires2fa: false };
    const newJwt = await encode({ token: newToken, secret });

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, newJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
