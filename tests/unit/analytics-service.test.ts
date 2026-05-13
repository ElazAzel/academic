import { describe, expect, it, vi } from "vitest";

const mockUserCount = vi.hoisted(() => vi.fn());
const mockCourseCount = vi.hoisted(() => vi.fn());
const mockEnrollmentCount = vi.hoisted(() => vi.fn());
const mockCourseProgressCount = vi.hoisted(() => vi.fn());
const mockQuizAttemptFindMany = vi.hoisted(() => vi.fn());
const mockCertificateCount = vi.hoisted(() => vi.fn());
const mockInviteLinkCount = vi.hoisted(() => vi.fn());
const mockInviteLinkAggregate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { count: mockUserCount },
    course: { count: mockCourseCount },
    enrollment: { count: mockEnrollmentCount },
    courseProgress: { count: mockCourseProgressCount },
    quizAttempt: { findMany: mockQuizAttemptFindMany },
    certificate: { count: mockCertificateCount },
    inviteLink: { count: mockInviteLinkCount, aggregate: mockInviteLinkAggregate },
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
    mockCertificateCount.mockResolvedValue(8);
    mockInviteLinkCount.mockResolvedValue(3);
    mockInviteLinkAggregate.mockResolvedValue({ _sum: { activationCount: 15 } });

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
      activeInviteLinks: 3,
      inviteActivations: 15,
    });
  });

  it("handles zero data gracefully", async () => {
    mockUserCount.mockResolvedValue(0);
    mockCourseCount.mockResolvedValue(0);
    mockEnrollmentCount.mockResolvedValue(0);
    mockCourseProgressCount.mockResolvedValue(0);
    mockQuizAttemptFindMany.mockResolvedValue([]);
    mockCertificateCount.mockResolvedValue(0);
    mockInviteLinkCount.mockResolvedValue(0);
    mockInviteLinkAggregate.mockResolvedValue({ _sum: { activationCount: null } });

    const result = await getAdminOverview();
    expect(result).toMatchObject({
      activeUsers: 0,
      courses: 0,
      enrollments: 0,
      completionRate: 0,
      averageQuizScore: 0,
      passedQuizAttempts: 0,
      certificates: 0,
      activeInviteLinks: 0,
      inviteActivations: 0,
    });
  });

  it("verifies returned object shape", async () => {
    mockUserCount.mockResolvedValue(3);
    mockCourseCount.mockResolvedValue(2);
    mockEnrollmentCount.mockResolvedValue(10);
    mockCourseProgressCount.mockResolvedValue(4);
    mockQuizAttemptFindMany.mockResolvedValue([{ score: 90, passed: true }]);
    mockCertificateCount.mockResolvedValue(2);
    mockInviteLinkCount.mockResolvedValue(1);
    mockInviteLinkAggregate.mockResolvedValue({ _sum: { activationCount: 5 } });

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
    expect(result).toHaveProperty("activeInviteLinks");
    expect(result).toHaveProperty("inviteActivations");
    expect(typeof result.revenueCents).toBe("number");
    expect(result.currency).toBe("rub");
  });
});
