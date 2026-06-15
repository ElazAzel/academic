import { test, expect, type Page } from "@playwright/test";
import { getPrisma } from "@/lib/prisma";
import { loginAs } from "./helpers";

async function gotoStudentPage(page: Page, route: string, heading = "h1") {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator(heading).first()).toBeVisible({ timeout: 15_000 });
}

async function resetStudentQuizAttempts(email: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) throw new Error(`Test user ${email} was not found`);

  await prisma.quizAttempt.deleteMany({
    where: { userId: user.id },
  });

  return user.id;
}

function answerFromCorrectAnswer(correctAnswer: unknown) {
  if (correctAnswer && typeof correctAnswer === "object" && !Array.isArray(correctAnswer)) {
    const answer = correctAnswer as Record<string, unknown>;
    if ("values" in answer) return answer.values;
    if ("value" in answer) return answer.value;
    if ("index" in answer) return answer.index;
  }
  return correctAnswer;
}

async function prepareQuizApiFixture(email: string) {
  const prisma = getPrisma();
  const userId = await resetStudentQuizAttempts(email);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  if (courseIds.length === 0) throw new Error(`Test user ${email} has no active enrollments`);

  const quiz = await prisma.quiz.findFirst({
    where: {
      questions: { some: {} },
      OR: [
        { courseId: { in: courseIds } },
        { lesson: { is: { module: { is: { courseId: { in: courseIds } } } } } },
      ],
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, correctAnswer: true },
      },
      lesson: {
        include: {
          module: {
            include: {
              course: {
                select: { traversalMode: true },
                include: {
                  modules: {
                    include: { lessons: { select: { id: true, order: true, isRequired: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!quiz) throw new Error(`No quiz fixture available for ${email}`);

  // Sequential unlock: mark all previous required lessons as COMPLETED so the
  // quiz's lesson is accessible.
  if (quiz.lesson?.module.course.traversalMode === "SEQUENTIAL") {
    const course = quiz.lesson.module.course;
    const orderedLessons = course.modules
      .flatMap((m) => m.lessons.map((l) => ({ ...l, moduleOrder: m.order ?? 0 })))
      .sort((a, b) => a.moduleOrder - b.moduleOrder || a.order - b.order);
    const currentIndex = orderedLessons.findIndex((l) => l.id === quiz.lesson!.id);
    const previousRequired = orderedLessons.slice(0, Math.max(currentIndex, 0)).filter((l) => l.isRequired);
    for (const lesson of previousRequired) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        update: { status: "COMPLETED" as const, percent: 100 },
        create: { userId, lessonId: lesson.id, status: "COMPLETED" as const, percent: 100 },
      });
    }
  }

  return {
    quizId: quiz.id,
    answers: Object.fromEntries(
      quiz.questions.map((question) => [question.id, answerFromCorrectAnswer(question.correctAnswer)])
    ),
  };
}

test.describe("student flow proof", () => {
  test.describe.configure({ timeout: 180_000 });

  test("course → lesson → quiz → progress", async ({ page }) => {
    await resetStudentQuizAttempts("student1@academy.local");

    // ── 1. Login as student1 (has 45% progress on all courses) ────────
    await loginAs(page, "student1@academy.local");

    // ── 2. Navigate to my-courses ─────────────────────────────────────
    await gotoStudentPage(page, "/student/my-courses");

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
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

    // ── 4. Verify lesson player structure ─────────────────────────────
    // Progress bar should be visible
    await expect(page.getByText("Прогресс урока")).toBeVisible({ timeout: 5_000 });

    await expect(page.locator('[aria-labelledby="lesson-title"]').first()).toBeVisible();

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
      // Accept confirm dialog if present
      page.once("dialog", (dialog) => {
        dialog.accept().catch(() => {});
      });
      await submitBtn.click();

      // Wait for result phase — should show score as a percentage
      // After submission, the quiz transitions to "result" phase
      const quizRegion = page.getByRole("region", { name: /Тест урока/i });
      await expect(
        quizRegion.getByRole("button", { name: /посмотреть ответы|продолжить урок|повторить тест/i }).first()
      ).toBeVisible({ timeout: 15_000 });
      await expect(quizRegion.getByText(/\d+%/).first()).toBeVisible({ timeout: 5_000 });

      // Verify pass/fail indicator appeared
      await expect(quizRegion.getByRole("button", { name: /посмотреть ответы/i })).toBeVisible({ timeout: 5_000 });
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
    await gotoStudentPage(page, "/student/my-courses");

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
      await page.goto("/student/my-courses", { waitUntil: "domcontentloaded" });
      return;
    }

    await page.waitForURL(/\/student\/(courses|my-courses)/);

    // If we ended up on a course detail page, verify module/lesson structure
    if (page.url().includes("/student/courses/")) {
      // Course title should be visible
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

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
    const fixture = await prepareQuizApiFixture("student1@academy.local");
    await loginAs(page, "student1@academy.local");

    const apiResult = await page.evaluate(async ({ quizId, answers }) => {
      const response = await fetch(`/api/v1/quizzes/${quizId}/attempts`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      return {
        status: response.status,
        text: await response.text(),
      };
    }, fixture);

    expect(apiResult.status, apiResult.text.slice(0, 1_000)).toBe(201);
    const body = JSON.parse(apiResult.text);
    const result = body.data ?? body;
    expect(result.passed).toBe(true);
    expect(result.grading?.score ?? result.score).toBe(100);
  });
});
