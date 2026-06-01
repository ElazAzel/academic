import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCohortFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockModuleFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    cohort: { findUnique: mockCohortFindUnique },
    user: { findUnique: mockUserFindUnique },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    module: { findMany: mockModuleFindMany },
    block: { findFirst: vi.fn() },
    blockCohortDeadline: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    cohortDeadline: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    curatorAssignment: { findMany: vi.fn() },
    course: { findMany: vi.fn() },
  }),
}));

const { getCohortBlockDeadlines } =
  await import("@/server/modules/deadlines/service");

function actorWithRoles(...roles: string[]) {
  return {
    roles: roles.map((key) => ({ role: { key } })),
  };
}

describe("deadlines service access scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCohortFindUnique.mockResolvedValue({
      id: "cohort-1",
      name: "Поток 1",
      courseId: "course-1",
    });
    mockModuleFindMany.mockResolvedValue([]);
  });

  it("denies deadline reads for non-manager roles before loading modules", async () => {
    mockUserFindUnique.mockResolvedValue(actorWithRoles("student"));

    await expect(
      getCohortBlockDeadlines("cohort-1", "student-1"),
    ).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
    expect(mockModuleFindMany).not.toHaveBeenCalled();
    expect(mockCourseInstructorFindUnique).not.toHaveBeenCalled();
  });

  it("denies deadline reads for instructors outside the cohort course", async () => {
    mockUserFindUnique.mockResolvedValue(actorWithRoles("instructor"));
    mockCourseInstructorFindUnique.mockResolvedValue(null);

    await expect(
      getCohortBlockDeadlines("cohort-1", "instructor-1"),
    ).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: {
        courseId_userId: { courseId: "course-1", userId: "instructor-1" },
      },
    });
    expect(mockModuleFindMany).not.toHaveBeenCalled();
  });

  it("allows admins to read cohort deadlines without instructor ownership lookup", async () => {
    mockUserFindUnique.mockResolvedValue(actorWithRoles("admin"));

    const result = await getCohortBlockDeadlines("cohort-1", "admin-1");

    expect(result).toEqual([]);
    expect(mockCourseInstructorFindUnique).not.toHaveBeenCalled();
    expect(mockModuleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: "course-1" },
      }),
    );
  });

  it("allows assigned instructors to read cohort deadlines", async () => {
    mockUserFindUnique.mockResolvedValue(actorWithRoles("instructor"));
    mockCourseInstructorFindUnique.mockResolvedValue({
      courseId: "course-1",
      userId: "instructor-1",
    });

    const result = await getCohortBlockDeadlines("cohort-1", "instructor-1");

    expect(result).toEqual([]);
    expect(mockModuleFindMany).toHaveBeenCalled();
  });
});
