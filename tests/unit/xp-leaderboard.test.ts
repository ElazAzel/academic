import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseAccessActor } from "@/server/modules/courses/access";

const mockUserFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findMany: mockUserFindMany },
  }),
}));

const { getLeaderboardForActor } = await import("@/server/actions/xp");

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindMany.mockResolvedValue([]);
});

describe("getLeaderboardForActor", () => {
  it("keeps admin leaderboard global", async () => {
    await getLeaderboardForActor({ id: "admin-1", roles: ["admin"] }, 20);

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { xp: { gt: 0 } },
        take: 20,
      }),
    );
  });

  it("scopes student leaderboard to shared active cohorts or cohortless active courses", async () => {
    await getLeaderboardForActor({ id: "student-1", roles: ["student"] }, 20);

    const where = mockUserFindMany.mock.calls[0][0].where;
    expect(where.OR[0]).toEqual({
      enrollments: {
        some: {
          status: "ACTIVE",
          OR: [
            {
              cohort: {
                is: {
                  enrollments: {
                    some: {
                      userId: "student-1",
                      status: "ACTIVE",
                    },
                  },
                },
              },
            },
            {
              cohortId: null,
              course: {
                enrollments: {
                  some: {
                    userId: "student-1",
                    status: "ACTIVE",
                    cohortId: null,
                  },
                },
              },
            },
          ],
        },
      },
    });
  });

  it("scopes curator leaderboard to assigned students", async () => {
    await getLeaderboardForActor({ id: "curator-1", roles: ["curator"] }, 20);

    const where = mockUserFindMany.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({
      curatorAssignments: {
        some: {
          curatorId: "curator-1",
          active: true,
        },
      },
    });
  });

  it("scopes customer observer leaderboard to observed cohorts or projects", async () => {
    const actor: CourseAccessActor = { id: "observer-1", roles: ["customer_observer"] };

    await getLeaderboardForActor(actor, 20);

    const where = mockUserFindMany.mock.calls[0][0].where;
    expect(where.OR[0]).toEqual({
      enrollments: {
        some: {
          status: "ACTIVE",
          cohort: {
            is: {
              OR: [
                { observerCohorts: { some: { userId: "observer-1" } } },
                {
                  project: {
                    is: {
                      observerProjects: {
                        some: { userId: "observer-1" },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });
  });
});
