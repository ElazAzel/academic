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

function positiveIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const apiRateLimitMaxRequests = positiveIntegerEnv(process.env.RATE_LIMIT_MAX_REQUESTS, 120);
const apiRateLimitWindowSeconds = positiveIntegerEnv(process.env.RATE_LIMIT_WINDOW_SECONDS, 60);

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
// Next.js 16 извлекает nonce из Content-Security-Policy request header во
// время SSR (парсит `'nonce-{value}'` в script-src). Поэтому CSP нужно
// передавать в request headers, а не только в response.
// Для браузера CSP дублируется в response headers.
//
// CSP reporting: /api/v1/csp-report принимает POST от браузера.
// Если добавлен хэш скрипта, его нужно обновлять при редеплое (хэш RSC
// flight data меняется per-request, но bootstrap скрипты стабильны).
//
// Известные хэши (production 2026-06):
// - sha256-J9cZHZf5nVZbsm7Pqxc8RsURv1AIXkMgbhfrZvoOs/A= — inline скрипт
//   на /student/certificates без nonce (вероятно RSC flight data)
// - sha256-UnthrFpGFotkvMOTp/ghVMSXoZZj9Y6epaMsaBAbUtg= — inline скрипт
//   login/root runtime после динамического брендинга

function buildCspPolicy(nonce: string, isDev: boolean): string {
  const devExtra = isDev
    ? " 'unsafe-eval'"  // нужен для react-hot-loader / HMR
    : "";

  // addenv: Если хэш меняется на новом деплое — замени значение ниже.
  // Можно удалить когда nonce propagation будет чинить во всех Next.js-
  // скриптах.
  const scriptHashes = [
    "'sha256-J9cZHZf5nVZbsm7Pqxc8RsURv1AIXkMgbhfrZvoOs/A='",
    "'sha256-UnthrFpGFotkvMOTp/ghVMSXoZZj9Y6epaMsaBAbUtg='",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' ${scriptHashes}${devExtra}`,
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
    "report-uri /api/v1/csp-report",
  ].join("; ");
}

// Для страниц (NextResponse.next()): CSP на request (SSR nonce) + response (browser)
function nextWithCsp(req: NextRequest, nonce: string): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCspPolicy(nonce, isDev);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Для редиректов: CSP только на response (браузерный)
function redirectWithCsp(url: URL, nonce: string): NextResponse {
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCspPolicy(nonce, isDev);
  const response = NextResponse.redirect(url);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// ── Main proxy handler ─────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSP nonce генерируется на каждый запрос
  const nonce = crypto.randomUUID();

  // CSRF check for mutating API requests (POST/PUT/PATCH/DELETE)
  // Исключаем webhooks и cron — у них нет browser origin
  const CSRF_BYPASS_PREFIXES = ["/api/v1/webhooks/stripe", "/api/v1/outbox/process", "/api/v1/reports/scheduled", "/api/v1/csp-report"];
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
    const result = await rateLimit(
      `ratelimit:ip:${ip}`,
      apiRateLimitMaxRequests,
      apiRateLimitWindowSeconds,
    );
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "too_many_requests", message: "Слишком много запросов. Попробуйте позже." } },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(apiRateLimitMaxRequests),
            "X-RateLimit-Remaining": String(result.remaining),
          },
        }
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
        return nextWithCsp(req, nonce);
      }
      if (token?.roles) {
        const roles = token.roles as string[];
        const homePath = getDefaultRolePath(roles as string[]);
        if (homePath !== FORBIDDEN_ROUTE) {
          return redirectWithCsp(new URL(homePath, req.url), nonce);
        }
      }
    }
    return nextWithCsp(req, nonce);
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return redirectWithCsp(loginUrl, nonce);
  }

  if (token.authDeviceSessionRevoked) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, req.url);
    loginUrl.searchParams.set("reason", "device-limit");
    return redirectWithCsp(loginUrl, nonce);
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
      return redirectWithCsp(new URL("/auth/2fa", req.url), nonce);
    }
  }

  const roles = (token.roles as string[]) ?? [];
  const allowedRoles = getRouteRoles(pathname);

  if (allowedRoles && !allowedRoles.some((r) => roles.includes(r))) {
    return redirectWithCsp(new URL(FORBIDDEN_ROUTE, req.url), nonce);
  }

  return nextWithCsp(req, nonce);
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|assets|sw\\.js|manifest\\.json).*)"],
};
