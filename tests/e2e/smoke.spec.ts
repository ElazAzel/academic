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

  test("forgot password page shows contact message", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "Восстановление" })).toBeVisible();
    await expect(page.getByText("admin@aistrategic.kz")).toBeVisible();
  });

  test("reset password page redirects to forgot password", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByText("admin@aistrategic.kz")).toBeVisible();
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("register page shows registration closed", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Регистрация закрыта" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Перейти ко входу" })).toBeVisible();
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
