import { AUTH_ROUTES, FORBIDDEN_ROUTE } from "@/lib/constants";

const ROLE_HOME_PATH: Record<string, string> = {
  admin: "/admin",
  super_curator: "/super-curator",
  curator: "/curator",
  instructor: "/instructor",
  customer_observer: "/customer-observer",
  student: "/student",
};

const ROLE_PRIORITY = ["admin", "super_curator", "curator", "instructor", "customer_observer", "student"];

export function getDefaultRolePath(roles: string[]): string {
  const primaryRole = ROLE_PRIORITY.find((role) => roles.includes(role));
  return primaryRole ? ROLE_HOME_PATH[primaryRole] : FORBIDDEN_ROUTE;
}

export const PUBLIC_ROUTES = new Set([
  AUTH_ROUTES.LOGIN,
  AUTH_ROUTES.REGISTER,
  AUTH_ROUTES.FORGOT_PASSWORD,
  AUTH_ROUTES.RESET_PASSWORD,
  AUTH_ROUTES.VERIFY_EMAIL,
  AUTH_ROUTES.TWO_FA,
  FORBIDDEN_ROUTE,
  "/privacy",
  "/terms",
  "/consent",
]);

export const PUBLIC_PATH_PREFIXES = [
  "/api/auth",
  "/api/healthz",
  "/api/readyz",
  "/api/v1/healthz",
  "/api/v1/readyz",
  "/api/v1/certificates/verify",
  "/api/v1/build-version",
  "/api/v1/heartbeat",
  "/api/v1/csp-report",
  "/api/v1/outbox/process",
  "/api/v1/reports/scheduled",
  "/api/v1/webhooks/stripe",
  "/api/v1/payments/checkout",
  "/api/v1/auth/register",
  "/api/v1/auth/redirect-target",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-email",
  "/api/v1/auth/2fa/verify-login",
  "/certificates/verify",
  "/docs",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/icon.svg",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/assets",
];

export const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  "/admin": ["admin"],
  "/instructor": ["instructor"],
  "/student": ["student"],
  "/curator": ["curator", "super_curator"],
  "/super-curator": ["super_curator", "admin"],
  "/customer-observer": ["customer_observer"],
};

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getRouteRoles(pathname: string): string[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTE_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return roles;
    }
  }
  return null;
}
