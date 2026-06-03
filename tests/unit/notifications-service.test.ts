import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOutboxEventCreate = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSendPushToUser = vi.hoisted(() => vi.fn());
const mockSendMail = vi.hoisted(() => vi.fn());
const mockEnv = vi.hoisted(() => ({
  FEATURE_EMAIL_NOTIFICATIONS: false,
  FEATURE_PUSH_NOTIFICATIONS: false,
  EMAIL_FROM: "noreply@academy.local",
  SMTP_HOST: "localhost",
  SMTP_PORT: 1025,
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

vi.mock("@/server/modules/notifications/push", () => ({
  sendPushToUser: mockSendPushToUser,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    outboxEvent: { create: mockOutboxEventCreate },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    user: { findUnique: mockUserFindUnique },
  }),
}));

const { createNotification, createNotificationInternal, normalizeNotificationChannel } = await import("@/server/modules/notifications/service");

describe("createNotification (inline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
    mockUserFindUnique.mockResolvedValue({ email: "student@academy.local" });
  });

  it("creates a notification record directly (no outbox)", async () => {
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

  it("includes normalized channel in notification", async () => {
    await createNotification({ userId: "student-1", event: "access_granted" });

    const callArgs = mockNotificationCreate.mock.calls[0][0];
    expect(callArgs.data.channel).toBe("in_app");
  });

  it("returns notification id", async () => {
    const result = await createNotification({ userId: "student-1", event: "access_granted" });

    expect(result).toEqual({ id: "notification-1" });
  });
});

describe("createNotificationInternal (sync path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.FEATURE_PUSH_NOTIFICATIONS = false;
    mockEnv.FEATURE_EMAIL_NOTIFICATIONS = false;
    mockSendMail.mockResolvedValue({ messageId: "mail-1" });
    mockNotificationPreferenceFindMany.mockResolvedValue([]);
    mockNotificationCreate.mockResolvedValue({ id: "notification-1" });
    mockUserFindUnique.mockResolvedValue({ email: "student@academy.local" });
  });

  it("creates notification with defaults in_app", async () => {
    await createNotificationInternal({ userId: "student-1", event: "access_granted" });

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

    await createNotificationInternal({ userId: "curator-1", event: "student_assigned", channel: "student_submission" });

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
    await createNotificationInternal({ userId: "student-1", event: "password_changed", channel: "email" });

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

  it("uses notification link as push url when url is not provided", async () => {
    mockEnv.FEATURE_PUSH_NOTIFICATIONS = true;

    await createNotificationInternal({
      userId: "curator-1",
      event: "new_message",
      data: { link: "/curator/chat" },
    });

    expect(mockSendPushToUser).toHaveBeenCalledWith(
      "curator-1",
      expect.objectContaining({
        url: "/curator/chat",
      }),
    );
  });

  it("does not persist silent non-security notifications", async () => {
    const result = await createNotificationInternal({
      userId: "student-1",
      event: "access_granted",
      persist: false,
    });

    expect(result).toBeNull();
    expect(mockNotificationCreate).not.toHaveBeenCalled();
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-1" },
      }),
    );
  });

  it("bypasses preferences for security-critical events like device_limit_exceeded even if channel is disabled", async () => {
    // Mock user preference as disabled for in_app
    mockNotificationPreferenceFindMany.mockResolvedValue([
      { channel: "in_app", enabled: false }
    ]);

    // Test a normal event (should be blocked)
    const blockedRes = await createNotificationInternal({
      userId: "student-1",
      event: "access_granted",
      channel: "in_app"
    });
    expect(blockedRes).toBeNull();
    expect(mockNotificationCreate).not.toHaveBeenCalled();

    // Test a security event (should bypass and succeed)
    const successRes = await createNotificationInternal({
      userId: "student-1",
      event: "device_limit_exceeded",
      channel: "in_app"
    });
    expect(successRes).not.toBeNull();
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "student-1",
          type: "device_limit_exceeded",
          channel: "in_app"
        })
      })
    );
  });

  it("forces persistence for certificate_revoked even when persist is false and preferences are disabled", async () => {
    mockNotificationPreferenceFindMany.mockResolvedValue([
      { channel: "in_app", enabled: false },
      { channel: "certificate_revoked", enabled: false },
    ]);

    const result = await createNotificationInternal({
      userId: "student-1",
      event: "certificate_revoked",
      channel: "in_app",
      persist: false,
      refType: "certificate",
      refId: "certificate-1",
    });

    expect(result).toEqual({ id: "notification-1" });
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

  it("does not log recipient email or raw SMTP errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockEnv.FEATURE_EMAIL_NOTIFICATIONS = true;
    mockSendMail.mockRejectedValueOnce(new Error("smtp://secret-notification-provider"));

    await createNotificationInternal({
      userId: "student-1",
      event: "password_changed",
      channel: "email",
    });

    const serializedCalls = JSON.stringify(consoleError.mock.calls);
    expect(serializedCalls).not.toContain("student@academy.local");
    expect(serializedCalls).not.toContain("secret-notification-provider");
    expect(consoleError).toHaveBeenCalledWith(
      "[Notifications] Failed to send email notification",
      expect.objectContaining({ errorType: "Error" }),
    );
  });

  it("does not log raw push provider errors from notification delivery", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockEnv.FEATURE_PUSH_NOTIFICATIONS = true;
    mockSendPushToUser.mockRejectedValueOnce(new Error("https://push.example/secret-notification-token"));

    await createNotificationInternal({
      userId: "student-1",
      event: "new_message",
      channel: "in_app",
    });

    const serializedCalls = JSON.stringify(consoleError.mock.calls);
    expect(serializedCalls).not.toContain("secret-notification-token");
    expect(consoleError).toHaveBeenCalledWith(
      "[Notifications] Failed to send push notification",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
