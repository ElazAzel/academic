import { test, expect } from "@playwright/test";
import { loginAs, ROLE_USERS, ALL_ROLE_PREFIXES } from "./helpers";

test.describe("role-based access control", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const { role, email, homePath, allowedPrefixes } of ROLE_USERS) {
    test(`${role} blocked from forbidden routes`, async ({ page }) => {
      await loginAs(page, email);
      await page.waitForURL(homePath);

      const forbiddenPrefixes = ALL_ROLE_PREFIXES.filter(
        (p) => !allowedPrefixes.some((a) => p.startsWith(a))
      );

      for (const prefix of forbiddenPrefixes) {
        await page.goto(prefix + "/");
        await expect(page).toHaveURL(/\/login|\/403/);
      }
    });
  }

  test("all 6 roles have distinct home URLs", async () => {
    const homes = ROLE_USERS.map((u) => u.homePath);
    expect(new Set(homes).size).toBe(6);
  });

  test("unauthenticated user redirected from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user redirected from /student", async ({ page }) => {
    await page.goto("/student");
    await expect(page).toHaveURL(/\/login/);
  });
});
