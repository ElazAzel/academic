import { describe, it, expect, vi } from "vitest";

const mockCalculateForUser = vi.hoisted(() => vi.fn());
const mockGetScopedStudentIdsForObserver = vi.hoisted(() => vi.fn());

vi.mock("@/server/modules/productivity-score/service", () => ({
  calculateForUser: mockCalculateForUser,
}));

vi.mock("@/server/modules/observer/scope", () => ({
  getScopedStudentIdsForObserver: mockGetScopedStudentIdsForObserver,
}));

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: vi.fn(() => Promise.resolve({ id: "obs-1", role: "customer_observer" })),
}));

const { getProductivityDistribution } = await import(
  "@/server/actions/reports/productivity-distribution"
);

describe("getProductivityDistribution", () => {
  it("returns aggregated distribution by level", async () => {
    mockCalculateForUser.mockResolvedValueOnce({
      totalScore: 95, level: "champion" as const,
      userId: "s1", courseId: "course-1", components: [], calculatedAt: "2026-01-01",
    });
    mockCalculateForUser.mockResolvedValueOnce({
      totalScore: 75, level: "advanced" as const,
      userId: "s2", courseId: "course-1", components: [], calculatedAt: "2026-01-01",
    });
    mockCalculateForUser.mockResolvedValueOnce({
      totalScore: 45, level: "practitioner" as const,
      userId: "s3", courseId: "course-1", components: [], calculatedAt: "2026-01-01",
    });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["s1", "s2", "s3"]);

    const result = await getProductivityDistribution({
      type: "cohort", cohortId: "coh-1", courseIds: ["course-1"], studentIds: ["s1", "s2", "s3"], organizationId: undefined,
    });

    expect(result).not.toBeNull();
    expect(result!.totalStudents).toBe(3);
    expect(result!.averageScore).toBeCloseTo(71.67, 1);
    expect(result!.levels).toContainEqual({ level: "champion", count: 1, percentage: 33.33 });
    expect(result!.levels).toContainEqual({ level: "advanced", count: 1, percentage: 33.33 });
    expect(result!.levels).toContainEqual({ level: "practitioner", count: 1, percentage: 33.33 });
  });

  it("returns null for empty scope", async () => {
    const result = await getProductivityDistribution({
      type: "cohort", cohortId: "empty", courseIds: [], studentIds: [], organizationId: undefined,
    });
    expect(result).toBeNull();
  });

  it("handles partial failures gracefully", async () => {
    mockCalculateForUser.mockResolvedValueOnce({
      totalScore: 90, level: "champion" as const,
      userId: "s1", courseId: "course-1", components: [], calculatedAt: "2026-01-01",
    });
    mockCalculateForUser.mockRejectedValueOnce(new Error("calc failed"));
    mockCalculateForUser.mockResolvedValueOnce({
      totalScore: 50, level: "practitioner" as const,
      userId: "s3", courseId: "course-1", components: [], calculatedAt: "2026-01-01",
    });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["s1", "s2", "s3"]);

    const result = await getProductivityDistribution({
      type: "cohort", cohortId: "coh-2", courseIds: ["course-1"], studentIds: ["s1", "s2", "s3"], organizationId: undefined,
    });

    expect(result).not.toBeNull();
    expect(result!.totalStudents).toBe(2);
  });
});
