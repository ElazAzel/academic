import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuizFindMany = vi.hoisted(() => vi.fn());
const mockQuizFindFirst = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    quiz: {
      findMany: mockQuizFindMany,
      findFirst: mockQuizFindFirst,
    },
    courseInstructor: {
      findUnique: mockCourseInstructorFindUnique,
    },
  }),
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/server/modules/progress/service", () => ({
  markLessonProgress: vi.fn(),
}));

const { gradeObjectiveQuiz, getQuizForActor, listQuizzes } = await import("@/server/modules/quizzes/service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("quiz grading", () => {
  it("autogrades objective questions", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } },
        { id: "q2", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: ["b", "c"] } }
      ],
      { q1: "a", q2: ["c", "b"] },
      80
    );
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("fails below threshold", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } }],
      { q1: "b" },
      80
    );
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("applies partial credit for mixed answers", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } },
        { id: "q2", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: ["b", "c"] } }
      ],
      { q1: "a", q2: ["x", "y"] },
      80
    );
    expect(result.earned).toBe(1);
    expect(result.total).toBe(3);
    expect(result.score).toBe(33);
    expect(result.passed).toBe(false);
  });

  it("returns 0 score when total points is zero", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 0, correctAnswer: { value: "a" } },
        { id: "q2", type: "SINGLE_CHOICE", points: 0, correctAnswer: { value: "b" } }
      ],
      { q1: "a", q2: "b" },
      50
    );
    expect(result.earned).toBe(0);
    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("handles legacy index-based correct answers", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { index: 0 }, options: ["a", "b", "c"] }],
      { q1: "a" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("passes when score exactly meets threshold", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 2, correctAnswer: { value: "a" } }],
      { q1: "a" },
      100
    );
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("fails when score is one below threshold", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 2, correctAnswer: { value: "a" } },
        { id: "q2", type: "SINGLE_CHOICE", points: 2, correctAnswer: { value: "b" } }
      ],
      { q1: "a", q2: "x" },
      51
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  it("handles empty answers gracefully", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } }],
      {},
      50
    );
    expect(result.earned).toBe(0);
    expect(result.total).toBe(1);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("ignores answers for non-existent questions", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } }],
      { q1: "a", ghost: "b" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles direct string indexes from inline quiz creator (Format A)", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: "0", options: ["a", "b", "c"] }],
      { q1: "a" },
      100
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles direct number indexes (Format A numeric)", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: 1, options: ["a", "b", "c"] }],
      { q1: "b" },
      100
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles direct arrays of index strings", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: ["0", "2"], options: ["a", "b", "c"] }],
      { q1: ["c", "a"] },
      100
    );
    expect(result.earned).toBe(2);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles direct text correctAnswer for short answer type", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SHORT_ANSWER", points: 1, correctAnswer: "Paris" }],
      { q1: "Paris" },
      100
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });
});

describe("quiz read API shaping", () => {
  it("scopes quiz lists to the actor and never returns answer keys", async () => {
    mockQuizFindMany.mockResolvedValue([
      {
        id: "quiz-1",
        title: "Quiz",
        questions: [
          { id: "q1", prompt: "Question", correctAnswer: { value: "a" }, points: 1 },
        ],
      },
    ]);

    const result = await listQuizzes({ id: "student-1", roles: ["student"] });

    expect(mockQuizFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("correctAnswer");
  });

  it("hides answer keys from enrolled students on quiz detail", async () => {
    mockQuizFindFirst.mockResolvedValue({
      id: "quiz-1",
      courseId: "course-1",
      lesson: null,
      questions: [
        { id: "q1", prompt: "Question", correctAnswer: { value: "a" }, points: 1 },
      ],
    });

    const result = await getQuizForActor({ id: "student-1", roles: ["student"] }, "quiz-1");

    expect(mockQuizFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "quiz-1",
          OR: expect.any(Array),
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("correctAnswer");
  });

  it("keeps answer keys for the assigned instructor", async () => {
    mockQuizFindFirst.mockResolvedValue({
      id: "quiz-1",
      courseId: "course-1",
      lesson: null,
      questions: [
        { id: "q1", prompt: "Question", correctAnswer: { value: "a" }, points: 1 },
      ],
    });
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1" });

    const result = await getQuizForActor({ id: "instructor-1", roles: ["instructor"] }, "quiz-1");

    expect(JSON.stringify(result)).toContain("correctAnswer");
  });
});
