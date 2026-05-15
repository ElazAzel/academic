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
  return primaryRole ? ROLE_HOME_PATH[primaryRole] : "/403";
}

export const PUBLIC_ROUTES = new Set([
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

export const PUBLIC_PATH_PREFIXES = [
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
