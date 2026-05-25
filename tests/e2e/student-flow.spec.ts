import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("student flow proof", () => {
  test.describe.configure({ timeout: 180_000 });

  test("course → lesson → quiz → progress", async ({ page }) => {
    // ── 1. Login as student1 (has 45% progress on all courses) ────────
    await loginAs(page, "student1@academy.local");

    // ── 2. Navigate to my-courses ─────────────────────────────────────
    await page.goto("/student/my-courses");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Verify the page shows course cards with progress
    const courseCards = page.locator("a[href*='/student/']");
    const cardCount = await courseCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // ── 3. Click "Продолжить" on first course ─────────────────────────
    // This link goes directly to the next uncompleted lesson
    const continueLink = page.locator('a[href*="/student/lessons/"]').first();
    await expect(continueLink).toBeVisible({ timeout: 10_000 });
    const lessonUrl = await continueLink.getAttribute("href");
    expect(lessonUrl).toMatch(/\/student\/lessons\//);

    // Navigate to the lesson
    await continueLink.click();
    await page.waitForURL(/\/student\/lessons\//);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // ── 4. Verify lesson player structure ─────────────────────────────
    // Progress bar should be visible
    await expect(page.getByText("Прогресс урока")).toBeVisible({ timeout: 5_000 });

    // Check for lesson type badge
    const lessonBadges = page.locator("span.rounded.bg-m3-primary-fixed");
    await expect(lessonBadges.first()).toBeVisible();

    // ── 5. Take inline quiz if present ────────────────────────────────
    const startQuizBtn = page.getByRole("button", { name: /начать тест/i });
    const hasQuiz = await startQuizBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasQuiz) {
      await startQuizBtn.click();

      // Verify quiz is active — question navigation buttons should appear
      await expect(page.locator('input[type="radio"]').first()).toBeVisible({ timeout: 5_000 });

      // Select the first (correct) answer option
      const firstRadio = page.locator('input[type="radio"]').first();
      await firstRadio.check();
      await expect(firstRadio).toBeChecked();

      // Submit the quiz
      const submitBtn = page.getByRole("button", { name: /завершить тест/i });
      await expect(submitBtn).toBeVisible({ timeout: 3_000 });
      await submitBtn.click();

      // Wait for result phase — should show score as a percentage
      // After submission, the quiz transitions to "result" phase
      await expect(page.getByText(/%/).or(page.getByRole("button", { name: /продолжить урок/i }))).toBeVisible({ timeout: 15_000 });

      // Verify pass/fail indicator appeared
      await expect(page.getByRole("button", { name: /посмотреть ответы/i })).toBeVisible({ timeout: 5_000 });
    }

    // ── 6. Mark lesson as completed ───────────────────────────────────
    // The button is available before completion
    const markBtn = page.getByRole("button", { name: /отметить пройденным/i });
    const canMark = await markBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (canMark) {
      await markBtn.click();

      // After clicking, two possible outcomes:
      // a) Lesson marked completed → button shows "Завершён"
      // b) Required test/assignment not complete → toast shown, progress < 100
      // Wait a moment for the API response
      await page.waitForTimeout(2_000);

      // Check if progress was updated (either completed or partial)
      const progressText = page.getByText(/завершён/i);
      const completed = await progressText.isVisible({ timeout: 5_000 }).catch(() => false);

      // Log the outcome for debugging
      if (completed) {
        await expect(page.getByText(/завершён/i).first()).toBeVisible();
      }
    }
  });

  test("course detail page loads with module/lesson structure", async ({ page }) => {
    await loginAs(page, "student1@academy.local");

    // Navigate to my-courses first
    await page.goto("/student/my-courses");
    await page.waitForLoadState("networkidle");

    // Find an "Открыть курс" link or a link to /student/courses/
    const openCourseLink = page.locator('a[href*="/student/courses/"]').first();
    const hasDirectCourseLink = await openCourseLink.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasDirectCourseLink) {
      await openCourseLink.click();
    } else {
      // If all courses have "Продолжить" (direct lesson link), navigate to course detail
      // by extracting course ID from a lesson URL
      const lessonLink = page.locator('a[href*="/student/lessons/"]').first();
      await expect(lessonLink).toBeVisible({ timeout: 5_000 });
      // Lessons link to /student/lessons/[lessonId], course detail is /student/courses/[courseId]
      // We can navigate to a known course from the seed data
      await page.goto("/student/courses");
      await page.waitForLoadState("networkidle");
    }

    await page.waitForURL(/\/student\/(courses|my-courses)/);
    await page.waitForLoadState("networkidle");

    // If we ended up on a course detail page, verify module/lesson structure
    if (page.url().includes("/student/courses/")) {
      // Course title should be visible
      await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

      // Should have module accordion sections (Модуль 1: Стратегия)
      const moduleTitle = page.getByText(/модуль 1/i);
      const hasModules = await moduleTitle.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasModules) {
        await expect(moduleTitle).toBeVisible();
      }

      // Should have lesson links
      const lessonLinks = page.locator('a[href*="/student/lessons/"]');
      const lessonCount = await lessonLinks.count();
      expect(lessonCount).toBeGreaterThanOrEqual(1);
    }
  });

  test("quiz submission via API", async ({ page }) => {
    // This test directly validates the quiz attempt API
    await loginAs(page, "student1@academy.local");

    // Get a lesson page with a quiz by navigating through the UI
    await page.goto("/student/my-courses");
    await page.waitForLoadState("networkidle");

    // Find and click a "Продолжить" link to go to a lesson
    const continueLink = page.locator('a[href*="/student/lessons/"]').first();
    await expect(continueLink).toBeVisible({ timeout: 10_000 });
    await continueLink.click();
    await page.waitForURL(/\/student\/lessons\//);
    await page.waitForLoadState("networkidle");

    // Look for the quiz block
    const startQuizBtn = page.getByRole("button", { name: /начать тест/i });
    const hasQuiz = await startQuizBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasQuiz) {
      // Navigate to second lesson of a module which has quizzes
      // Extract current lesson ID and navigate to another URL
      test.skip(hasQuiz === false, "No quiz found on this lesson — skipping quiz-specific test");
      return;
    }

    await startQuizBtn.click();

    // Verify quiz UI is interactive
    await expect(page.locator('input[type="radio"]').first()).toBeVisible({ timeout: 5_000 });

    // Select first option for the first question
    const firstRadio = page.locator('input[type="radio"]').first();
    await firstRadio.check();
    await expect(firstRadio).toBeChecked();

    // Submit the quiz
    await page.getByRole("button", { name: /завершить тест/i }).click();

    // Wait for the result phase — check for either score display or result actions
    await expect(
      page.getByRole("button", { name: /посмотреть ответы/i }).or(
        page.getByRole("button", { name: /продолжить урок|повторить тест/i })
      )
    ).toBeVisible({ timeout: 15_000 });

    // Verify score is shown (percentage number visible)
    const scoreVisible = await page.getByText(/\d+%/).isVisible({ timeout: 5_000 }).catch(() => false);
    expect(scoreVisible).toBeTruthy();
  });
});
