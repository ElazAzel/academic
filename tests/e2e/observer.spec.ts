import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("customer-observer", () => {
  test.describe.configure({ timeout: 60_000 });

  const FAST_ROUTES = [
    "/customer-observer", "/customer-observer/reports",
    "/customer-observer/certificates",
  ];

  test("static routes load correctly", async ({ page }) => {
    await loginAs(page, "observer@academy.local");
    await page.waitForURL("/customer-observer");

    for (const route of FAST_ROUTES) {
      await page.goto(route, { timeout: 25_000 });
      await expect(page).toHaveURL(route);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).not.toHaveText("Доступ ограничен");
    }
  });

  test("settings page loads", async ({ page }) => {
    await loginAs(page, "observer@academy.local");
    await page.waitForURL("/customer-observer");
    await page.goto("/customer-observer/settings", { timeout: 45_000 });
    await expect(page).toHaveURL("/customer-observer/settings");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("can view reports", async ({ page }) => {
    await loginAs(page, "observer@academy.local");
    await page.waitForURL("/customer-observer");
    await page.goto("/customer-observer/reports");
    await expect(page).toHaveURL("/customer-observer/reports");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("blocked from student dashboard", async ({ page }) => {
    await loginAs(page, "observer@academy.local");
    await page.waitForURL("/customer-observer");
    await page.goto("/student");
    await expect(page).toHaveURL(/\/login|\/403/);
  });

  test("blocked from admin dashboard", async ({ page }) => {
    await loginAs(page, "observer@academy.local");
    await page.waitForURL("/customer-observer");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login|\/403/);
  });
});
