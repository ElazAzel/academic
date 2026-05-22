import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompletionBasis } from "@/server/modules/progress/service";

const mockLessonFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockModuleFindUnique = vi.hoisted(() => vi.fn());
const mockLessonProgressCount = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockCertificateFindFirst = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockNotificationUserFindUnique = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
const mockIssueCertificate = vi.hoisted(() => vi.fn());
const mockQuizAttemptFindFirst = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindFirst = vi.hoisted(() => vi.fn());
const mockTxLessonProgressUpsert = vi.hoisted(() => vi.fn());
const mockTxLessonProgressFindUnique = vi.hoisted(() => vi.fn());
const mockTxBlockFindUnique = vi.hoisted(() => vi.fn());
const mockTxLessonProgressCount = vi.hoisted(() => vi.fn());
const mockTxBlockProgressFindUnique = vi.hoisted(() => vi.fn());
const mockTxBlockProgressUpsert = vi.hoisted(() => vi.fn());
const mockTxModuleProgressFindUnique = vi.hoisted(() => vi.fn());
const mockTxModuleProgressUpsert = vi.hoisted(() => vi.fn());
const mockTxCourseProgressFindUnique = vi.hoisted(() => vi.fn());
const mockTxCourseProgressUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: {
    CERTIFICATE_COMPLETION_THRESHOLD: 85,
    FEATURE_EMAIL_NOTIFICATIONS: false,
    FEATURE_PUSH_NOTIFICATIONS: false,
    EMAIL_FROM: "noreply@academy.local",
    SMTP_HOST: "localhost",
    SMTP_PORT: 1025,
  },
}));

const mock$queryRaw = vi.hoisted(() => vi.fn());

const mock$transaction = vi.hoisted(() => vi.fn(async (arg: unknown) => {
  if (typeof arg === "function") {
    return (arg as (tx: Record<string, unknown>) => unknown)({
      $queryRaw: mock$queryRaw,
      lessonProgress: { findUnique: mockTxLessonProgressFindUnique, upsert: mockTxLessonProgressUpsert, count: mockTxLessonProgressCount },
      blockProgress: { findUnique: mockTxBlockProgressFindUnique, upsert: mockTxBlockProgressUpsert },
      moduleProgress: { findUnique: mockTxModuleProgressFindUnique, upsert: mockTxModuleProgressUpsert },
      courseProgress: { findUnique: mockTxCourseProgressFindUnique, upsert: mockTxCourseProgressUpsert },
      block: { findUnique: mockTxBlockFindUnique },
    });
  }
  if (Array.isArray(arg)) {
    return Promise.all(arg);
  }
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    lesson: { findUnique: mockLessonFindUnique },
    enrollment: { findUnique: mockEnrollmentFindUnique },
    module: { findUnique: mockModuleFindUnique },
    lessonProgress: { count: mockLessonProgressCount },
    certificate: { findFirst: mockCertificateFindFirst },
    quizAttempt: { findFirst: mockQuizAttemptFindFirst },
    assignmentSubmission: { findFirst: mockAssignmentSubmissionFindFirst },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    user: { findUnique: mockNotificationUserFindUnique },
    auditLog: { create: mockAuditLogCreate },
    $transaction: mock$transaction,
  }),
}));

vi.mock("@/server/modules/notifications/service", () => ({
  createNotification: mockCreateNotification,
}));

vi.mock("@/server/modules/certificates/service", () => ({
  issueCertificate: mockIssueCertificate,
}));

const { markLessonProgress } = await import("@/server/modules/progress/service");

