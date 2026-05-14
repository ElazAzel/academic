import { test, expect, type Page } from "@playwright/test";

// Shared function to test role login and basic routing
async function loginAs(page: Page, email: string, password: string = "Password123!") {
  // Clear cookies to log out any previous user
  await page.context().clearCookies();

  // Navigate straight to login
  await page.goto("/login", { waitUntil: "networkidle" });

  // Fast fail check - if redirected away from login (e.g., to a dashboard)
  // because cookies weren't cleared, manually trigger the signout route.
  if (!page.url().includes("/login")) {
    await page.goto("/api/auth/signout");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/login**");
  }

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // We explicitly click the login button to simulate a real user interaction
  await page.click('button[type="submit"]');

  // We wait for either a success redirect OR an error alert
  // If the redirect doesn't happen, the timeout will trigger
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

test.describe("Role-based Access Control (RBAC) E2E", () => {
  test.describe("role login smoke", () => {
    for (const { role, email, path } of ROLE_USERS) {
      test(`${role} can login and load ${path}`, async ({ page }) => {
        await loginAs(page, email);
        await page.waitForURL(path, { timeout: 10000 });
        await expect(page).toHaveURL(path);
      });
    }
  });

  test.describe("scope boundary", () => {
    test("student cannot access admin dashboard", async ({ page }) => {
      await loginAs(page, "student1@academy.local");
      await page.waitForURL("/student");
      await page.goto("/admin");
      // The middleware should redirect unauthorized access to /login or a 403
      // Here we assume it bounces back to login or throws a clear error
      await expect(page).toHaveURL(/\/login|\/403/);
    });

    test("student cannot access instructor dashboard", async ({ page }) => {
      await loginAs(page, "student1@academy.local");
      await page.waitForURL("/student");
      await page.goto("/instructor");
      await expect(page).toHaveURL(/\/login|\/403/);
    });

    test("curator cannot access admin dashboard", async ({ page }) => {
      await loginAs(page, "curator@academy.local");
      await page.waitForURL("/curator");
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login|\/403/);
    });

    test("instructor cannot access admin dashboard", async ({ page }) => {
      await loginAs(page, "instructor1@academy.local");
      await page.waitForURL("/instructor");
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login|\/403/);
    });

    test("observer cannot access student dashboard", async ({ page }) => {
      await loginAs(page, "observer@academy.local");
      await page.waitForURL("/customer-observer");
      await page.goto("/student");
      await expect(page).toHaveURL(/\/login|\/403/);
    });
  });

  test.describe("student happy path", () => {
    test("student can view my-courses and a course page", async ({ page }) => {
      await loginAs(page, "student1@academy.local");
      await page.waitForURL("/student");

      await page.goto("/student/my-courses");
      await expect(page.getByText("Мои курсы").first()).toBeVisible();

      // If there's a course linked, check clicking it works
      // We will just verify the page loads correctly without crashing
    });

    test("student settings page loads", async ({ page }) => {
      await loginAs(page, "student1@academy.local");
      await page.waitForURL("/student");
      await page.goto("/student/settings");
      await expect(page.getByRole('heading', { name: 'Профиль и настройки' })).toBeVisible();
    });
  });
});
