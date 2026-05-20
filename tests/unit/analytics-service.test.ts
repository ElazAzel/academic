import { describe, expect, it, vi } from "vitest";

const mockUserCount = vi.hoisted(() => vi.fn());
const mockCourseCount = vi.hoisted(() => vi.fn());
const mockEnrollmentCount = vi.hoisted(() => vi.fn());
const mockCourseProgressCount = vi.hoisted(() => vi.fn());
const mockQuizAttemptFindMany = vi.hoisted(() => vi.fn());
const mockQuizAttemptAggregate = vi.hoisted(() => vi.fn());
const mockQuizAttemptCount = vi.hoisted(() => vi.fn());
const mockCertificateCount = vi.hoisted(() => vi.fn());
const mockOutboxEventCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { count: mockUserCount },
    course: { count: mockCourseCount },
    enrollment: { count: mockEnrollmentCount },
    courseProgress: { count: mockCourseProgressCount },
    quizAttempt: { findMany: mockQuizAttemptFindMany, aggregate: mockQuizAttemptAggregate, count: mockQuizAttemptCount },
    certificate: { count: mockCertificateCount },
    outboxEvent: { create: mockOutboxEventCreate },
  }),
}));

const { getAdminOverview } = await import("@/server/modules/analytics/service");

describe("getAdminOverview", () => {
  it("returns correct structure with mocked counts", async () => {
    mockUserCount.mockResolvedValue(10);
    mockCourseCount.mockResolvedValue(5);
    mockEnrollmentCount.mockResolvedValue(50);
    mockCourseProgressCount.mockResolvedValue(25);
    mockQuizAttemptFindMany.mockResolvedValue([
      { score: 80, passed: true },
      { score: 60, passed: false },
    ]);
    mockQuizAttemptAggregate.mockResolvedValue({ _avg: { score: 70 } });
    mockQuizAttemptCount.mockResolvedValue(1);
    mockCertificateCount.mockResolvedValue(8);

    const result = await getAdminOverview();
    expect(result).toMatchObject({
      activeUsers: 10,
      courses: 5,
      enrollments: 50,
      completionRate: 50,
      averageQuizScore: 70,
      passedQuizAttempts: 1,
      revenueCents: 0,
      currency: "rub",
      certificates: 8,
    });
  });

  it("handles zero data gracefully", async () => {
    mockUserCount.mockResolvedValue(0);
    mockCourseCount.mockResolvedValue(0);
    mockEnrollmentCount.mockResolvedValue(0);
    mockCourseProgressCount.mockResolvedValue(0);
    mockQuizAttemptFindMany.mockResolvedValue([]);
    mockQuizAttemptAggregate.mockResolvedValue({ _avg: { score: null } });
    mockQuizAttemptCount.mockResolvedValue(0);
    mockCertificateCount.mockResolvedValue(0);

    const result = await getAdminOverview();
    expect(result).toMatchObject({
      activeUsers: 0,
      courses: 0,
      enrollments: 0,
      completionRate: 0,
      averageQuizScore: 0,
      passedQuizAttempts: 0,
      certificates: 0,
    });
  });

  it("verifies returned object shape", async () => {
    mockUserCount.mockResolvedValue(3);
    mockCourseCount.mockResolvedValue(2);
    mockEnrollmentCount.mockResolvedValue(10);
    mockCourseProgressCount.mockResolvedValue(4);
    mockQuizAttemptFindMany.mockResolvedValue([{ score: 90, passed: true }]);
    mockQuizAttemptAggregate.mockResolvedValue({ _avg: { score: 90 } });
    mockQuizAttemptCount.mockResolvedValue(1);
    mockCertificateCount.mockResolvedValue(2);

    const result = await getAdminOverview();
    expect(result).toHaveProperty("activeUsers");
    expect(result).toHaveProperty("courses");
    expect(result).toHaveProperty("enrollments");
    expect(result).toHaveProperty("completionRate");
    expect(result).toHaveProperty("averageQuizScore");
    expect(result).toHaveProperty("passedQuizAttempts");
    expect(result).toHaveProperty("revenueCents");
    expect(result).toHaveProperty("currency");
    expect(result).toHaveProperty("certificates");
    expect(typeof result.revenueCents).toBe("number");
    expect(result.currency).toBe("rub");
  });
});
