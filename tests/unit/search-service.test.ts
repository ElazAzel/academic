import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseAccessActor } from "@/server/modules/courses/access";

const mockCourseFindMany = vi.hoisted(() => vi.fn());
const mockLessonFindMany = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: { findMany: mockCourseFindMany },
    lesson: { findMany: mockLessonFindMany },
    user: { findMany: mockUserFindMany },
  }),
}));

const { searchAcademy } = await import("@/server/modules/search/service");
const studentActor: CourseAccessActor = { id: "student-1", roles: ["student"] };
const adminActor: CourseAccessActor = { id: "admin-1", roles: ["admin"] };

describe("searchAcademy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("returns results for course title match", async () => {
    mockCourseFindMany.mockResolvedValue([{ id: "c1", title: "AI Basics", description: "Intro to AI" }]);
    mockLessonFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await searchAcademy("AI Basics", studentActor);
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].title).toBe("AI Basics");
    expect(result.lessons).toHaveLength(0);
    expect(result.users).toHaveLength(0);
    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            expect.objectContaining({ OR: expect.any(Array) }),
            expect.objectContaining({ OR: expect.any(Array) }),
          ],
        }),
      }),
    );
  });

  it("returns empty results for no match", async () => {
    mockCourseFindMany.mockResolvedValue([]);
    mockLessonFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    const result = await searchAcademy("zzzzzzzzz", studentActor);
    expect(result.courses).toHaveLength(0);
    expect(result.lessons).toHaveLength(0);
    expect(result.users).toHaveLength(0);
  });

  it("returns empty result for empty query", async () => {
    const result = await searchAcademy("  ", studentActor);
    expect(result).toEqual({ courses: [], lessons: [], users: [] });
  });

  it("handles users search when includeUsers is true", async () => {
    mockCourseFindMany.mockResolvedValue([]);
    mockLessonFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([
      { id: "u1", email: "alice@test.com", name: "Alice" },
    ]);

    const result = await searchAcademy("Alice", adminActor, true);
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
    mockCourseFindMany.mockResolvedValue([]);
    mockLessonFindMany.mockResolvedValue([]);

    const result = await searchAcademy("test", studentActor, false);
    expect(result.users).toEqual([]);
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("scopes lesson search through readable course scope", async () => {
    mockCourseFindMany.mockResolvedValue([]);
    mockLessonFindMany.mockResolvedValue([{ id: "lesson-1", title: "Scoped lesson", summary: null }]);

    const result = await searchAcademy("lesson", studentActor);

    expect(result.lessons).toHaveLength(1);
    expect(mockLessonFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          module: {
            course: expect.objectContaining({ OR: expect.any(Array) }),
          },
        }),
      }),
    );
  });
});
