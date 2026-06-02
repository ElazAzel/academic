import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    enrollment: { findUnique: mockEnrollmentFindUnique },
  }),
}));

const { assertScormRuntimeAccess } = await import("@/server/modules/scorm/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockCourseInstructorFindUnique.mockResolvedValue(null);
  mockEnrollmentFindUnique.mockResolvedValue(null);
});

describe("assertScormRuntimeAccess", () => {
  it("allows admins without extra ownership queries", async () => {
    await expect(
      assertScormRuntimeAccess({ id: "admin-1", roles: ["admin"] }, { lessonId: "lesson-1", courseId: "course-1" }),
    ).resolves.toBeUndefined();

    expect(mockCourseInstructorFindUnique).not.toHaveBeenCalled();
    expect(mockEnrollmentFindUnique).not.toHaveBeenCalled();
  });

  it("allows instructors only for their own course", async () => {
    mockCourseInstructorFindUnique.mockResolvedValue({ courseId: "course-1" });

    await expect(
      assertScormRuntimeAccess(
        { id: "instructor-1", roles: ["instructor"] },
        { lessonId: "lesson-1", courseId: "course-1" },
      ),
    ).resolves.toBeUndefined();

    expect(mockCourseInstructorFindUnique).toHaveBeenCalledWith({
      where: { courseId_userId: { courseId: "course-1", userId: "instructor-1" } },
      select: { courseId: true },
    });
  });

  it("allows active enrolled students", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });

    await expect(
      assertScormRuntimeAccess({ id: "student-1", roles: ["student"] }, { lessonId: "lesson-1", courseId: "course-1" }),
    ).resolves.toBeUndefined();
  });

  it("denies observers even when they have course read permission elsewhere", async () => {
    await expect(
      assertScormRuntimeAccess(
        { id: "observer-1", roles: ["customer_observer"] },
        { lessonId: "lesson-1", courseId: "course-1" },
      ),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });

    expect(mockEnrollmentFindUnique).not.toHaveBeenCalled();
  });

  it("denies students without an active enrollment", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ status: "COMPLETED" });

    await expect(
      assertScormRuntimeAccess({ id: "student-1", roles: ["student"] }, { lessonId: "lesson-1", courseId: "course-1" }),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});
