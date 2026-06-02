import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockAssertInstructorOfCourse = vi.hoisted(() => vi.fn());
const mockQuizFindUnique = vi.hoisted(() => vi.fn());
const mockQuizQuestionCount = vi.hoisted(() => vi.fn());
const mockQuizQuestionCreate = vi.hoisted(() => vi.fn());
const mockQuizQuestionFindFirst = vi.hoisted(() => vi.fn());
const mockQuizQuestionUpdate = vi.hoisted(() => vi.fn());
const mockQuizQuestionDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/courses/service", () => ({ assertInstructorOfCourse: mockAssertInstructorOfCourse }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    quiz: {
      findUnique: mockQuizFindUnique,
    },
    quizQuestion: {
      count: mockQuizQuestionCount,
      create: mockQuizQuestionCreate,
      findFirst: mockQuizQuestionFindFirst,
      update: mockQuizQuestionUpdate,
      delete: mockQuizQuestionDelete,
    },
  }),
}));

const questionsRoute = await import("@/app/api/v1/quizzes/[quizId]/questions/route");
const questionRoute = await import("@/app/api/v1/quizzes/[quizId]/questions/[questionId]/route");

function jsonRequest(method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  return new Request("http://localhost/api/v1/quizzes/quiz-1/questions/question-1", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function questionsContext(quizId = "quiz-1") {
  return { params: Promise.resolve({ quizId }) };
}

function questionContext(quizId = "quiz-1", questionId = "question-1") {
  return { params: Promise.resolve({ quizId, questionId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
  mockAssertInstructorOfCourse.mockResolvedValue(undefined);
  mockQuizQuestionCount.mockResolvedValue(0);
  mockQuizQuestionCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "question-1", ...data }),
  );
  mockQuizQuestionUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "question-1", ...data }),
  );
  mockQuizQuestionDelete.mockResolvedValue({ id: "question-1" });
});

describe("quiz question mutation routes", () => {
  it("resolves lesson-level quiz course before creating a question", async () => {
    mockQuizFindUnique.mockResolvedValue({
      id: "quiz-1",
      courseId: null,
      lesson: { module: { courseId: "course-1" } },
    });

    const response = await questionsRoute.POST(
      jsonRequest("POST", {
        prompt: "Question",
        type: "SINGLE_CHOICE",
        points: 1,
        options: ["a", "b"],
        correctAnswer: { value: "a" },
      }),
      questionsContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("question-1");
    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockQuizQuestionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quizId: "quiz-1", order: 0 }),
      }),
    );
  });

  it("does not create a question when instructor course scope is denied", async () => {
    mockQuizFindUnique.mockResolvedValue({
      id: "quiz-1",
      courseId: null,
      lesson: { module: { courseId: "course-1" } },
    });
    mockAssertInstructorOfCourse.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await questionsRoute.POST(
      jsonRequest("POST", { prompt: "Question" }),
      questionsContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockQuizQuestionCreate).not.toHaveBeenCalled();
  });

  it("checks lesson-level quiz course and URL quizId before updating a question", async () => {
    mockQuizQuestionFindFirst.mockResolvedValue({
      id: "question-1",
      quizId: "quiz-1",
      quiz: { courseId: null, lesson: { module: { courseId: "course-1" } } },
    });

    const response = await questionRoute.PATCH(
      jsonRequest("PATCH", { prompt: "Updated" }),
      questionContext("quiz-1", "question-1"),
    );

    expect(response.status).toBe(200);
    expect(mockQuizQuestionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "question-1", quizId: "quiz-1" },
      }),
    );
    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockQuizQuestionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "question-1" },
        data: expect.objectContaining({ prompt: "Updated" }),
      }),
    );
  });

  it("does not delete a question through a mismatched quiz URL", async () => {
    mockQuizQuestionFindFirst.mockResolvedValue(null);

    const response = await questionRoute.DELETE(
      jsonRequest("DELETE"),
      questionContext("quiz-1", "foreign-question"),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(mockQuizQuestionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "foreign-question", quizId: "quiz-1" },
      }),
    );
    expect(mockAssertInstructorOfCourse).not.toHaveBeenCalled();
    expect(mockQuizQuestionDelete).not.toHaveBeenCalled();
  });
});
