import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("super-curator", () => {
  test.describe.configure({ timeout: 120_000 });

  const FAST_ROUTES = [
    "/super-curator", "/super-curator/cohorts",
    "/super-curator/curators", "/super-curator/distribution",
    "/super-curator/users", "/super-curator/questions",
    "/super-curator/risks", "/super-curator/reports",
    "/super-curator/analytics", "/super-curator/chat",
    "/super-curator/notifications", "/super-curator/settings",
  ];

  test("all static routes load correctly", async ({ page }) => {
    await loginAs(page, "supercurator@academy.local");
    await page.waitForURL("/super-curator");

    for (const route of FAST_ROUTES) {
      await page.goto(route, { timeout: 25_000 });
      await expect(page).toHaveURL(route);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).not.toHaveText("Доступ ограничен");
    }
  });

  test("can access curator dashboard", async ({ page }) => {
    await loginAs(page, "supercurator@academy.local");
    await page.waitForURL("/super-curator");
    await page.goto("/curator");
    await expect(page).toHaveURL("/curator");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("blocked from admin dashboard", async ({ page }) => {
    await loginAs(page, "supercurator@academy.local");
    await page.waitForURL("/super-curator");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login|\/403/);
  });

  test("can manage curators", async ({ page }) => {
    await loginAs(page, "supercurator@academy.local");
    await page.waitForURL("/super-curator");
    await page.goto("/super-curator/curators");
    await expect(page).toHaveURL("/super-curator/curators");
    await expect(page.locator("h1")).toBeVisible();
  });
});
