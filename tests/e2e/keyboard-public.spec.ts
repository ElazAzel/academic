import { expect, test, type Page } from "@playwright/test";

async function tabUntilFocused(page: Page, selector: string, maxTabs = 12) {
  const target = page.locator(selector).first();
  for (let i = 0; i < maxTabs; i++) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) {
      return target;
    }
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
  return target;
}

async function expectFocusedElementUsable(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body || active === document.documentElement) return false;
    if (active.closest("[aria-hidden='true']")) return false;

    const style = window.getComputedStyle(active);
    if (style.display === "none" || style.visibility === "hidden") return false;

    const rect = active.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right >= 0 &&
      rect.bottom >= 0 &&
      rect.left <= window.innerWidth &&
      rect.top <= window.innerHeight
    );
  })).toBe(true);
}

test.describe("public keyboard accessibility", () => {
  test.describe.configure({ timeout: 60_000 });

  test("skip link moves keyboard focus to the main content", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const skipLink = page.locator('a[href="#main-content"]');
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expectFocusedElementUsable(page);

    await page.keyboard.press("Enter");

    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("login form primary controls are reachable in keyboard order", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const orderedControls = [
      'input[name="email"]',
      'a[href="/forgot-password"]',
      'input[name="password"]',
      'button[type="submit"]',
    ];

    for (const selector of orderedControls) {
      await tabUntilFocused(page, selector);
      await expectFocusedElementUsable(page);
      await page.keyboard.press("Tab");
    }
  });

  test("closed registration path is keyboard reachable and returns to login", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });

    const loginLink = await tabUntilFocused(page, 'a[href="/login"]', 14);
    await expect(loginLink).toHaveText("Перейти ко входу");
    await expectFocusedElementUsable(page);

    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "AI Strategic Academy" })).toBeVisible();
  });
});
