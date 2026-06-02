import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetLeaderboardForActor = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/actions/xp", () => ({ getLeaderboardForActor: mockGetLeaderboardForActor }));

const route = await import("@/app/api/v1/leaderboard/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "observer-1", roles: ["customer_observer"] });
  mockGetLeaderboardForActor.mockResolvedValue([{ id: "student-1", name: "Студент", xp: 120 }]);
});

describe("leaderboard API", () => {
  it("uses actor-scoped leaderboard data instead of a global XP list", async () => {
    const response = await route.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([{ id: "student-1", name: "Студент", xp: 120 }]);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:read");
    expect(mockGetLeaderboardForActor).toHaveBeenCalledWith(
      { id: "observer-1", roles: ["customer_observer"] },
      20,
    );
  });
});
