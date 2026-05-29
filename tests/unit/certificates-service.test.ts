import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCourseProgressFindUnique = vi.hoisted(() => vi.fn());
const mockCourseFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindFirst = vi.hoisted(() => vi.fn());
const mockLessonProgressCount = vi.hoisted(() => vi.fn());
const mockCertificateCreate = vi.hoisted(() => vi.fn());
const mockCertificateFindFirst = vi.hoisted(() => vi.fn());
const mockCertificateFindFirstOrThrow = vi.hoisted(() => vi.fn());
const mockCertificateFindUnique = vi.hoisted(() => vi.fn());
const mockCertificateUpdate = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockOutboxEventCreate = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "https://academy.local",
    CERTIFICATE_COMPLETION_THRESHOLD: 85,
    FEATURE_EMAIL_NOTIFICATIONS: false,
    FEATURE_PUSH_NOTIFICATIONS: false,
    EMAIL_FROM: "noreply@academy.local",
    SMTP_HOST: "localhost",
    SMTP_PORT: 1025,
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    courseProgress: { findUnique: mockCourseProgressFindUnique },
    course: { findUniqueOrThrow: mockCourseFindUniqueOrThrow },
    assignmentSubmission: { findFirst: mockAssignmentSubmissionFindFirst },
    lessonProgress: { count: mockLessonProgressCount },
    enrollment: {
      findUnique: mockEnrollmentFindUnique,
      create: mockEnrollmentCreate,
    },
    certificate: {
      create: mockCertificateCreate,
      findFirst: mockCertificateFindFirst,
      findFirstOrThrow: mockCertificateFindFirstOrThrow,
      findUnique: mockCertificateFindUnique,
      update: mockCertificateUpdate,
    },
    auditLog: { create: mockAuditLogCreate },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    outboxEvent: { create: mockOutboxEventCreate },
    user: { findUnique: mockUserFindUnique },
  }),
}));

const { claimCertificateForCourse, issueCertificate, revokeCertificate } = await import("@/server/modules/certificates/service");

describe("certificate notification and audit events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
    mockUserFindUnique.mockResolvedValue({ email: "student@academy.local" });
    mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
    mockLessonProgressCount.mockResolvedValue(0);
    mockCertificateFindFirst.mockResolvedValue(null);
    mockCertificateFindFirstOrThrow.mockResolvedValue({
      id: "certificate-1",
      userId: "student-1",
      courseId: "course-1",
      number: "ASA-2026-TEST",
      verificationCode: "verification-1",
      issuedAt: new Date("2026-05-01T00:00:00.000Z"),
    });
    mockEnrollmentFindUnique.mockResolvedValue({ id: "enrollment-1", status: "ACTIVE" });
    mockEnrollmentCreate.mockResolvedValue({ id: "enrollment-1" });
  });

  it("creates audit and in-app notification when certificate is issued", async () => {
    mockCourseProgressFindUnique.mockResolvedValue({ enrollmentId: "enrollment-1", percent: 100 });
    mockCourseFindUniqueOrThrow.mockResolvedValue({ id: "course-1", finalAssignmentId: null, modules: [] });
    mockCertificateCreate.mockResolvedValue({
      id: "certificate-1",
      userId: "student-1",
      courseId: "course-1",
      enrollmentId: "enrollment-1",
      verificationCode: "verification-1",
    });

    await issueCertificate({ userId: "student-1", courseId: "course-1" }, "admin-1");

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin-1",
          action: "certificate.issued",
          entity: "certificate",
          entityId: "certificate-1",
        }),
      }),
    );
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: "certificate_available",
          channel: "in_app",
          refType: "certificate",
          refId: "certificate-1",
        }),
      }),
    );
  });

  it("uses the course completion threshold when issuing certificates", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "enrollment-1", status: "ACTIVE" });
    mockCourseProgressFindUnique.mockResolvedValue({ enrollmentId: "enrollment-1", percent: 75 });
    mockCourseFindUniqueOrThrow.mockResolvedValue({
      id: "course-1",
      completionThreshold: 70,
      finalAssignmentId: null,
      modules: [],
    });
    mockCertificateCreate.mockResolvedValue({
      id: "certificate-1",
      userId: "student-1",
      courseId: "course-1",
      enrollmentId: "enrollment-1",
      verificationCode: "verification-1",
    });

    await issueCertificate({ userId: "student-1", courseId: "course-1" }, "student-1");

    expect(mockCertificateCreate).toHaveBeenCalled();
  });

  it("returns an existing certificate when the student claims it again", async () => {
    const existingCertificate = {
      id: "certificate-existing",
      userId: "student-1",
      courseId: "course-1",
      number: "ASA-2026-EXIST",
      verificationCode: "verification-existing",
      issuedAt: new Date("2026-05-01T00:00:00.000Z"),
    };
    mockCertificateFindFirst.mockResolvedValue(existingCertificate);

    const result = await claimCertificateForCourse("student-1", "course-1");

    expect(result).toEqual({ certificate: existingCertificate, alreadyIssued: true });
    expect(mockCertificateCreate).not.toHaveBeenCalled();
  });

  it("blocks certificates when required quiz or assignment lessons are not completed", async () => {
    mockCourseProgressFindUnique.mockResolvedValue({ enrollmentId: "enrollment-1", percent: 100 });
    mockCourseFindUniqueOrThrow.mockResolvedValue({
      id: "course-1",
      finalAssignmentId: null,
      modules: [
        {
          lessons: [
            {
              id: "lesson-1",
              isRequired: true,
              quizzes: [{ id: "quiz-1" }],
              assignments: [],
            },
          ],
        },
      ],
    });
    mockLessonProgressCount.mockResolvedValue(0);

    await expect(issueCertificate({ userId: "student-1", courseId: "course-1" }, "student-1")).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
    expect(mockCertificateCreate).not.toHaveBeenCalled();
  });

  it("creates audit and in-app notification when certificate is revoked", async () => {
    const revokedAt = new Date("2026-05-18T00:00:00.000Z");
    mockCertificateFindUnique.mockResolvedValue({
      id: "certificate-1",
      userId: "student-1",
      courseId: "course-1",
      revokedAt: null,
    });
    mockCertificateUpdate.mockResolvedValue({
      id: "certificate-1",
      userId: "student-1",
      courseId: "course-1",
      revokedAt,
    });

    await revokeCertificate("certificate-1", "admin-1");

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin-1",
          action: "certificate.revoked",
          entity: "certificate",
          entityId: "certificate-1",
        }),
      }),
    );
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: "certificate_revoked",
          channel: "in_app",
          refType: "certificate",
          refId: "certificate-1",
        }),
      }),
    );
  });
});
