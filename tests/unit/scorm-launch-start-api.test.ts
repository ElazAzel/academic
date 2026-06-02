import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetScormLessonCourseId = vi.hoisted(() => vi.fn());
const mockAssertScormRuntimeAccess = vi.hoisted(() => vi.fn());
const mockGetScormPackage = vi.hoisted(() => vi.fn());
const mockCreateScormLaunch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/scorm/service", () => ({
  getScormLessonCourseId: mockGetScormLessonCourseId,
  assertScormRuntimeAccess: mockAssertScormRuntimeAccess,
  getScormPackage: mockGetScormPackage,
  createScormLaunch: mockCreateScormLaunch,
}));

const launchStartRoute = await import("@/app/api/v1/lessons/[lessonId]/scorm/launch/route");

function request() {
  return new Request("http://localhost/api/v1/lessons/lesson-1/scorm/launch", { method: "POST" });
}

function context() {
  return { params: Promise.resolve({ lessonId: "lesson-1" }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockGetScormLessonCourseId.mockResolvedValue("course-1");
  mockAssertScormRuntimeAccess.mockResolvedValue(undefined);
  mockGetScormPackage.mockResolvedValue({
    id: "package-1",
    entryUrl: "/api/v1/scorm/serve/package-1/index.html",
    scormVersion: "1.2",
  });
  mockCreateScormLaunch.mockResolvedValue({ id: "launch-1" });
});

describe("SCORM launch start API", () => {
  it("checks runtime access before creating a launch", async () => {
    mockAssertScormRuntimeAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await launchStartRoute.POST(request(), context());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockAssertScormRuntimeAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      { lessonId: "lesson-1", courseId: "course-1" },
    );
    expect(mockGetScormPackage).not.toHaveBeenCalled();
    expect(mockCreateScormLaunch).not.toHaveBeenCalled();
  });

  it("returns structured not_found when the lesson has no SCORM package", async () => {
    mockGetScormPackage.mockResolvedValue(null);

    const response = await launchStartRoute.POST(request(), context());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(mockCreateScormLaunch).not.toHaveBeenCalled();
  });

  it("creates a launch only after runtime access and package checks pass", async () => {
    const response = await launchStartRoute.POST(request(), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      launchId: "launch-1",
      entryUrl: "/api/v1/scorm/serve/package-1/index.html",
      scormVersion: "1.2",
    });
    expect(mockCreateScormLaunch).toHaveBeenCalledWith("student-1", "lesson-1", "package-1");
  });
});
