import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("curator", () => {
  test.describe.configure({ timeout: 120_000 });

  const FAST_ROUTES = [
    "/curator", "/curator/students", "/curator/questions",
    "/curator/assignments", "/curator/risks", "/curator/reports",
    "/curator/chat", "/curator/popups",
    "/curator/glossary", "/curator/notifications",
    "/curator/settings", "/curator/settings/notifications",
  ];

  test("static routes load correctly", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");

    for (const route of FAST_ROUTES) {
      await page.goto(route, { timeout: 25_000 });
      await expect(page).toHaveURL(route);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).not.toHaveText("Доступ ограничен");
    }
  });

  test("analytics page loads (slow query)", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");
    await page.goto("/curator/analytics", { timeout: 60_000 });
    await expect(page).toHaveURL("/curator/analytics");
  });

  test("can view students", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");
    await page.goto("/curator/students");
    await expect(page).toHaveURL("/curator/students");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("can view assignments for review", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");
    await page.goto("/curator/assignments");
    await expect(page).toHaveURL("/curator/assignments");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");
    await page.goto("/curator/settings");
    await expect(page).toHaveURL("/curator/settings");
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("curator — negative path (scope boundaries)", () => {
  test.describe.configure({ timeout: 120_000 });

  const FORBIDDEN_ROUTES = [
    { route: "/admin", label: "admin dashboard" },
    { route: "/instructor", label: "instructor dashboard" },
    { route: "/student", label: "student dashboard" },
    { route: "/super-curator", label: "super-curator dashboard" },
    { route: "/customer-observer", label: "observer dashboard" },
  ];

  for (const { route, label } of FORBIDDEN_ROUTES) {
    test(`blocked from ${label}`, async ({ page }) => {
      await loginAs(page, "curator@academy.local");
      await page.waitForURL("/curator");
      await page.goto(route, { timeout: 25_000 });
      // Should redirect to login, 403, or stay on /curator
      const url = page.url();
      const forbidden = url.includes("/login") || url.includes("/403") || url.includes("/forbidden");
      expect(forbidden).toBeTruthy();
    });
  }

  test("blocked from admin sub-routes", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");

    const adminRoutes = [
      "/admin/users", "/admin/courses", "/admin/roles",
      "/admin/certificates", "/admin/settings",
    ];
    for (const route of adminRoutes) {
      await page.goto(route, { timeout: 25_000 });
      const url = page.url();
      const forbidden = url.includes("/login") || url.includes("/403") || url.includes("/forbidden");
      expect(forbidden).toBeTruthy();
    }
  });

  test("blocked from instructor sub-routes", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.waitForURL("/curator");

    const instructorRoutes = [
      "/instructor/courses", "/instructor/quizzes",
      "/instructor/students", "/instructor/settings",
    ];
    for (const route of instructorRoutes) {
      await page.goto(route, { timeout: 25_000 });
      const url = page.url();
      const forbidden = url.includes("/login") || url.includes("/403") || url.includes("/forbidden");
      expect(forbidden).toBeTruthy();
    }
  });
});
