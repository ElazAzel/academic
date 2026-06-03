import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockActivityLogFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockCourseFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    activityLog: { findMany: mockActivityLogFindMany },
    enrollment: { findMany: mockEnrollmentFindMany },
    cohort: { findMany: mockCohortFindMany },
    course: { findMany: mockCourseFindMany },
  }),
}));

const { getActivityAnalytics } = await import("@/server/actions/activity-analytics");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
  mockActivityLogFindMany.mockResolvedValue([]);
  mockEnrollmentFindMany.mockResolvedValue([]);
  mockCohortFindMany.mockResolvedValue([]);
  mockCourseFindMany.mockResolvedValue([]);
});

describe("getActivityAnalytics safe logging", () => {
  it("does not log controlled validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(getActivityAnalytics(1)).rejects.toMatchObject({
      code: "validation_error",
      status: 422,
    });

    expect(mockRequireRole).not.toHaveBeenCalled();
    expect(mockActivityLogFindMany).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("does not log controlled RBAC errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRequireRole.mockRejectedValueOnce(new ApiError("forbidden", "Недостаточно прав", 403));

    await expect(getActivityAnalytics(30)).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });

    expect(mockActivityLogFindMany).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("wraps query errors without exposing raw backend details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockActivityLogFindMany.mockRejectedValueOnce(new Error("postgres://secret-activity-analytics"));

    await expect(getActivityAnalytics(30)).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось получить аналитику активности",
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-activity-analytics");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[getActivityAnalytics]",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
