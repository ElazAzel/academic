import { NextResponse } from "next/server";
import { getToken, encode } from "next-auth/jwt";
import { z, ZodError } from "zod";
import { verifyTotp, verifyAndConsumeBackupCode } from "@/server/modules/2fa/service";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { ApiError, errorResponse, parseJson } from "@/lib/http";

const prisma = getPrisma();

const VerifyLogin2faSchema = z
  .object({
    token: z.string().trim().min(1, "Укажите код подтверждения").optional(),
    backupCode: z.string().trim().min(1, "Укажите резервный код").optional(),
  })
  .refine((input) => Boolean(input.token || input.backupCode), {
    message: "Укажите код подтверждения",
  });

/**
 * POST /api/v1/auth/2fa/verify-login
 * Verify TOTP during login flow. Updates the JWT to remove requires2fa flag.
 * Body: { token: string } or { backupCode: string }
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new ApiError("internal_error", "Сервер временно не настроен", 500);
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
      throw new ApiError("unauthorized", "Требуется вход", 401);
    }

    const userId = jwtToken.sub;
    const rl = await checkRateLimit(`2fa-login:${userId}`);
    if (!rl.allowed) {
      throw new ApiError("too_many_requests", "Слишком много попыток. Попробуйте позже.", 429);
    }

    const { token, backupCode } = await parseJson(req, VerifyLogin2faSchema);

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
      throw new ApiError("bad_request", "Неверный код. Попробуйте снова.", 400);
    }

    // Issue new JWT without requires2fa flag
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
    if (error instanceof ApiError || error instanceof ZodError) {
      return errorResponse(error);
    }
    return errorResponse(new ApiError("internal_error", "Внутренняя ошибка сервера", 500));
  }
}
