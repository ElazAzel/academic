import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockAssertInstructorOfCourse = vi.hoisted(() => vi.fn());
const mockAssertCourseReadAccess = vi.hoisted(() => vi.fn());
const mockAssignmentFindUnique = vi.hoisted(() => vi.fn());
const mockAssignmentUpdate = vi.hoisted(() => vi.fn());
const mockAssignmentDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/courses/service", () => ({ assertInstructorOfCourse: mockAssertInstructorOfCourse }));
vi.mock("@/server/modules/courses/access", () => ({ assertCourseReadAccess: mockAssertCourseReadAccess }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    assignment: {
      findUnique: mockAssignmentFindUnique,
      update: mockAssignmentUpdate,
      delete: mockAssignmentDelete,
    },
  }),
}));

const assignmentRoute = await import("@/app/api/v1/assignments/[assignmentId]/route");

function jsonRequest(method: "PATCH" | "DELETE", body?: unknown) {
  return new Request("http://localhost/api/v1/assignments/assignment-1", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function context(assignmentId = "assignment-1") {
  return { params: Promise.resolve({ assignmentId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });
  mockAssertInstructorOfCourse.mockResolvedValue(undefined);
  mockAssertCourseReadAccess.mockResolvedValue(undefined);
  mockAssignmentUpdate.mockResolvedValue({ id: "assignment-1", title: "Updated" });
  mockAssignmentDelete.mockResolvedValue({ id: "assignment-1" });
});

describe("assignment route", () => {
  it("checks course read scope before returning assignment details", async () => {
    const assignment = {
      id: "assignment-1",
      title: "Task",
      instructions: "Instructions",
      maxScore: 100,
      maxAttempts: 2,
      courseId: null,
      lessonId: "lesson-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      lesson: { module: { courseId: "course-1" } },
    };
    mockAssignmentFindUnique.mockResolvedValue(assignment);

    const response = await assignmentRoute.GET(
      new Request("http://localhost/api/v1/assignments/assignment-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("assignment-1");
    expect(body.data.lesson).toBeUndefined();
    expect(mockAssertCourseReadAccess).toHaveBeenCalledWith(
      { id: "instructor-1", roles: ["instructor"] },
      "course-1",
    );
  });

  it("does not return assignment details when course read scope is denied", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      id: "assignment-1",
      title: "Task",
      courseId: "course-1",
      lesson: null,
    });
    mockAssertCourseReadAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await assignmentRoute.GET(
      new Request("http://localhost/api/v1/assignments/assignment-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("does not return assignments without course context", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      id: "assignment-1",
      title: "Task",
      courseId: null,
      lesson: null,
    });

    const response = await assignmentRoute.GET(
      new Request("http://localhost/api/v1/assignments/assignment-1"),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockAssertCourseReadAccess).not.toHaveBeenCalled();
  });

  it("resolves lesson-level assignment course before updating", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      courseId: null,
      lesson: { module: { courseId: "course-1" } },
    });

    const response = await assignmentRoute.PATCH(
      jsonRequest("PATCH", { title: "Updated" }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("assignment-1");
    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockAssignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assignment-1" },
        data: { title: "Updated" },
      }),
    );
  });

  it("does not update assignments without course context", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      courseId: null,
      lesson: null,
    });

    const response = await assignmentRoute.PATCH(
      jsonRequest("PATCH", { title: "Updated" }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockAssertInstructorOfCourse).not.toHaveBeenCalled();
    expect(mockAssignmentUpdate).not.toHaveBeenCalled();
  });

  it("does not delete when instructor course scope is denied", async () => {
    mockAssignmentFindUnique.mockResolvedValue({
      courseId: "course-1",
      lesson: null,
    });
    mockAssertInstructorOfCourse.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await assignmentRoute.DELETE(jsonRequest("DELETE"), context());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockAssertInstructorOfCourse).toHaveBeenCalledWith("instructor-1", "course-1");
    expect(mockAssignmentDelete).not.toHaveBeenCalled();
  });
});
