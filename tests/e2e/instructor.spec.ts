import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("instructor", () => {
  test.describe.configure({ timeout: 120_000 });

  const FAST_ROUTES = [
    "/instructor", "/instructor/courses", "/instructor/courses/new",
    "/instructor/quizzes", "/instructor/assignments",
    "/instructor/questions", "/instructor/students",
    "/instructor/reports", "/instructor/attendance",
    "/instructor/deadlines", "/instructor/chat",
    "/instructor/notifications", "/instructor/settings",
  ];

  test("static routes load correctly", async ({ page }) => {
    await loginAs(page, "instructor1@academy.local");
    await page.waitForURL("/instructor");

    for (const route of FAST_ROUTES) {
      await page.goto(route, { timeout: 25_000 });
      await expect(page).toHaveURL(route);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();
      await expect(h1).not.toHaveText("Доступ ограничен");
    }
  });

  test("analytics page loads (slow query)", async ({ page }) => {
    await loginAs(page, "instructor1@academy.local");
    await page.waitForURL("/instructor");
    await page.goto("/instructor/analytics", { timeout: 60_000 });
    await expect(page).toHaveURL("/instructor/analytics");
  });

  test("can view courses list", async ({ page }) => {
    await loginAs(page, "instructor1@academy.local");
    await page.waitForURL("/instructor");
    await page.goto("/instructor/courses");
    await expect(page).toHaveURL("/instructor/courses");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("can view quiz constructor", async ({ page }) => {
    await loginAs(page, "instructor1@academy.local");
    await page.waitForURL("/instructor");
    await page.goto("/instructor/quizzes");
    await expect(page).toHaveURL("/instructor/quizzes");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("can view students", async ({ page }) => {
    await loginAs(page, "instructor1@academy.local");
    await page.waitForURL("/instructor");
    await page.goto("/instructor/students");
    await expect(page).toHaveURL("/instructor/students");
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
