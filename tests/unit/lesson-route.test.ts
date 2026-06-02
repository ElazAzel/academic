import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockGetLesson = vi.hoisted(() => vi.fn());
const mockUpdateLesson = vi.hoisted(() => vi.fn());
const mockDeleteLesson = vi.hoisted(() => vi.fn());
const mockAssertLearningContentAccess = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: { findUnique: mockLessonFindUnique },
  }),
}));
vi.mock("@/server/modules/courses/service", () => ({
  getLesson: mockGetLesson,
  updateLesson: mockUpdateLesson,
  deleteLesson: mockDeleteLesson,
}));
vi.mock("@/server/modules/courses/access", () => ({ assertLearningContentAccess: mockAssertLearningContentAccess }));

const lessonRoute = await import("@/app/api/v1/lessons/[lessonId]/route");

function context(lessonId = "lesson-1") {
  return { params: Promise.resolve({ lessonId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockLessonFindUnique.mockResolvedValue({ id: "lesson-1", module: { courseId: "course-1" } });
  mockAssertLearningContentAccess.mockResolvedValue(undefined);
  mockGetLesson.mockResolvedValue({ id: "lesson-1", title: "Lesson" });
});

describe("lesson detail route", () => {
  it("checks learning content access before returning lesson details", async () => {
    const response = await lessonRoute.GET(
      new Request("http://localhost/api/v1/lessons/lesson-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "lesson-1", title: "Lesson" });
    expect(mockAssertLearningContentAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      "course-1",
    );
    expect(mockGetLesson).toHaveBeenCalledWith("lesson-1", true);
  });

  it("does not return lesson details when learning content access is denied", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer-1", roles: ["customer_observer"] });
    mockAssertLearningContentAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await lessonRoute.GET(
      new Request("http://localhost/api/v1/lessons/lesson-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockGetLesson).not.toHaveBeenCalled();
  });
});