describe("markLessonProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxLessonProgressFindUnique.mockResolvedValue(null);
    mockTxBlockProgressFindUnique.mockResolvedValue(null);
    mockTxModuleProgressFindUnique.mockResolvedValue(null);
    mockTxCourseProgressFindUnique.mockResolvedValue(null);
    mockCreateNotification.mockResolvedValue({ id: "notification-1" });
    mockIssueCertificate.mockResolvedValue({ id: "certificate-1" });
    mockQuizAttemptFindFirst.mockResolvedValue(null);
    mockAssignmentSubmissionFindFirst.mockResolvedValue(null);
  });

  it("updates lesson progress and cascades to module and course", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      moduleId: "m1",
      blockId: null,
      quizzes: [],
      assignments: [],
      module: {
        id: "m1",
        order: 1,
        lessons: [{ id: "l1", isRequired: true, order: 1 }],
        course: {
          id: "c1",
          completionThreshold: 85,
          traversalMode: "open",
          modules: [
            {
              id: "m1",
              order: 1,
              lessons: [{ id: "l1", isRequired: true, order: 1 }],
            },
          ],
        },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });
    mockTxLessonProgressCount.mockResolvedValue(1);
    mockTxLessonProgressUpsert.mockResolvedValue({
      id: "lp1",
      percent: 100,
      status: "COMPLETED",
      userId: "u1",
      lessonId: "l1",
    });
    mockTxModuleProgressUpsert.mockResolvedValue({
      id: "mp1",
      percent: 100,
      status: "COMPLETED",
    });
    mockTxCourseProgressUpsert.mockResolvedValue({
      id: "cp1",
      percent: 100,
      status: "COMPLETED",
    });
    mockCertificateFindFirst.mockResolvedValue({ id: "cert1" });
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "n1" });
    mockNotificationUserFindUnique.mockResolvedValue({ email: "student@example.com" });
    mockModuleFindUnique.mockResolvedValue({ title: "Module 1" });

    const result = await markLessonProgress("u1", "l1", 100);
    expect(result.lessonProgress.percent).toBe(100);
    expect(result.lessonProgress.status).toBe("COMPLETED");
    expect(result.moduleProgress.status).toBe("COMPLETED");
    expect(result.courseProgress.status).toBe("COMPLETED");
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({ event: "module_completed" }));
  });

  it("issues a certificate when course percent reaches the course threshold", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l9",
      moduleId: "m1",
      blockId: null,
      quizzes: [],
      assignments: [],
      module: {
        id: "m1",
        order: 1,
        lessons: [{ id: "l9", isRequired: true, order: 9 }],
        course: {
          id: "c1",
          completionThreshold: 90,
          traversalMode: "open",
          modules: [
            {
              id: "m1",
              order: 1,
              lessons: Array.from({ length: 10 }, (_, index) => ({ id: `l${index + 1}`, isRequired: true, order: index + 1 })),
            },
          ],
        },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });
    mockTxLessonProgressCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(9);
    mockTxLessonProgressUpsert.mockResolvedValue({
      id: "lp9",
      percent: 100,
      status: "COMPLETED",
      userId: "u1",
      lessonId: "l9",
    });
    mockTxModuleProgressUpsert.mockResolvedValue({
      id: "mp1",
      percent: 100,
      status: "COMPLETED",
    });
    mockTxCourseProgressUpsert.mockResolvedValue({
      id: "cp1",
      percent: 90,
      status: "IN_PROGRESS",
    });
    mockCertificateFindFirst.mockResolvedValue(null);
    mockModuleFindUnique.mockResolvedValue({ title: "Module 1" });

    const result = await markLessonProgress("u1", "l9", 100);

    expect(result.coursePercent).toBe(90);
    expect(mockCertificateFindFirst).toHaveBeenCalledWith({ where: { userId: "u1", courseId: "c1" } });
    expect(mockIssueCertificate).toHaveBeenCalledWith({ userId: "u1", courseId: "c1" }, "u1");
  });

  it("does not resend completion notifications for already completed modules", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      moduleId: "m1",
      blockId: null,
      quizzes: [],
      assignments: [],
      module: {
        id: "m1",
        order: 1,
        lessons: [{ id: "l1", isRequired: true, order: 1 }],
        course: {
          id: "c1",
          completionThreshold: 85,
          traversalMode: "open",
          modules: [{ id: "m1", order: 1, lessons: [{ id: "l1", isRequired: true, order: 1 }] }],
        },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });
    mockTxModuleProgressFindUnique.mockResolvedValue({ status: "COMPLETED", completedAt: new Date("2026-05-01T00:00:00.000Z") });
    mockTxLessonProgressCount.mockResolvedValue(1);
    mockTxLessonProgressUpsert.mockResolvedValue({ id: "lp1", percent: 100, status: "COMPLETED" });
    mockTxModuleProgressUpsert.mockResolvedValue({ id: "mp1", percent: 100, status: "COMPLETED" });
    mockTxCourseProgressUpsert.mockResolvedValue({ id: "cp1", percent: 100, status: "COMPLETED" });
    mockCertificateFindFirst.mockResolvedValue({ id: "cert1" });

    await markLessonProgress("u1", "l1", 100);

    expect(mockCreateNotification).not.toHaveBeenCalledWith(expect.objectContaining({ event: "module_completed" }));
  });

  it("does not complete a quiz lesson until the student has a passed attempt", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      moduleId: "m1",
      blockId: null,
      quizzes: [{ id: "quiz-1" }],
      assignments: [],
      module: {
        id: "m1",
        order: 1,
        lessons: [{ id: "l1", isRequired: true, order: 1 }],
        course: {
          id: "c1",
          completionThreshold: 85,
          traversalMode: "open",
          modules: [{ id: "m1", order: 1, lessons: [{ id: "l1", isRequired: true, order: 1 }] }],
        },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "ACTIVE" });
    mockTxLessonProgressCount.mockResolvedValue(0);
    mockTxLessonProgressUpsert.mockResolvedValue({
      id: "lp1",
      percent: 99,
      status: "IN_PROGRESS",
    });
    mockTxModuleProgressUpsert.mockResolvedValue({ id: "mp1", percent: 0, status: "IN_PROGRESS" });
    mockTxCourseProgressUpsert.mockResolvedValue({ id: "cp1", percent: 0, status: "IN_PROGRESS" });
    mockCertificateFindFirst.mockResolvedValue(null);

    const result = await markLessonProgress("u1", "l1", 100);

    expect(mockQuizAttemptFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          quizId: { in: ["quiz-1"] },
          userId: "u1",
          passed: true,
        }),
      }),
    );
    expect(result.lessonProgress.percent).toBe(99);
    expect(result.lessonProgress.status).toBe("IN_PROGRESS");
    expect(mockIssueCertificate).not.toHaveBeenCalled();
  });

  it("rejects progress for non-enrolled user", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      blockId: null,
      module: {
        id: "m1",
        order: 1,
        lessons: [],
        course: { id: "c1", completionThreshold: 85, traversalMode: "open", modules: [] },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue(null);

    await expect(markLessonProgress("u1", "l1", 50)).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("rejects progress for inactive enrollment", async () => {
    mockLessonFindUnique.mockResolvedValue({
      id: "l1",
      moduleId: "m1",
      blockId: null,
      quizzes: [],
      assignments: [],
      module: {
        id: "m1",
        order: 1,
        lessons: [],
        course: { id: "c1", completionThreshold: 85, traversalMode: "open", modules: [] },
      },
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", status: "INACTIVE" });

    await expect(markLessonProgress("u1", "l1", 50)).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
});

describe("getCompletionBasis", () => {
  it("returns only required lessons when some are required", () => {
    const lessons = [
      { id: "l1", isRequired: true },
      { id: "l2", isRequired: false },
      { id: "l3", isRequired: true },
    ];
    const result = getCompletionBasis(lessons);
    expect(result).toHaveLength(2);
    expect(result.every((l) => l.isRequired)).toBe(true);
  });

  it("returns all lessons when none are required", () => {
    const lessons = [
      { id: "l1", isRequired: false },
      { id: "l2", isRequired: false },
    ];
    const result = getCompletionBasis(lessons);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when input is empty", () => {
    const result = getCompletionBasis([]);
    expect(result).toHaveLength(0);
  });

  it("handles null isRequired values", () => {
    const lessons = [
      { id: "l1", isRequired: null },
      { id: "l2", isRequired: true },
    ];
    const result = getCompletionBasis(lessons);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("l2");
  });
});
