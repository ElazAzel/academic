import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockAssertLearningContentAccess = vi.hoisted(() => vi.fn());
const mockLogVisibilityChange = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: { findUnique: mockLessonFindUnique },
  }),
}));
vi.mock("@/server/modules/courses/access", () => ({ assertLearningContentAccess: mockAssertLearningContentAccess }));
vi.mock("@/server/modules/security/content-protection-server", () => ({
  logVisibilityChange: mockLogVisibilityChange,
}));

const route = await import("@/app/api/v1/lessons/log-visibility/route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/lessons/log-visibility", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockLessonFindUnique.mockResolvedValue({ module: { courseId: "course-1" } });
  mockAssertLearningContentAccess.mockResolvedValue(undefined);
  mockLogVisibilityChange.mockResolvedValue(undefined);
});

describe("lesson visibility logging API", () => {
  it("validates payload before reading lesson scope", async () => {
    const response = await route.POST(jsonRequest({ lessonId: "lesson-1", state: "peek" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockLessonFindUnique).not.toHaveBeenCalled();
    expect(mockLogVisibilityChange).not.toHaveBeenCalled();
  });

  it("does not log visibility when learning content access is denied", async () => {
    mockAssertLearningContentAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await route.POST(jsonRequest({ lessonId: "lesson-1", state: "hidden" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockAssertLearningContentAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      "course-1",
    );
    expect(mockLogVisibilityChange).not.toHaveBeenCalled();
  });

  it("logs visibility only after lesson scope is confirmed", async () => {
    const response = await route.POST(jsonRequest({ lessonId: "lesson-1", state: "visible" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockLogVisibilityChange).toHaveBeenCalledWith({
      userId: "student-1",
      lessonId: "lesson-1",
      state: "visible",
    });
  });
});
