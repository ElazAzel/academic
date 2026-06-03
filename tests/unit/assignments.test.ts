import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockCount = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockAuditCreate = vi.hoisted(() => vi.fn());
const mockSubmissionFindUnique = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockCourseInstructorFindUnique = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindFirst = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockOutboxEventCreate = vi.hoisted(() => vi.fn());
const mockAchievementUpsert = vi.hoisted(() => vi.fn());
const mockUserAchievementFindUnique = vi.hoisted(() => vi.fn());
const mockUserAchievementCreate = vi.hoisted(() => vi.fn());

const mockTx$queryRaw = vi.hoisted(() => vi.fn());
const mockTxCount = vi.hoisted(() => vi.fn());
const mockTxCreate = vi.hoisted(() => vi.fn());

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
    assignment: { findUnique: mockFindUnique, findMany: mockAssignmentFindMany },
    enrollment: { findUnique: mockEnrollmentFindUnique },
    assignmentSubmission: { count: mockCount, create: mockCreate, update: mockUpdate, findUnique: mockSubmissionFindUnique },
    auditLog: { create: mockAuditCreate },
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
    courseInstructor: { findUnique: mockCourseInstructorFindUnique },
    curatorAssignment: { findFirst: mockCuratorAssignmentFindFirst },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    outboxEvent: { create: mockOutboxEventCreate },
    achievement: { upsert: mockAchievementUpsert },
    userAchievement: { findUnique: mockUserAchievementFindUnique, create: mockUserAchievementCreate },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: Record<string, unknown>) => unknown)({
          $queryRaw: mockTx$queryRaw,
          assignmentSubmission: { count: mockTxCount, create: mockTxCreate },
        });
      }
      if (Array.isArray(arg)) return Promise.all(arg);
      return undefined;
    }),
  }),
}));

const { submitAssignment, reviewSubmission, listAssignments } = await import("@/server/modules/assignments/service");

beforeEach(() => {
  vi.clearAllMocks();
  mockAchievementUpsert.mockResolvedValue({ id: "achievement-first-assignment" });
  mockUserAchievementFindUnique.mockResolvedValue({ id: "existing-achievement" });
  mockUserAchievementCreate.mockResolvedValue({ id: "user-achievement-1" });
});

describe("listAssignments", () => {
  beforeEach(() => {
    mockAssignmentFindMany.mockResolvedValue([]);
  });

  it("scopes student assignment lists through course-level and lesson-level enrollments", async () => {
    await listAssignments("student-1", ["student"]);

    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              course: {
                enrollments: {
                  some: {
                    userId: "student-1",
                    status: { in: ["ACTIVE", "COMPLETED"] },
                  },
                },
              },
            },
            {
              lesson: {
                module: {
                  course: {
                    enrollments: {
                      some: {
                        userId: "student-1",
                        status: { in: ["ACTIVE", "COMPLETED"] },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      }),
    );
  });

  it("scopes instructor assignment lists through owned course-level and lesson-level assignments", async () => {
    await listAssignments("instructor-1", ["instructor"]);

    expect(mockAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { course: { instructors: { some: { userId: "instructor-1" } } } },
            { lesson: { module: { course: { instructors: { some: { userId: "instructor-1" } } } } } },
          ],
        },
      }),
    );
  });
});

