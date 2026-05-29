import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Password123!";

export interface RoleUser {
  role: string;
  email: string;
  homePath: string;
  allowedPrefixes: string[];
}

export const ROLE_USERS: RoleUser[] = [
  { role: "admin", email: "admin@academy.local", homePath: "/admin", allowedPrefixes: ["/admin", "/super-curator"] },
  { role: "instructor", email: "instructor1@academy.local", homePath: "/instructor", allowedPrefixes: ["/instructor"] },
  { role: "student", email: "student1@academy.local", homePath: "/student", allowedPrefixes: ["/student"] },
  { role: "curator", email: "curator@academy.local", homePath: "/curator", allowedPrefixes: ["/curator"] },
  { role: "super_curator", email: "supercurator@academy.local", homePath: "/super-curator", allowedPrefixes: ["/super-curator"] },
  { role: "customer_observer", email: "observer@academy.local", homePath: "/customer-observer", allowedPrefixes: ["/customer-observer"] },
];

/** Static (no-param) routes per role. Dynamic routes like [courseId] tested in workflows. */
const ADMIN_ROUTES = [
  "/admin", "/admin/users", "/admin/roles", "/admin/courses",
  "/admin/enrollments", "/admin/cohorts", "/admin/cohorts/new",
  "/admin/invites", "/admin/management", "/admin/reports",
  "/admin/analytics", "/admin/audit", "/admin/certificates",
  "/admin/settings", "/admin/popups", "/admin/glossary",
  "/admin/notifications",
];

const INSTRUCTOR_ROUTES = [
  "/instructor", "/instructor/courses", "/instructor/courses/new",
  "/instructor/quizzes", "/instructor/assignments",
  "/instructor/questions", "/instructor/students",
  "/instructor/reports", "/instructor/analytics",
  "/instructor/attendance", "/instructor/deadlines",
  "/instructor/chat", "/instructor/notifications",
  "/instructor/settings",
];

const STUDENT_ROUTES = [
  "/student", "/student/my-courses", "/student/quizzes",
  "/student/assignments", "/student/reports",
  "/student/certificates", "/student/notifications",
  "/student/settings", "/student/settings/notifications",
];

const CURATOR_ROUTES = [
  "/curator", "/curator/students", "/curator/questions",
  "/curator/assignments", "/curator/risks", "/curator/reports",
  "/curator/analytics", "/curator/chat", "/curator/popups",
  "/curator/glossary", "/curator/notifications",
  "/curator/settings", "/curator/settings/notifications",
];

const SUPER_CURATOR_ROUTES = [
  "/super-curator", "/super-curator/cohorts",
  "/super-curator/curators", "/super-curator/distribution",
  "/super-curator/users", "/super-curator/questions",
  "/super-curator/risks", "/super-curator/reports",
  "/super-curator/analytics", "/super-curator/chat",
  "/super-curator/notifications", "/super-curator/settings",
];

const OBSERVER_ROUTES = [
  "/customer-observer", "/customer-observer/reports",
  "/customer-observer/certificates", "/customer-observer/settings",
];

export const ROLE_STATIC_ROUTES: Record<string, string[]> = {
  admin: ADMIN_ROUTES,
  instructor: INSTRUCTOR_ROUTES,
  student: STUDENT_ROUTES,
  curator: CURATOR_ROUTES,
  super_curator: SUPER_CURATOR_ROUTES,
  customer_observer: OBSERVER_ROUTES,
};

export const ALL_ROLE_PREFIXES = [
  "/admin", "/instructor", "/student", "/curator",
  "/super-curator", "/customer-observer",
];

export async function loginAs(page: Page, email: string, password: string = PASSWORD) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) {
    await page.goto("/api/auth/signout");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/login**");
  }
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  const loginForm = page.locator("form[data-auth-ready]");
  const submitButton = loginForm.locator('button[type="submit"]');
  await expect(loginForm).toHaveAttribute("data-auth-ready", "true");
  await expect(submitButton).toBeEnabled();
  const navigation = page.waitForURL((url) => url.pathname !== "/login", { timeout: 25_000 })
    .then(() => "navigated" as const)
    .catch(() => "timeout" as const);
  const loginError = loginForm.locator('[role="alert"]').waitFor({ state: "visible", timeout: 25_000 })
    .then(() => "error" as const)
    .catch(() => "timeout" as const);
  await submitButton.click();
  const outcome = await Promise.race([navigation, loginError]);
  if (outcome === "error") {
    const errorText = ((await loginForm.locator('[role="alert"]').textContent().catch(() => null)) ?? "").trim();
    throw new Error(`Login failed for ${email}: ${errorText}`);
  }
  const currentPath = new URL(page.url()).pathname;
  if (currentPath !== "/login") return;
  const buttonText = (await submitButton.textContent().catch(() => null)) ?? "unknown";
  throw new Error(`Login did not complete for ${email}; still on ${page.url()} with submit text: ${buttonText}`);
}

export async function verifyForbidden(page: Page, route: string) {
  const response = await page.goto(route);
  const url = page.url();
  if (!url.includes("/login") && !url.includes("/403")) {
    const status = response?.status() ?? 0;
    const h1 = await page.locator("h1").first().textContent().catch(() => "");
    throw new Error(`Expected 403/login for ${route}, got status ${status} with heading "${h1}"`);
  }
}
