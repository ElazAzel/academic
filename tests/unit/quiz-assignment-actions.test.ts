import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());
const mockCourseFindFirst = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockQuizCreate = vi.hoisted(() => vi.fn());
const mockAssignmentCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: { findFirst: mockCourseFindFirst },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    quiz: { create: mockQuizCreate },
    assignment: { create: mockAssignmentCreate },
  }),
}));

const { createAssignmentAction, createQuizAction } = await import("@/server/actions/quiz-assignment");

describe("quiz and assignment create actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
    mockCourseFindFirst.mockResolvedValue({ id: "course-1" });
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1" });
    mockQuizCreate.mockResolvedValue({ id: "quiz-1" });
    mockAssignmentCreate.mockResolvedValue({ id: "assignment-1" });
  });

  it("creates a quiz under the instructor default writable course", async () => {
    await createQuizAction();

    expect(mockCourseFindFirst).toHaveBeenCalledWith({
      where: { instructors: { some: { userId: "instructor-1" } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    expect(mockQuizCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseId: "course-1" }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ metadata: { courseId: "course-1" } }));
    expect(mockRedirect).toHaveBeenCalledWith("/instructor/quizzes/quiz-1/edit");
  });

  it("creates an assignment under an explicitly owned course", async () => {
    const formData = new FormData();
    formData.set("courseId", "course-2");
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-2" });

    await createAssignmentAction(formData);

    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: { courseId_userId: { courseId: "course-2", userId: "instructor-1" } },
      select: { courseId: true },
    });
    expect(mockCourseFindFirst).not.toHaveBeenCalled();
    expect(mockAssignmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseId: "course-2" }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ metadata: { courseId: "course-2" } }));
    expect(mockRedirect).toHaveBeenCalledWith("/instructor/assignments/assignment-1/edit");
  });

  it("blocks explicit foreign course ids for instructors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const formData = new FormData();
    formData.set("courseId", "foreign-course");
    mockCourseInstructorFindUnique.mockResolvedValue(null);

    await expect(createQuizAction(formData)).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(mockQuizCreate).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("wraps unexpected quiz create errors without leaking details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockQuizCreate.mockRejectedValue(new Error("postgres://secret-quiz-create"));

    let caught: unknown;
    try {
      await createQuizAction();
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Внутренняя ошибка сервера",
    } satisfies Partial<ApiError>);
    expect((caught as Error).message).not.toContain("secret-quiz-create");
    expect(consoleSpy).toHaveBeenCalledWith("[createQuizAction]", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("allows admins to create under an explicit course without instructor ownership lookup", async () => {
    const formData = new FormData();
    formData.set("courseId", "course-admin");
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });

    await createQuizAction(formData);

    expect(mockCourseInstructorFindUnique).not.toHaveBeenCalled();
    expect(mockQuizCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseId: "course-admin" }),
      }),
    );
  });
});
