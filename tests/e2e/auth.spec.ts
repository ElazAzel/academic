import { test, expect, type Page } from "@playwright/test";
import { loginAs, PASSWORD, ROLE_USERS } from "./helpers";

function loginSubmitButton(page: Page) {
  return page.locator('form button[type="submit"]:not([disabled])');
}

test.describe("authentication", () => {
  test.describe.configure({ timeout: 60_000 });

  test("login with invalid password shows error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', "student1@academy.local");
    await page.fill('input[name="password"]', "WrongPassword!");
    const submitButton = loginSubmitButton(page);
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await submitButton.click();
    await expect(page.getByText("Неверный логин или пароль")).toBeVisible({ timeout: 15_000 });
  });

  test("login with non-existent email shows error", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', "nonexistent@academy.local");
    await page.fill('input[name="password"]', PASSWORD);
    const submitButton = loginSubmitButton(page);
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await submitButton.click();
    await expect(page.getByText("Неверный логин или пароль")).toBeVisible({ timeout: 15_000 });
  });

  test("login with empty fields does not submit", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const submitButton = loginSubmitButton(page);
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await submitButton.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout clears session", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await page.context().clearCookies();
    await page.goto("/student");
    await expect(page).toHaveURL(/\/login/);
  });

  test("session persists across navigation", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");
    await page.goto("/student/my-courses");
    await expect(page).toHaveURL("/student/my-courses");
    await page.goto("/student/settings");
    await expect(page).toHaveURL("/student/settings");
  });

  for (const { role, email, homePath } of ROLE_USERS) {
    test(`${role} logs in and reaches ${homePath}`, async ({ page }) => {
      await loginAs(page, email);
      await page.waitForURL(homePath, { timeout: 10_000 });
      await expect(page).toHaveURL(homePath);
    });
  }
});
