import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Публичные маршруты — не требуют аутентификации.
 */
const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/403",
  "/privacy",
  "/terms",
  "/consent",
]);

const PUBLIC_PATH_PREFIXES = [
  "/api/auth",
  "/api/healthz",
  "/api/readyz",
  "/api/v1/healthz",
  "/api/v1/readyz",
  "/api/v1/certificates/verify",
  "/certificates/verify",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/assets",
];

/**
 * Какие роли имеют доступ к каким префиксам маршрутов.
 */
const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  "/admin": ["admin"],
  "/instructor": ["instructor"],
  "/student": ["student"],
  "/curator": ["curator", "super_curator"],
  "/super-curator": ["super_curator", "admin"],
  "/customer-observer": ["customer_observer"],
};

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getRequiredRoles(pathname: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTE_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")) {
      return roles;
    }
  }
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // Публичные маршруты пропускаем без проверки
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    const token = req.nextauth.token;
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Проверка ролей для защищённых маршрутов
    const requiredRoles = getRequiredRoles(pathname);
    if (requiredRoles) {
      const userRoles: string[] = (token.roles as string[]) ?? [];
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        return NextResponse.redirect(new URL("/403", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/assets (public assets)
     *
     * But DO match /api/protected routes if needed.
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
