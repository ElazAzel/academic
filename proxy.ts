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
    // Compare against the effective request host so preview deployments,
    // custom domains, localhost, and Vercel forwarding headers work consistently.
    // Origin is protocol-strict; Referer fallback is host-strict for browser requests
    // that omit Origin on same-origin form/fetch calls.
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost ?? req.headers.get("host") ?? req.nextUrl.host;
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const requestProtocol = forwardedProto ? `${forwardedProto}:` : req.nextUrl.protocol;
    const sameHost = sourceUrl.host === host || sourceUrl.host === req.nextUrl.host;
    const sameProtocol = sourceUrl.protocol === requestProtocol || sourceUrl.protocol === req.nextUrl.protocol;

    if (!sameHost || (origin && !sameProtocol)) {
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

// ── Content-Security-Policy (nonce-based) ──────────────────────────────
// Next.js 16 использует nonce для своих inline-скриптов. Генерируем fresh
// nonce на каждый запрос — unsafe-inline в script-src больше не нужен.

function buildCspPolicy(nonce: string, isDev: boolean): string {
  const devExtra = isDev
    ? " 'unsafe-eval'"  // нужен для react-hot-loader / HMR
    : "";

  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${devExtra}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://fonts.gstatic.com",
    isDev
      ? "connect-src 'self' https: http://localhost:* http://127.0.0.1:*"
      : "connect-src 'self' https: wss:",
    "frame-src https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

function setCspHeaders(response: NextResponse, nonce: string): void {
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCspPolicy(nonce, isDev);
  response.headers.set("Content-Security-Policy", csp);
  // Nonce передаётся в layout для Next.js inline-скриптов
  response.headers.set("x-csp-nonce", nonce);
}

// ── Main proxy handler ─────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSP nonce генерируется на каждый запрос
  const nonce = crypto.randomUUID();

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
      if (token?.authDeviceSessionRevoked) {
        const resp1 = NextResponse.next();
        setCspHeaders(resp1, nonce);
        return resp1;
      }
      if (token?.roles) {
        const roles = token.roles as string[];
        const homePath = getDefaultRolePath(roles as string[]);
        if (homePath !== FORBIDDEN_ROUTE) {
          const resp2 = NextResponse.redirect(new URL(homePath, req.url));
          setCspHeaders(resp2, nonce);
          return resp2;
        }
      }
    }
    const resp3 = NextResponse.next();
    setCspHeaders(resp3, nonce);
    return resp3;
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const resp4 = NextResponse.redirect(loginUrl);
    setCspHeaders(resp4, nonce);
    return resp4;
  }

  if (token.authDeviceSessionRevoked) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set("reason", "device-limit");
    const resp5 = NextResponse.redirect(loginUrl);
    setCspHeaders(resp5, nonce);
    return resp5;
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
      const resp6 = NextResponse.redirect(new URL("/auth/2fa", req.url));
      setCspHeaders(resp6, nonce);
      return resp6;
    }
  }

  const roles = (token.roles as string[]) ?? [];
  const allowedRoles = getRouteRoles(pathname);

  if (allowedRoles && !allowedRoles.some((r) => roles.includes(r))) {
    const resp7 = NextResponse.redirect(new URL(FORBIDDEN_ROUTE, req.url));
    setCspHeaders(resp7, nonce);
    return resp7;
  }

  const resp8 = NextResponse.next();
  setCspHeaders(resp8, nonce);
  return resp8;
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|assets|sw\\.js|manifest\\.json).*)"],
};
