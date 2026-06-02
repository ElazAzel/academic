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
  }),
}));

const { getCourseAttendance, getLessonAttendanceDetail } = await import("@/server/actions/attendance");

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
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("attendance actions access", () => {
  it("checks course analytics scope before loading course attendance", async () => {
    mockAssertCourseAnalyticsAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    await expect(getCourseAttendance("course-1")).rejects.toMatchObject({ code: "forbidden", status: 403 });

    expect(mockAssertCourseAnalyticsAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      "course-1",
    );
    expect(mockLessonFindMany).not.toHaveBeenCalled();
  });

  it("checks lesson course analytics scope before loading student attendance details", async () => {
    mockAssertCourseAnalyticsAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    await expect(getLessonAttendanceDetail("lesson-1")).rejects.toMatchObject({ code: "forbidden", status: 403 });

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
});
