import { expect, test, type Page, request } from "@playwright/test";

const SEED_PASSWORD = "Password123!";
const BASE_URL = "http://127.0.0.1:3000";

test.beforeAll(async () => {
  const ctx = await request.newContext();
  for (let i = 0; i < 30; i++) {
    const res = await ctx.get(`${BASE_URL}/api/healthz`).catch(() => null);
    if (res?.ok()) return;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("App not healthy within 30s — start the dev server first (npm run dev)");
});

async function loginAs(page: Page, email: string, password: string = SEED_PASSWORD) {
  await page.goto("/login", { waitUntil: "load" });
  await expect(page.locator('form[data-auth-ready="true"]')).toBeVisible();
  await page.getByLabel("Логин / Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();

  const TIMEOUT = 30_000;
  const navigationPromise = page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: TIMEOUT });
  const errorPromise = page.locator('[role="alert"]').waitFor({ timeout: TIMEOUT });

  try {
    await Promise.race([
      navigationPromise.then(() => "success"),
      errorPromise.then(() => "error"),
    ]);
  } catch {
    throw new Error(`Login timeout for ${email}: page stayed at ${page.url()} for ${TIMEOUT}ms. Check if the app is running and DB is seeded.`);
  }

  // Check if an error alert is currently visible
  await page.waitForTimeout(1000); // Give small time for error to appear if validation failed immediately
  const isErrorVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);
  const isCurrentUrlLogin = page.url().includes("/login");
  if (isErrorVisible && isCurrentUrlLogin) {
    const errorText = await page.locator('[role="alert"]').textContent().catch(() => "unknown");
    throw new Error(`Login failed for ${email}: ${errorText}. Run: npm run users:create`);
  }
}

const ROLE_USERS = [
  { role: "admin", email: "admin@academy.local", path: "/admin" },
  { role: "instructor", email: "instructor1@academy.local", path: "/instructor" },
  { role: "student", email: "student1@academy.local", path: "/student" },
  { role: "curator", email: "curator@academy.local", path: "/curator" },
  { role: "super_curator", email: "supercurator@academy.local", path: "/super-curator" },
  { role: "customer_observer", email: "observer@academy.local", path: "/customer-observer" },
];

test.describe("role login smoke", () => {
  for (const { role, email, path } of ROLE_USERS) {
    test(`${role} can login and load ${path}`, async ({ page }) => {
      await loginAs(page, email);
      await page.goto(path);
      // Dashboard should load with some heading text
      await expect(page.getByRole("heading").first()).toBeVisible();
      // Verify we're not on login page
      await expect(page).not.toHaveURL(/\/login/);
    });
  }
});

test.describe("scope boundary", () => {
  test("student cannot access admin dashboard", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.goto("/admin");
    // Should redirect to login or 403
    await expect(page).toHaveURL(/\/(login|403)/);
  });

  test("student cannot access instructor dashboard", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.goto("/instructor");
    await expect(page).toHaveURL(/\/(login|403)/);
  });

  test("curator cannot access admin dashboard", async ({ page }) => {
    await loginAs(page, "curator@academy.local");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/(login|403)/);
  });

  test("instructor cannot access admin dashboard", async ({ page }) => {
    await loginAs(page, "instructor1@academy.local");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/(login|403)/);
  });

  test("observer cannot access student dashboard", async ({ page }) => {
    await loginAs(page, "observer@academy.local");
    await page.goto("/student");
    await expect(page).toHaveURL(/\/(login|403)/);
  });
});

test.describe("student happy path", () => {
  test("student can view my-courses and a course page", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    // My courses
    await page.goto("/student/my-courses");
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Try to open a course (seed creates one)
    const courseLink = page.getByRole("link").filter({ hasText: /курс/i }).first();
    if (await courseLink.isVisible().catch(() => false)) {
      await courseLink.click();
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("student settings page loads", async ({ page }) => {
    await loginAs(page, "student1@academy.local");
    await page.goto("/student/settings");
    await expect(page.getByText("Профиль и настройки")).toBeVisible();
  });
});
