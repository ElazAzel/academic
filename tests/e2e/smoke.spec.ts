import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("loads login page from root", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Вход в академию" })).toBeVisible();
    await expect(page.getByText("Забыли пароль?")).toBeVisible();
  });

  test("login page shows form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "Восстановление" })).toBeVisible();
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("register redirects to login", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Вход в академию" })).toBeVisible();
  });
});

test.describe("role pages redirect to login when unauthenticated", () => {
  const rolePaths = [
    "/admin",
    "/student",
    "/curator",
    "/instructor",
    "/super-curator",
    "/customer-observer",
  ];

  for (const path of rolePaths) {
    test(`redirects ${path} to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
