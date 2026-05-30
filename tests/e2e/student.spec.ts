import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("student", () => {
  test.describe.configure({ timeout: 120_000 });

  const FAST_ROUTES = [
    "/student", "/student/my-courses", "/student/quizzes",
    "/student/assignments",
    "/student/certificates", "/student/notifications",
    "/student/settings", "/student/settings/notifications",
  ];

  test("all static routes load correctly", async ({ page }) => {
    page.on("console", (msg) => console.log(`[PAGE LOG ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err));

    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");

    for (const route of FAST_ROUTES) {
      await page.goto(route, { timeout: 25_000 });
      await expect(page).toHaveURL(route);
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible({ timeout: 25_000 });
      await expect(h1).not.toHaveText("Доступ ограничен");
    }
  });

  test("dashboard shows learning sections", async ({ page }) => {
    page.on("console", (msg) => console.log(`[PAGE LOG ${msg.type()}]:`, msg.text()));
    page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err));

    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 25_000 });
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 15_000 });
  });

  test("my-courses page loads", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await page.goto("/student/my-courses");
    await expect(page).toHaveURL("/student/my-courses");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 25_000 });
  });

  test("settings page loads", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await page.goto("/student/settings");
    await expect(page).toHaveURL("/student/settings");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 25_000 });
  });

  test("notification preferences loads", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await page.goto("/student/settings/notifications");
    await expect(page).toHaveURL("/student/settings/notifications");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 25_000 });
  });

  test("certificates page loads", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await page.goto("/student/certificates");
    await expect(page).toHaveURL("/student/certificates");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 25_000 });
  });
});
