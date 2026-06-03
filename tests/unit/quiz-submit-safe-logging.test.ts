import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuizFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockTxQueryRaw = vi.hoisted(() => vi.fn());
const mockTxQuizAttemptCount = vi.hoisted(() => vi.fn());
const mockTxQuizAttemptCreate = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockMarkLessonProgress = vi.hoisted(() => vi.fn());
const mockAwardXp = vi.hoisted(() => vi.fn());
const mockCheckAndAward = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    quiz: {
      findUnique: mockQuizFindUnique,
    },
    enrollment: {
      findUnique: mockEnrollmentFindUnique,
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        $queryRaw: mockTxQueryRaw,
        quizAttempt: {
          count: mockTxQuizAttemptCount,
          create: mockTxQuizAttemptCreate,
        },
      }),
    ),
  }),
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/server/modules/progress/service", () => ({
  markLessonProgress: mockMarkLessonProgress,
}));

vi.mock("@/server/actions/xp", () => ({
  awardXp: mockAwardXp,
}));

vi.mock("@/server/modules/gamification/achievements", () => ({
  checkAndAward: mockCheckAndAward,
}));

const { submitQuizAttempt } = await import("@/server/modules/quizzes/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockQuizFindUnique.mockResolvedValue({
    id: "quiz-1",
    courseId: "course-1",
    lessonId: "lesson-1",
    lesson: null,
    maxAttempts: 3,
    passThreshold: 80,
    questions: [
      {
        id: "question-1",
        type: "SINGLE_CHOICE",
        points: 1,
        correctAnswer: { value: "a" },
        options: ["a", "b"],
      },
    ],
  });
  mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
  mockTxQueryRaw.mockResolvedValue(undefined);
  mockTxQuizAttemptCount.mockResolvedValue(0);
  mockTxQuizAttemptCreate.mockResolvedValue({
    id: "attempt-1",
    quizId: "quiz-1",
    userId: "student-1",
    answers: { "question-1": "a" },
    score: 100,
    passed: true,
    submittedAt: new Date("2026-06-03T00:00:00.000Z"),
  });
  mockLogAudit.mockResolvedValue(undefined);
  mockMarkLessonProgress.mockResolvedValue(undefined);
  mockAwardXp.mockResolvedValue({ xp: 130, earned: 30 });
  mockCheckAndAward.mockResolvedValue([]);
});

describe("submitQuizAttempt safe gamification logging", () => {
  it("does not leak raw XP or achievement failures after a successful attempt", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockAwardXp.mockRejectedValueOnce(new Error("postgres://secret-quiz-xp"));
    mockCheckAndAward.mockRejectedValueOnce(new Error("postgres://secret-quiz-achievement"));

    try {
      const result = await submitQuizAttempt("quiz-1", "student-1", { "question-1": "a" });

      expect(result.id).toBe("attempt-1");
      expect(result.grading.passed).toBe(true);
      expect(result.xp).toBeNull();
      expect(mockMarkLessonProgress).toHaveBeenCalledWith("student-1", "lesson-1", 100);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-quiz-xp");
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-quiz-achievement");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[submitQuizAttempt] Failed to award XP",
        expect.objectContaining({ errorType: "Error" }),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[submitQuizAttempt] Failed to check achievements",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
