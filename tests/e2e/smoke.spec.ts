import { expect, test } from "@playwright/test";

test("loads login page from root", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Вход в академию" })).toBeVisible();
  await expect(page.getByText("Забыли пароль?")).toBeVisible();
});

test("shows login form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