describe("submitAssignment", () => {
  it("throws 404 when assignment does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      submitAssignment({ assignmentId: "missing", userId: "u1", answerText: "hello" })
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("throws 403 when attempt limit exceeded", async () => {
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 2, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockTxCount.mockResolvedValue(2);

    await expect(
      submitAssignment({ assignmentId: "a1", userId: "u1", answerText: "hello" })
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("allows first attempt when maxAttempts is 1", async () => {
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 1, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockTxCount.mockResolvedValue(0);
    mockTxCreate.mockResolvedValue({
      id: "sub1",
      assignmentId: "a1",
      userId: "u1",
      answerText: "hello",
      attemptNumber: 1,
      status: "SUBMITTED",
    });
    mockUserUpdate.mockResolvedValue({ xp: 40 });

    const result = await submitAssignment({ assignmentId: "a1", userId: "u1", answerText: "hello" });
    expect(result.attemptNumber).toBe(1);
    expect(result.status).toBe("SUBMITTED");
  });

  it("creates submission with fileUrl", async () => {
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 3, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockTxCount.mockResolvedValue(0);
    mockTxCreate.mockResolvedValue({
      id: "sub2",
      assignmentId: "a1",
      userId: "u1",
      fileUrl: "/uploads/doc.pdf",
      attemptNumber: 1,
      status: "SUBMITTED",
    });
    mockUserUpdate.mockResolvedValue({ xp: 40 });

    const result = await submitAssignment({ assignmentId: "a1", userId: "u1", fileUrl: "/uploads/doc.pdf" });
    expect(result.fileUrl).toBe("/uploads/doc.pdf");
    expect(result.status).toBe("SUBMITTED");
  });

  it("does not leak raw XP or achievement failures after a successful submission", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockFindUnique.mockResolvedValue({ id: "a1", maxAttempts: 3, courseId: "c1" });
    mockEnrollmentFindUnique.mockResolvedValue({ status: "ACTIVE" });
    mockTxCount.mockResolvedValue(0);
    mockTxCreate.mockResolvedValue({
      id: "sub3",
      assignmentId: "a1",
      userId: "u1",
      answerText: "hello",
      attemptNumber: 1,
      status: "SUBMITTED",
    });
    mockUserUpdate.mockRejectedValueOnce(new Error("postgres://secret-assignment-xp"));
    mockAchievementUpsert.mockRejectedValueOnce(new Error("postgres://secret-assignment-achievement"));

    try {
      const result = await submitAssignment({ assignmentId: "a1", userId: "u1", answerText: "hello" });

      expect(result.status).toBe("SUBMITTED");
      expect(result.xp).toBeNull();
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-assignment-xp");
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-assignment-achievement");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[submitAssignment] Failed to award XP",
        expect.objectContaining({ code: "internal_error", statusCode: 500 }),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[submitAssignment] Failed to check achievements",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

describe("reviewSubmission", () => {
  beforeEach(() => {
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "n1" });
    mockSubmissionFindUnique.mockResolvedValue({
      id: "sub1",
      userId: "student1",
      assignment: {
        courseId: "c1",
        lesson: { module: { courseId: "c1" } }
      }
    });
    mockUserFindUnique.mockResolvedValue({
      id: "r1",
      roles: [{ role: { key: "admin" } }]
    });
  });

  it("sets ACCEPTED status when accepted is true", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      assignmentId: "a1",
      userId: "student1",
      status: "ACCEPTED",
      score: 85,
      feedback: "Good job",
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    const result = await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: true, score: 85, feedback: "Good job" });
    expect(result.status).toBe("ACCEPTED");
    expect(result.score).toBe(85);
    expect(result.feedback).toBe("Good job");
  });

  it("sets NEEDS_REVISION status when accepted is false", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      assignmentId: "a1",
      userId: "student1",
      status: "NEEDS_REVISION",
      score: 40,
      feedback: "Please revise",
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    const result = await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: false, score: 40, feedback: "Please revise" });
    expect(result.status).toBe("NEEDS_REVISION");
  });

  it("allows review without score or feedback", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      assignmentId: "a1",
      userId: "student1",
      status: "ACCEPTED",
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    const result = await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: true });
    expect(result.status).toBe("ACCEPTED");
  });

  it("rejects review from unauthorized user", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "r2",
      roles: [{ role: { key: "student" } }]
    });
    mockCourseInstructorFindUnique.mockResolvedValue(null);
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);

    await expect(
      reviewSubmission({ submissionId: "sub1", reviewerId: "r2", accepted: true })
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("creates an in-app notification for the reviewed student", async () => {
    mockUpdate.mockResolvedValue({
      id: "sub1",
      assignmentId: "a1",
      userId: "student1",
      status: "ACCEPTED",
      score: 95,
      reviewedById: "r1",
      reviewedAt: new Date(),
    });

    await reviewSubmission({ submissionId: "sub1", reviewerId: "r1", accepted: true, score: 95 });

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student1",
          type: "assignment_reviewed",
          channel: "in_app",
          refType: "assignment_submission",
          refId: "sub1",
        }),
      }),
    );
  });
});
