import { describe, expect, it, vi } from "vitest";

const mockCourseCreate = vi.hoisted(() => vi.fn());
const mockCourseFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentUpsert = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: {
      create: mockCourseCreate,
      findUnique: mockCourseFindUnique,
    },
    enrollment: {
      upsert: mockEnrollmentUpsert,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
  }),
}));

const { createCourse, getCourse, enrollStudent } = await import("@/server/modules/courses/service");

describe("createCourse", () => {
  it("creates a course with a generated slug", async () => {
    mockCourseCreate.mockResolvedValue({
      id: "c1",
      slug: "test-course-lxz",
      title: "Test Course",
      description: "Desc",
      goal: null,
      coverUrl: null,
      durationHours: 10,
      traversalMode: "sequential",
    });

    const result = await createCourse(
      { title: "Test Course", description: "Desc", durationHours: 10, traversalMode: "sequential" },
      "actor1",
      ["admin"],
    );

    expect(result.title).toBe("Test Course");
    expect(result.slug).toMatch(/^test-course-/);
    expect(mockCourseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Test Course",
          slug: expect.stringMatching(/^test-course-/),
        }),
      }),
    );
  });

  it("creates an audit log entry", async () => {
    mockCourseCreate.mockResolvedValue({ id: "c2", slug: "another-abc", title: "Another" });

    await createCourse(
      { title: "Another", description: "Desc", durationHours: 5, traversalMode: "open" },
      "actor1",
      ["admin"],
    );

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "course.created",
          entity: "course",
          actorId: "actor1",
        }),
      }),
    );
  });
});

describe("getCourse", () => {
  it("throws 404 for non-existing course", async () => {
    mockCourseFindUnique.mockResolvedValue(null);

    await expect(getCourse("missing-id")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});

describe("enrollStudent", () => {
  it("creates enrollment with ACTIVE status", async () => {
    mockEnrollmentUpsert.mockResolvedValue({
      id: "e1",
      userId: "u1",
      courseId: "c1",
      status: "ACTIVE",
      cohortId: null,
    });

    const result = await enrollStudent({ userId: "u1", courseId: "c1" }, "actor1");
    expect(result.status).toBe("ACTIVE");
    expect(mockEnrollmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_courseId: { userId: "u1", courseId: "c1" } },
        create: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("creates audit log on enrollment", async () => {
    mockEnrollmentUpsert.mockResolvedValue({ id: "e2", userId: "u2", courseId: "c2", status: "ACTIVE", cohortId: null });

    await enrollStudent({ userId: "u2", courseId: "c2" }, "actor1");

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "enrollment.upserted",
          actorId: "actor1",
        }),
      }),
    );
  });
});
