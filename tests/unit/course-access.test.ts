import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCourseFindFirst = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: { findFirst: mockCourseFindFirst },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    enrollment: {
      findUnique: mockEnrollmentFindUnique,
      findFirst: mockEnrollmentFindFirst,
    },
  }),
}));

const { assertCourseAnalyticsAccess, assertLearningContentAccess } = await import("@/server/modules/courses/access");

beforeEach(() => {
  vi.clearAllMocks();
  mockCourseFindFirst.mockResolvedValue(null);
  mockCourseInstructorFindUnique.mockResolvedValue(null);
  mockEnrollmentFindUnique.mockResolvedValue(null);
  mockEnrollmentFindFirst.mockResolvedValue(null);
});

describe("course access helpers", () => {
  it("denies course analytics to students before course scope lookup", async () => {
    await expect(
      assertCourseAnalyticsAccess({ id: "student-1", roles: ["student"] }, "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });

    expect(mockCourseFindFirst).not.toHaveBeenCalled();
  });

  it("allows scoped observers to read course analytics", async () => {
    mockCourseFindFirst.mockResolvedValue({ id: "course-1" });

    await expect(
      assertCourseAnalyticsAccess({ id: "observer-1", roles: ["customer_observer"] }, "course-1"),
    ).resolves.toBeUndefined();

    expect(mockCourseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "course-1", OR: expect.any(Array) }),
      }),
    );
  });

  it("denies learning content to customer observers", async () => {
    await expect(
      assertLearningContentAccess({ id: "observer-1", roles: ["customer_observer"] }, "course-1"),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });

    expect(mockCourseFindFirst).not.toHaveBeenCalled();
    expect(mockCourseInstructorFindUnique).not.toHaveBeenCalled();
    expect(mockEnrollmentFindUnique).not.toHaveBeenCalled();
  });

  it("allows assigned instructors to open learning content", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1" });

    await expect(
      assertLearningContentAccess({ id: "instructor-1", roles: ["instructor"] }, "course-1"),
    ).resolves.toBeUndefined();

    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: { courseId_userId: { courseId: "course-1", userId: "instructor-1" } },
      select: { courseId: true },
    });
  });

  it("allows active enrolled students to open learning content", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });

    await expect(
      assertLearningContentAccess({ id: "student-1", roles: ["student"] }, "course-1"),
    ).resolves.toBeUndefined();
  });
});
