import { beforeEach, describe, expect, it, vi } from "vitest";

const mock$queryRaw = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $queryRaw: mock$queryRaw,
    user: { findMany: mockUserFindMany },
  }),
}));

const { searchAcademy } = await import("@/server/modules/search/service");

describe("searchAcademy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("returns results for course title match", async () => {
    mock$queryRaw
      .mockResolvedValueOnce([{ id: "c1", title: "AI Basics", description: "Intro to AI" }])
      .mockResolvedValueOnce([]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await searchAcademy("AI Basics");
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].title).toBe("AI Basics");
    expect(result.lessons).toHaveLength(0);
    expect(result.users).toHaveLength(0);
  });

  it("returns empty results for no match", async () => {
    mock$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await searchAcademy("zzzzzzzzz");
    expect(result.courses).toHaveLength(0);
    expect(result.lessons).toHaveLength(0);
    expect(result.users).toHaveLength(0);
  });

  it("returns empty result for empty query", async () => {
    const result = await searchAcademy("  ");
    expect(result).toEqual({ courses: [], lessons: [], users: [] });
  });

  it("handles users search when includeUsers is true", async () => {
    mock$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockUserFindMany.mockResolvedValue([
      { id: "u1", email: "alice@test.com", name: "Alice" },
    ]);

    const result = await searchAcademy("Alice", true);
    expect(result.users).toHaveLength(1);
    expect(result.users[0].name).toBe("Alice");
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { email: { contains: "Alice", mode: "insensitive" } },
            { name: { contains: "Alice", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("does not search users when includeUsers is false", async () => {
    mock$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await searchAcademy("test", false);
    expect(result.users).toEqual([]);
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });
});
