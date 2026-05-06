import { expect, test } from "@playwright/test";

test("loads public landing and student dashboard scaffold", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI Strategic Academy" })).toBeVisible();
  await page.getByRole("link", { name: "Посмотреть кабинет" }).click();
  await expect(page.getByRole("heading", { name: "Дашборд слушателя" })).toBeVisible();
});

test("shows login form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

