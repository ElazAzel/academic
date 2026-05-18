import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerificationTokenFindUnique = vi.hoisted(() => vi.fn());
const mockVerificationTokenDelete = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({
  env: {
    FEATURE_EMAIL_NOTIFICATIONS: false,
    FEATURE_PUSH_NOTIFICATIONS: false,
    EMAIL_FROM: "noreply@academy.local",
    SMTP_HOST: "localhost",
    SMTP_PORT: 1025,
  },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mockHashPassword,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    verificationToken: {
      findUnique: mockVerificationTokenFindUnique,
      delete: mockVerificationTokenDelete,
    },
    user: {
      update: mockUserUpdate,
      findUnique: mockUserFindUnique,
    },
    auditLog: { create: mockAuditLogCreate },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
  }),
}));

const { resetPassword } = await import("@/server/modules/auth/service");

describe("password reset notification and audit events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHashPassword.mockResolvedValue("hashed-password");
    mockVerificationTokenFindUnique.mockResolvedValue({
      token: "reset-token",
      identifier: "reset:student@academy.local",
      expires: new Date(Date.now() + 60_000),
    });
    mockUserUpdate.mockResolvedValue({ id: "student-1", email: "student@academy.local" });
    mockUserFindUnique.mockResolvedValue({ email: "student@academy.local" });
    mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
  });

  it("logs audit and creates default in-app password_changed notification", async () => {
    await resetPassword("reset-token", "new-secure-password");

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "student-1",
          action: "auth.password_reset_completed",
          entity: "user",
          entityId: "student-1",
        }),
      }),
    );
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: "password_changed",
          channel: "in_app",
          refType: "user",
          refId: "student-1",
        }),
      }),
    );
  });
});
