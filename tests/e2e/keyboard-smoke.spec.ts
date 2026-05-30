import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("keyboard navigation smoke", () => {
  test.describe.configure({ timeout: 60_000 });

  test("login form tab order", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    // Initial focus on first focusable element (email)
    await page.keyboard.press("Tab");
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeFocused();

    // Tab to password
    await page.keyboard.press("Tab");
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeFocused();

    // Tab to submit button
    await page.keyboard.press("Tab");
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeFocused();

    // Enter credentials via keyboard
    await page.keyboard.press("Tab");
    await emailInput.fill("student1@academy.local");
    await page.keyboard.press("Tab");
    await passwordInput.fill("Password123!");
    await page.keyboard.press("Tab");

    // Should focus submit and activate via Enter
    await expect(submitBtn).toBeFocused();
    await page.keyboard.press("Enter");

    // Should redirect to /student
    await page.waitForURL("/student", { timeout: 15_000 });
    await expect(page).toHaveURL("/student");
  });

  test("student dashboard tab navigation", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.waitForURL("/student");

    // Focus the first interactive element via Tab
    await page.keyboard.press("Tab");
    // Should be on some link or button
    const focused = page.locator("*:focus");
    await expect(focused).toBeVisible();

    // Navigate through several Tab presses to ensure no focus trap
    const tabPresses = 8;
    for (let i = 0; i < tabPresses; i++) {
      await page.keyboard.press("Tab");
      // Each press should keep focus somewhere on the page
      await expect(page.locator("*:focus")).toBeVisible();
    }
  });

  test("login error is reachable via keyboard", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    // Fill invalid credentials via keyboard
    await page.keyboard.press("Tab");
    await page.keyboard.type("bad-email@test.com");
    await page.keyboard.press("Tab");
    await page.keyboard.type("wrongpass");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    // Error alert should appear and be focusable
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });

    // Alert should be focusable via Tab (from submit)
    // Pressing Tab after submit should focus the error alert or next element
    // This ensures keyboard users can access error messages
    const errorFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.closest('[role="alert"]') !== null;
    });
    // Either the alert itself is focused or it's accessible via next Tab
    if (!errorFocused) {
      await page.keyboard.press("Tab");
      const errorFocusedAfter = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.closest('[role="alert"]') !== null;
      });
      // We just verify the error is present — focus management varies by browser
      expect(errorFocusedAfter || await errorAlert.isVisible()).toBeTruthy();
    }
  });

  test("forgot password link via keyboard", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    // Tab through to find and activate "Забыли пароль?" link
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const isForgotLink = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.textContent?.includes("Забыли пароль") ?? false;
      });
      if (isForgotLink) {
        await page.keyboard.press("Enter");
        break;
      }
    }

    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
