import { expect, test, type Page } from "@playwright/test";

const SEED_PASSWORD = "Password123!";

async function loginAs(page: Page, email: string, password: string = SEED_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Логин / Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();

  // The login form uses client-side navigation (router.replace) after a fetch to /api/auth/callback.
  // Wait for the URL to change away from /login, but also watch for the error alert.
  const result = await Promise.race([
    page.waitForURL((url: URL) => !url.pathname.includes("/login"), { timeout: 15_000 }).then(() => "success"),
    page.locator('[role="alert"]').waitFor({ timeout: 15_000 }).then(() => "error"),
  ]);

  if (result === "error") {
    const errorText = await page.locator('[role="alert"]').textContent().catch(() => "unknown");
    throw new Error(`Login failed for ${email}: ${errorText}. Ensure DB is seeded (npm run users:create).`);
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
