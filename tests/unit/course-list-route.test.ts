import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockListCoursesForActor = vi.hoisted(() => vi.fn());
const mockCreateCourse = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/courses/service", () => ({
  createCourse: mockCreateCourse,
  listCoursesForActor: mockListCoursesForActor,
}));

const route = await import("@/app/api/v1/courses/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockListCoursesForActor.mockResolvedValue([{ id: "course-1", title: "Курс" }]);
});

describe("course list route", () => {
  it("passes the current actor into the scoped course list service", async () => {
    const response = await route.GET(new Request("http://localhost/api/v1/courses?status=PUBLISHED"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([{ id: "course-1", title: "Курс" }]);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:read");
    expect(mockListCoursesForActor).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      "PUBLISHED",
    );
  });
});
