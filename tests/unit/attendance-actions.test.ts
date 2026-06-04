import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockAssertCourseAnalyticsAccess = vi.hoisted(() => vi.fn());
const mockLessonFindMany = vi.hoisted(() => vi.fn());
const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentCount = vi.hoisted(() => vi.fn());
const mockActivityLogGroupBy = vi.hoisted(() => vi.fn());
const mockActivityLogFindMany = vi.hoisted(() => vi.fn());
const mockLessonProgressFindMany = vi.hoisted(() => vi.fn());
const mockLessonCount = vi.hoisted(() => vi.fn());
const mockCourseFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/courses/access", () => ({ assertCourseAnalyticsAccess: mockAssertCourseAnalyticsAccess }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: {
      findMany: mockLessonFindMany,
      findUnique: mockLessonFindUnique,
      count: mockLessonCount,
    },
    enrollment: {
      findMany: mockEnrollmentFindMany,
      count: mockEnrollmentCount,
    },
    activityLog: {
      groupBy: mockActivityLogGroupBy,
      findMany: mockActivityLogFindMany,
    },
    lessonProgress: {
      findMany: mockLessonProgressFindMany,
    },
    course: {
      findMany: mockCourseFindMany,
    },
  }),
}));

const { getCourseAttendance, getInstructorCourses, getLessonAttendanceDetail } = await import("@/server/actions/attendance");

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockAssertCourseAnalyticsAccess.mockResolvedValue(undefined);
  mockLessonFindMany.mockResolvedValue([]);
  mockLessonFindUnique.mockResolvedValue({ id: "lesson-1", module: { courseId: "course-1" } });
  mockEnrollmentFindMany.mockResolvedValue([]);
  mockEnrollmentCount.mockResolvedValue(0);
  mockActivityLogGroupBy.mockResolvedValue([]);
  mockActivityLogFindMany.mockResolvedValue([]);
  mockLessonProgressFindMany.mockResolvedValue([]);
  mockLessonCount.mockResolvedValue(0);
  mockCourseFindMany.mockResolvedValue([]);
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("attendance actions access", () => {
  it("checks course analytics scope before loading course attendance", async () => {
    mockAssertCourseAnalyticsAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    await expect(getCourseAttendance("course-1")).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    expect(mockAssertCourseAnalyticsAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      "course-1",
    );
    expect(mockLessonFindMany).not.toHaveBeenCalled();
  });

  it("checks lesson course analytics scope before loading student attendance details", async () => {
    mockAssertCourseAnalyticsAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    await expect(getLessonAttendanceDetail("lesson-1")).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    expect(mockLessonFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lesson-1" },
      }),
    );
    expect(mockAssertCourseAnalyticsAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      "course-1",
    );
    expect(mockEnrollmentFindMany).not.toHaveBeenCalled();
  });

  it("does not log controlled validation errors", async () => {
    await expect(getCourseAttendance("")).rejects.toMatchObject({
      code: "validation_error",
      status: 422,
    } satisfies Partial<ApiError>);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(mockRequireUser).not.toHaveBeenCalled();
    expect(mockLessonFindMany).not.toHaveBeenCalled();
  });

  it("wraps course attendance load failures without exposing raw details", async () => {
    mockLessonFindMany.mockRejectedValueOnce(new Error("postgres://secret-attendance-course"));

    await expect(getCourseAttendance("course-1")).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось загрузить посещаемость курса",
    } satisfies Partial<ApiError>);

    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("secret-attendance-course");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[getCourseAttendance]",
      expect.objectContaining({ errorType: "Error" }),
    );
  });

  it("wraps lesson attendance detail failures without exposing raw details", async () => {
    mockEnrollmentFindMany.mockRejectedValueOnce(new Error("postgres://secret-attendance-lesson"));

    await expect(getLessonAttendanceDetail("lesson-1")).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось загрузить посещаемость урока",
    } satisfies Partial<ApiError>);

    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("secret-attendance-lesson");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[getLessonAttendanceDetail]",
      expect.objectContaining({ errorType: "Error" }),
    );
  });

  it("wraps instructor course list failures inside the action boundary", async () => {
    mockCourseFindMany.mockRejectedValueOnce(new Error("postgres://secret-attendance-courses"));

    await expect(getInstructorCourses()).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось загрузить курсы преподавателя",
    } satisfies Partial<ApiError>);

    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain("secret-attendance-courses");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[getInstructorCourses]",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
