import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockSubmitAssignment = vi.hoisted(() => vi.fn());
const mockSubmitQuizAttempt = vi.hoisted(() => vi.fn());
const mockQuizAttemptFindMany = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/modules/assignments/service", () => ({
  submitAssignment: mockSubmitAssignment,
}));

vi.mock("@/server/modules/quizzes/service", () => ({
  submitQuizAttempt: mockSubmitQuizAttempt,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    quizAttempt: {
      findMany: mockQuizAttemptFindMany,
    },
    assignmentSubmission: {
      findMany: mockAssignmentSubmissionFindMany,
    },
  }),
}));

const {
  getStudentQuizAttemptsAction,
  getStudentAssignmentSubmissionsAction,
  submitAssignmentAction,
  submitQuizAction,
} = await import("@/server/actions/student");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockRevalidatePath.mockReturnValue(undefined);
  mockQuizAttemptFindMany.mockResolvedValue([]);
  mockAssignmentSubmissionFindMany.mockResolvedValue([]);
  mockSubmitAssignment.mockResolvedValue({ id: "submission-1" });
  mockSubmitQuizAttempt.mockResolvedValue({ id: "attempt-1", passed: true, score: 100 });
});

describe("student actions safe error handling", () => {
  it("does not log controlled read action errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRequireRole.mockRejectedValueOnce(new ApiError("forbidden", "Нет доступа", 403));

    try {
      await expect(getStudentQuizAttemptsAction()).rejects.toMatchObject({
        code: "forbidden",
        status: 403,
        message: "Нет доступа",
      });
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockQuizAttemptFindMany).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps quiz attempt list failures without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockQuizAttemptFindMany.mockRejectedValueOnce(new Error("postgres://secret-student-quiz-attempts"));

    try {
      await expect(getStudentQuizAttemptsAction()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить попытки тестов",
      });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-student-quiz-attempts");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[getStudentQuizAttemptsAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps assignment submission list failures without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockAssignmentSubmissionFindMany.mockRejectedValueOnce(new Error("postgres://secret-student-assignment-list"));

    try {
      await expect(getStudentAssignmentSubmissionsAction()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить отправленные задания",
      });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-student-assignment-list");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[getStudentAssignmentSubmissionsAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("preserves controlled assignment submit errors without stderr noise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSubmitAssignment.mockRejectedValueOnce(new ApiError("forbidden", "Задание недоступно", 403));

    try {
      const result = await submitAssignmentAction("assignment-1", "Ответ");

      expect(result).toEqual({ success: false, error: "Задание недоступно" });
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw assignment submit errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSubmitAssignment.mockRejectedValueOnce(new Error("postgres://secret-submit-assignment"));

    try {
      const result = await submitAssignmentAction("assignment-1", "Ответ");

      expect(result.success).toBe(false);
      expect(result.error).not.toContain("secret-submit-assignment");
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-submit-assignment");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[submitAssignmentAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw quiz submit errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSubmitQuizAttempt.mockRejectedValueOnce(new Error("postgres://secret-submit-quiz"));

    try {
      const result = await submitQuizAction("quiz-1", { q1: "a" });

      expect(result.success).toBe(false);
      expect(result.error).not.toContain("secret-submit-quiz");
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-submit-quiz");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[submitQuizAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
