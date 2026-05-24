import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("admin", () => {
  test.describe.configure({ timeout: 120_000 });

  const FAST_ROUTES = [
    "/admin", "/admin/users", "/admin/roles", "/admin/courses",
    "/admin/enrollments", "/admin/cohorts", "/admin/cohorts/new",
    "/admin/invites", "/admin/management", "/admin/reports",
    "/admin/audit", "/admin/certificates", "/admin/settings",
    "/admin/popups", "/admin/glossary", "/admin/notifications",
  ];

  test("all static routes load correctly", async ({ page }) => {
    await loginAs(page, "admin@academy.local");
    await page.waitForURL("/admin");

    for (const route of FAST_ROUTES) {
      await page.goto(route, { timeout: 25_000 });
      await expect(page).toHaveURL(route);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).not.toHaveText("Доступ ограничен");
    }
  });

  test("analytics page loads (slow query)", async ({ page }) => {
    await loginAs(page, "admin@academy.local");
    await page.waitForURL("/admin");
    await page.goto("/admin/analytics", { timeout: 60_000 });
    await expect(page).toHaveURL("/admin/analytics");
  });

  test("blocked from curator dashboard", async ({ page }) => {
    await loginAs(page, "admin@academy.local");
    await page.waitForURL("/admin");
    await page.goto("/curator");
    await expect(page).toHaveURL(/\/login|\/403/);
  });

  test("can navigate to user management", async ({ page }) => {
    await loginAs(page, "admin@academy.local");
    await page.waitForURL("/admin");
    await page.goto("/admin/users");
    await expect(page).toHaveURL("/admin/users");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("can access settings", async ({ page }) => {
    await loginAs(page, "admin@academy.local");
    await page.waitForURL("/admin");
    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("can view audit log", async ({ page }) => {
    await loginAs(page, "admin@academy.local");
    await page.waitForURL("/admin");
    await page.goto("/admin/audit");
    await expect(page).toHaveURL("/admin/audit");
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });
});
