import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOutboxEventCreate = vi.hoisted(() => vi.fn());
const mockNotificationPreferenceFindMany = vi.hoisted(() => vi.fn());
const mockNotificationCreate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSendPushToUser = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    outboxEvent: { create: mockOutboxEventCreate },
    notificationPreference: { findMany: mockNotificationPreferenceFindMany },
    notification: { create: mockNotificationCreate },
    user: { findUnique: mockUserFindUnique },
  }),
}));

const { createNotification, createNotificationInternal, normalizeNotificationChannel } = await import("@/server/modules/notifications/service");

describe("createNotification (outbox path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOutboxEventCreate.mockResolvedValue({ id: "outbox-event-1" });
  });

  it("writes a notification.send outbox event", async () => {
    await createNotification({ userId: "student-1", event: "access_granted" });

    expect(mockOutboxEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "notification.send",
          status: "pending",
        }),
      }),
    );
  });

  it("includes normalized channel in payload", async () => {
    await createNotification({ userId: "student-1", event: "access_granted" });

    const callArgs = mockOutboxEventCreate.mock.calls[0][0];
    const payload = callArgs.data.payload;
    expect(payload.channel).toBe("in_app");
  });

  it("returns outbox event id", async () => {
    const result = await createNotification({ userId: "student-1", event: "access_granted" });

    expect(result).toEqual({ id: "outbox-event-1" });
  });
});

describe("createNotificationInternal (sync path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.FEATURE_PUSH_NOTIFICATIONS = false;
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
});
