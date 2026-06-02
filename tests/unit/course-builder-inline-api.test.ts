import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCreateQuizInline = vi.hoisted(() => vi.fn());
const mockCreateAssignmentInline = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/course-builder/service", () => ({
  createQuizInline: mockCreateQuizInline,
  createAssignmentInline: mockCreateAssignmentInline,
}));

const quizRoute = await import("@/app/api/v1/course-builder/quiz/route");
const assignmentRoute =
  await import("@/app/api/v1/course-builder/assignment/route");

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("course-builder inline creation API scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: "instructor-1",
      roles: ["instructor"],
    });
    mockCreateQuizInline.mockResolvedValue({ id: "quiz-1", title: "Тест" });
    mockCreateAssignmentInline.mockResolvedValue({
      id: "assignment-1",
      title: "Задание",
    });
  });

  it("requires course write permission before creating inline quizzes", async () => {
    const body = {
      lessonId: "lesson-1",
      courseId: "course-1",
      title: "Тест",
      passThreshold: 80,
      maxAttempts: 3,
      questions: [],
    };

    const response = await quizRoute.POST(
      jsonRequest("/api/v1/course-builder/quiz", body),
    );

    expect(response.status).toBe(201);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockCreateQuizInline).toHaveBeenCalledWith(
      "lesson-1",
      body,
      "instructor-1",
    );
  });

  it("requires course write permission before creating inline assignments", async () => {
    const body = {
      lessonId: "lesson-1",
      courseId: "course-1",
      title: "Задание",
      instructions: "Описание",
      maxAttempts: 2,
      maxScore: 100,
    };

    const response = await assignmentRoute.POST(
      jsonRequest("/api/v1/course-builder/assignment", body),
    );

    expect(response.status).toBe(201);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockCreateAssignmentInline).toHaveBeenCalledWith(
      "lesson-1",
      body,
      "instructor-1",
    );
  });

  it("does not create inline content when course write permission is missing", async () => {
    mockRequireUser.mockRejectedValue(
      new ApiError("forbidden", "Недостаточно прав", 403),
    );

    const response = await quizRoute.POST(
      jsonRequest("/api/v1/course-builder/quiz", {
        lessonId: "lesson-1",
        courseId: "course-1",
        title: "Тест",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockCreateQuizInline).not.toHaveBeenCalled();
    expect(mockCreateAssignmentInline).not.toHaveBeenCalled();
  });

  it("rejects invalid inline quiz payloads before calling the service", async () => {
    const response = await quizRoute.POST(
      jsonRequest("/api/v1/course-builder/quiz", {
        courseId: "course-1",
        title: "Тест",
        passThreshold: 80,
        maxAttempts: 3,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockCreateQuizInline).not.toHaveBeenCalled();
  });

  it("rejects invalid inline assignment payloads before calling the service", async () => {
    const response = await assignmentRoute.POST(
      jsonRequest("/api/v1/course-builder/assignment", {
        lessonId: "lesson-1",
        courseId: "course-1",
        title: "Задание",
        maxAttempts: 2,
        maxScore: 100,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockCreateAssignmentInline).not.toHaveBeenCalled();
  });
});
