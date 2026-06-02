import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseStatus } from "@prisma/client";

const mockCourseCreate = vi.hoisted(() => vi.fn());
const mockCourseFindMany = vi.hoisted(() => vi.fn());
const mockCourseFindUnique = vi.hoisted(() => vi.fn());
const mockModuleFindUnique = vi.hoisted(() => vi.fn());
const mockLessonCreate = vi.hoisted(() => vi.fn());
const mockLessonFindFirst = vi.hoisted(() => vi.fn());
const mockEnrollmentUpsert = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockNotificationUserFindUnique = vi.hoisted(() => vi.fn());
const mockOutboxEventCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: {
    FEATURE_EMAIL_NOTIFICATIONS: false,
    FEATURE_PUSH_NOTIFICATIONS: false,
    EMAIL_FROM: "noreply@academy.local",
    SMTP_HOST: "localhost",
    SMTP_PORT: 1025,
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: {
      create: mockCourseCreate,
      findMany: mockCourseFindMany,
      findUnique: mockCourseFindUnique,
    },
    module: {
      findUnique: mockModuleFindUnique,
    },
    lesson: {
      create: mockLessonCreate,
      findFirst: mockLessonFindFirst,
    },
    enrollment: {
      upsert: mockEnrollmentUpsert,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    outboxEvent: { create: mockOutboxEventCreate },
    user: { findUnique: mockNotificationUserFindUnique },
  }),
}));

const { createCourse, createLesson, getCourse, enrollStudent, listCoursesForActor } = await import("@/server/modules/courses/service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCoursesForActor", () => {
  it("scopes student course lists to readable published courses", async () => {
    mockCourseFindMany.mockResolvedValue([]);

    await listCoursesForActor({ id: "student-1", roles: ["student"] });

    expect(mockCourseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            expect.objectContaining({ OR: expect.any(Array) }),
            { status: CourseStatus.PUBLISHED },
          ],
        },
      }),
    );
  });

  it("does not query draft course lists for student actors", async () => {
    const result = await listCoursesForActor({ id: "student-1", roles: ["student"] }, CourseStatus.DRAFT);

    expect(result).toEqual([]);
    expect(mockCourseFindMany).not.toHaveBeenCalled();
  });
});

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

describe("createLesson", () => {
  it("appends at the next module order after a lesson order collision", async () => {
    mockModuleFindUnique.mockResolvedValue({ id: "m1", courseId: "c1" });
    mockNotificationUserFindUnique.mockResolvedValue({
      id: "actor1",
      roles: [{ role: { key: "admin" } }],
    });
    mockLessonFindFirst.mockResolvedValue({ order: 2 });
    mockLessonCreate
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({ id: "l3", order: 3 });

    const lesson = await createLesson(
      "m1",
      {
        title: "New lesson",
        order: 2,
        type: "MIXED",
        content: {},
        durationMinutes: 30,
      },
      "actor1",
    );

    expect(lesson.order).toBe(3);
    expect(mockLessonCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ moduleId: "m1", order: 2 }) }),
    );
    expect(mockLessonFindFirst).toHaveBeenCalledWith({
      where: { moduleId: "m1" },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    expect(mockLessonCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ moduleId: "m1", order: 3 }) }),
    );
  });
});

describe("enrollStudent", () => {
  beforeEach(() => {
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "n1" });
    mockNotificationUserFindUnique.mockResolvedValue({ email: "student@test.com" });
  });

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

  it("notifies the student with default in-app channel", async () => {
    mockEnrollmentUpsert.mockResolvedValue({ id: "e3", userId: "u3", courseId: "c3", status: "ACTIVE", cohortId: "coh1" });

    await enrollStudent({ userId: "u3", courseId: "c3", cohortId: "coh1" }, "actor1");

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u3",
          type: "access_granted",
          channel: "in_app",
          refType: "enrollment",
          refId: "e3",
        }),
      }),
    );
  });
});
