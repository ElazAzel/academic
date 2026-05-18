import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

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
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    user: { findUnique: mockUserFindUnique },
  }),
}));

const { createNotification, normalizeNotificationChannel } = await import("@/server/modules/notifications/service");

describe("notification delivery channel contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
    mockUserFindUnique.mockResolvedValue({ email: "student@academy.local" });
  });

  it("defaults omitted channels to in_app", async () => {
    await createNotification({ userId: "student-1", event: "access_granted" });

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: "access_granted",
          channel: "in_app",
        }),
      }),
    );
  });

  it("normalizes unsupported channels to in_app", async () => {
    expect(normalizeNotificationChannel("student_submission")).toBe("in_app");

    await createNotification({ userId: "curator-1", event: "student_assigned", channel: "student_submission" });

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "curator-1",
          type: "student_assigned",
          channel: "in_app",
        }),
      }),
    );
  });

  it("keeps email delivery only when explicitly requested", async () => {
    await createNotification({ userId: "student-1", event: "password_changed", channel: "email" });

    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: "password_changed",
          channel: "email",
        }),
      }),
    );
  });
});
