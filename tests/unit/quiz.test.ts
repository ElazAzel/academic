import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuizFindMany = vi.hoisted(() => vi.fn());
const mockQuizFindFirst = vi.hoisted(() => vi.fn());
const mockQuizFindUnique = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockQuizQuestionFindMany = vi.hoisted(() => vi.fn());
const mockQuizQuestionAggregate = vi.hoisted(() => vi.fn());
const mockQuizQuestionCreate = vi.hoisted(() => vi.fn());
const mockPrismaTransaction = vi.hoisted(() => vi.fn());
const mockAssertInstructorOfCourse = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    quiz: {
      findMany: mockQuizFindMany,
      findFirst: mockQuizFindFirst,
      findUnique: mockQuizFindUnique,
    },
    quizQuestion: {
      findMany: mockQuizQuestionFindMany,
      aggregate: mockQuizQuestionAggregate,
      create: mockQuizQuestionCreate,
    },
    courseInstructor: {
      findUnique: mockCourseInstructorFindUnique,
    },
    $transaction: mockPrismaTransaction,
  }),
}));

vi.mock("@/server/modules/course-builder/service", () => ({
  assertInstructorOfCourse: mockAssertInstructorOfCourse,
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/server/modules/progress/service", () => ({
  markLessonProgress: vi.fn(),
}));

const { gradeObjectiveQuiz, getQuizForActor, importQuestions, listQuizzes } = await import("@/server/modules/quizzes/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertInstructorOfCourse.mockResolvedValue(undefined);
  mockQuizQuestionAggregate.mockResolvedValue({ _max: { order: 0 } });
  mockQuizQuestionCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ ...data }));
  mockPrismaTransaction.mockImplementation((operations: Array<Promise<unknown>>) => Promise.all(operations));
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
      [{ id: "q1", type: "TEXT", points: 1, correctAnswer: "Paris" }],
      { q1: "Paris" },
      100
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles object options with id/label — student sends index", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: 0,
        options: [{ id: "paris", label: "Paris" }, { id: "london", label: "London" }]
      }],
      { q1: 0 },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles object options with id/label — student sends label", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: 0,
        options: [{ id: "paris", label: "Paris" }, { id: "london", label: "London" }]
      }],
      { q1: "Paris" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles object options with id/label — student sends id", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: 0,
        options: [{ id: "paris", label: "Paris" }, { id: "london", label: "London" }]
      }],
      { q1: "paris" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles object options with {index} correctAnswer format", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { index: 0 },
        options: [{ id: "paris", label: "Paris" }, { id: "london", label: "London" }]
      }],
      { q1: "Paris" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles object options — student sends wrong index", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: 0,
        options: [{ id: "paris", label: "Paris" }, { id: "london", label: "London" }]
      }],
      { q1: 1 },
      50
    );
    expect(result.earned).toBe(0);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("handles object options multi-choice — student sends labels", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: [0, 1] },
        options: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }]
      }],
      { q1: ["A", "B"] },
      50
    );
    expect(result.earned).toBe(2);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("handles object options multi-choice — student sends ids", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: ["a", "b"] },
        options: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }]
      }],
      { q1: ["b", "a"] },
      50
    );
    expect(result.earned).toBe(2);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("rejects wrong multi-choice answer", () => {
    const result = gradeObjectiveQuiz(
      [{
        id: "q1", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: [0, 1] },
        options: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }]
      }],
      { q1: ["A", "C"] },
      50
    );
    expect(result.earned).toBe(0);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
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

describe("quiz question import scope", () => {
  it("resolves lesson-level quiz course and imports questions from that course only", async () => {
    mockQuizFindUnique.mockResolvedValue({
      id: "target-quiz",
      courseId: null,
      course: null,
      lesson: { module: { courseId: "course-1" } },
    });
    mockQuizQuestionFindMany.mockResolvedValue([
      {
        id: "source-question",
        type: "SINGLE_CHOICE",
        prompt: "Question",
        options: ["a", "b"],
        correctAnswer: { value: "a" },
        points: 2,
      },
    ]);
    mockQuizQuestionAggregate.mockResolvedValue({ _max: { order: 2 } });

    const result = await importQuestions("target-quiz", ["source-question"], "instructor-1");

    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockQuizQuestionFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["source-question"] },
        quiz: {
          OR: [
            { courseId: "course-1" },
            { lesson: { module: { courseId: "course-1" } } },
          ],
        },
      },
    });
    expect(mockQuizQuestionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quizId: "target-quiz",
          prompt: "Question",
          order: 3,
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });

  it("does not import source questions outside the target course scope", async () => {
    mockQuizFindUnique.mockResolvedValue({
      id: "target-quiz",
      courseId: "course-1",
      course: { id: "course-1" },
      lesson: null,
    });
    mockQuizQuestionFindMany.mockResolvedValue([]);

    await expect(importQuestions("target-quiz", ["foreign-question"], "instructor-1")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });

    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockQuizQuestionCreate).not.toHaveBeenCalled();
    expect(mockPrismaTransaction).not.toHaveBeenCalled();
  });
});
