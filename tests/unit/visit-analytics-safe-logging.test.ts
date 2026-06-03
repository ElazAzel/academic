import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  userSession: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  activityLog: {
    findMany: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
  },
  lessonProgress: {
    findMany: vi.fn(),
  },
  quizAttempt: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => mockPrisma,
}));

const { getTimingAnalytics, getUserVisitDetail, getVisitAnalytics } = await import("@/server/actions/visit-analytics");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("visit analytics safe logging", () => {
  it("does not log raw visit analytics query errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockPrisma.userSession.findMany.mockRejectedValueOnce(new Error("postgres://secret-visit-analytics"));

    await expect(getVisitAnalytics(30)).rejects.toThrow("secret-visit-analytics");

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-visit-analytics");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[getVisitAnalytics]",
      expect.objectContaining({ errorType: "Error" }),
    );
    consoleSpy.mockRestore();
  });

  it("does not log raw user visit detail query errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error("postgres://secret-user-visit-detail"));

    await expect(getUserVisitDetail("user-1", 30)).rejects.toThrow("secret-user-visit-detail");

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-user-visit-detail");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[getUserVisitDetail]",
      expect.objectContaining({ errorType: "Error" }),
    );
    consoleSpy.mockRestore();
  });

  it("does not log raw timing analytics query errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockPrisma.message.findMany.mockRejectedValueOnce(new Error("postgres://secret-timing-analytics"));

    await expect(getTimingAnalytics(30)).rejects.toThrow("secret-timing-analytics");

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-timing-analytics");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[getTimingAnalytics]",
      expect.objectContaining({ errorType: "Error" }),
    );
    consoleSpy.mockRestore();
  });
});
