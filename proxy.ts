import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isPublicRoute,
  getRouteRoles,
  getDefaultRolePath,
} from "@/lib/auth/middleware-guards";
import { AUTH_ROUTES, FORBIDDEN_ROUTE } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";

// ── CSRF origin check ───────────────────────────────────────────────────

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function checkCsrfOrigin(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!MUTATING_METHODS.has(method)) return null;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin ?? referer;
  if (!source) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "CSRF: missing origin header" } },
      { status: 403 }
    );
  }

  try {
    const sourceUrl = new URL(source);
    // Compare origin against the request's own hostname — works on any domain,
    // preview deployment, custom domain, and localhost without env vars
    // Также сверяем схему (http vs https) для защиты от cross-scheme атак
    if (
      sourceUrl.protocol !== req.nextUrl.protocol ||
      sourceUrl.hostname !== req.nextUrl.hostname ||
      sourceUrl.port !== req.nextUrl.port
    ) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "CSRF: origin mismatch" } },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: { code: "forbidden", message: "CSRF: invalid origin" } },
      { status: 403 }
    );
  }

  return null;
}

// ── Main proxy handler ─────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF check for mutating API requests (POST/PUT/PATCH/DELETE)
  // Исключаем webhooks и cron — у них нет browser origin
  const CSRF_BYPASS_PREFIXES = ["/api/v1/webhooks/stripe", "/api/v1/outbox/process", "/api/v1/reports/scheduled"];
  const isCsrfBypass = CSRF_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));
  if (pathname.startsWith("/api/") && !isCsrfBypass) {
    const csrfError = checkCsrfOrigin(req);
    if (csrfError) return csrfError;
  }

  // Rate limiting for API routes — глобальный per-IP (не per-path)
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "anonymous";
    const result = await rateLimit(`ratelimit:ip:${ip}`, 120, 60);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "too_many_requests", message: "Слишком много запросов. Попробуйте позже." } },
        { status: 429, headers: { "X-RateLimit-Limit": "120", "X-RateLimit-Remaining": String(result.remaining) } }
      );
    }
  }

  if (isPublicRoute(pathname)) {
    if (pathname === AUTH_ROUTES.LOGIN) {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token?.roles) {
        const roles = token.roles as string[];
        const homePath = getDefaultRolePath(roles as string[]);
        if (homePath !== FORBIDDEN_ROUTE) {
          return NextResponse.redirect(new URL(homePath, req.url));
        }
      }
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2FA check ────────────────────────────────────────────────────────
  // If user requires 2FA, only allow 2FA-related paths
  if (token.requires2fa) {
    const allowed2faPaths = [
      "/auth/2fa",
      "/api/v1/auth/2fa/verify-login",
      "/api/auth/session",
      AUTH_ROUTES.LOGIN,
    ];
    const isAllowed2faPath = allowed2faPaths.some(
      (p) => pathname === p || pathname.startsWith(p),
    );
    if (!isAllowed2faPath) {
      return NextResponse.redirect(new URL("/auth/2fa", req.url));
    }
  }

  const roles = (token.roles as string[]) ?? [];
  const allowedRoles = getRouteRoles(pathname);

  if (allowedRoles && !allowedRoles.some((r) => roles.includes(r))) {
    return NextResponse.redirect(new URL(FORBIDDEN_ROUTE, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|assets).*)"],
};
