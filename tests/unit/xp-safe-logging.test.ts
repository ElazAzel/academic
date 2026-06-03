import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: {
      update: mockUserUpdate,
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
  }),
}));

const { awardXp, getLeaderboard, getLeaderboardForActor, getUserXp } = await import("@/server/actions/xp");

beforeEach(() => {
  vi.clearAllMocks();
  mockUserUpdate.mockResolvedValue({ xp: 50 });
  mockUserFindUnique.mockResolvedValue({ xp: 50 });
  mockUserFindMany.mockResolvedValue([]);
});

describe("XP safe logging", () => {
  it("does not log controlled validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(awardXp("", "lesson_complete")).rejects.toMatchObject({
      code: "validation_error",
      status: 422,
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("wraps award persistence errors without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserUpdate.mockRejectedValueOnce(new Error("postgres://secret-xp-award"));

    await expect(awardXp("user-1", "lesson_complete")).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось начислить XP",
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-xp-award");
    expect(consoleSpy).toHaveBeenCalledWith("[awardXp]", expect.objectContaining({ errorType: "Error" }));
  });

  it("wraps user XP read errors without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserFindUnique.mockRejectedValueOnce(new Error("postgres://secret-xp-read"));

    await expect(getUserXp("user-1")).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось получить XP пользователя",
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-xp-read");
    expect(consoleSpy).toHaveBeenCalledWith("[getUserXp]", expect.objectContaining({ errorType: "Error" }));
  });

  it("wraps global leaderboard errors without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserFindMany.mockRejectedValueOnce(new Error("postgres://secret-xp-leaderboard"));

    await expect(getLeaderboard(10)).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось получить рейтинг XP",
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-xp-leaderboard");
    expect(consoleSpy).toHaveBeenCalledWith("[getLeaderboard]", expect.objectContaining({ errorType: "Error" }));
  });

  it("wraps scoped leaderboard errors without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserFindMany.mockRejectedValueOnce(new Error("postgres://secret-xp-scoped-leaderboard"));

    await expect(getLeaderboardForActor({ id: "student-1", roles: ["student"] }, 10)).rejects.toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Не удалось получить рейтинг XP",
    });

    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-xp-scoped-leaderboard");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[getLeaderboardForActor]",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
