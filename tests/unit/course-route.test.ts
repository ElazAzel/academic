import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetCourse = vi.hoisted(() => vi.fn());
const mockUpdateCourse = vi.hoisted(() => vi.fn());
const mockAssertCourseReadAccess = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/courses/service", () => ({
  getCourse: mockGetCourse,
  updateCourse: mockUpdateCourse,
}));
vi.mock("@/server/modules/courses/access", () => ({ assertCourseReadAccess: mockAssertCourseReadAccess }));

const courseRoute = await import("@/app/api/v1/courses/[courseId]/route");

function context(courseId = "course-1") {
  return { params: Promise.resolve({ courseId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "user-1", roles: ["student"] });
  mockGetCourse.mockResolvedValue({ id: "course-1", status: "PUBLISHED", title: "Course" });
  mockUpdateCourse.mockResolvedValue({ id: "course-1", title: "Updated" });
  mockAssertCourseReadAccess.mockResolvedValue(undefined);
});

describe("course detail route", () => {
  it("uses shared course read scope for instructor access", async () => {
    mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
    mockAssertCourseReadAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await courseRoute.GET(
      new Request("http://localhost/api/v1/courses/course-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockGetCourse).toHaveBeenCalledWith("course-1");
    expect(mockAssertCourseReadAccess).toHaveBeenCalledWith(
      { id: "instructor-1", roles: ["instructor"] },
      "course-1",
    );
  });

  it("returns a published course after read scope is confirmed", async () => {
    const response = await courseRoute.GET(
      new Request("http://localhost/api/v1/courses/course-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "course-1", status: "PUBLISHED", title: "Course" });
    expect(mockAssertCourseReadAccess).toHaveBeenCalledWith(
      { id: "user-1", roles: ["student"] },
      "course-1",
    );
  });

  it("does not expose draft courses to customer observers even when scoped", async () => {
    mockRequireUser.mockResolvedValue({ id: "observer-1", roles: ["customer_observer"] });
    mockGetCourse.mockResolvedValue({ id: "course-1", status: "DRAFT", title: "Draft" });

    const response = await courseRoute.GET(
      new Request("http://localhost/api/v1/courses/course-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
    expect(mockAssertCourseReadAccess).toHaveBeenCalledWith(
      { id: "observer-1", roles: ["customer_observer"] },
      "course-1",
    );
  });
});
