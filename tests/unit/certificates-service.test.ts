import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCourseProgressFindUnique = vi.hoisted(() => vi.fn());
const mockCourseFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindFirst = vi.hoisted(() => vi.fn());
const mockCertificateCreate = vi.hoisted(() => vi.fn());
const mockCertificateFindUnique = vi.hoisted(() => vi.fn());
const mockCertificateUpdate = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

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
    certificate: {
      create: mockCertificateCreate,
      findUnique: mockCertificateFindUnique,
      update: mockCertificateUpdate,
    },
    auditLog: { create: mockAuditLogCreate },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    user: { findUnique: mockUserFindUnique },
  }),
}));

const { issueCertificate, revokeCertificate } = await import("@/server/modules/certificates/service");

describe("certificate notification and audit events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
    mockUserFindUnique.mockResolvedValue({ email: "student@academy.local" });
    mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("creates audit and in-app notification when certificate is issued", async () => {
    mockCourseProgressFindUnique.mockResolvedValue({ enrollmentId: "enrollment-1", percent: 100 });
    mockCourseFindUniqueOrThrow.mockResolvedValue({ id: "course-1", finalAssignmentId: null });
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
