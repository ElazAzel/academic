import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isPublicRoute,
  getRouteRoles,
  getDefaultRolePath,
} from "@/lib/auth/middleware-guards";
import { AUTH_ROUTES, FORBIDDEN_ROUTE } from "@/lib/constants";

// ── Rate limiting (in-memory, per-instance) ────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 120;

  const entry = rateMap.get(key);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// ── Main proxy handler ─────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "anonymous";
    const { allowed, remaining } = checkRateLimit(`${ip}:${pathname}`);
    if (!allowed) {
      return NextResponse.json(
        { error: { code: "too_many_requests", message: "Слишком много запросов. Попробуйте позже." } },
        { status: 429, headers: { "X-RateLimit-Limit": "120", "X-RateLimit-Remaining": String(remaining) } }
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
