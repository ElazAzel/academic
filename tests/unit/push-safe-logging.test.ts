import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSendNotification = vi.hoisted(() => vi.fn());
const mockSetVapidDetails = vi.hoisted(() => vi.fn());
const mockPushSubscriptionUpdateMany = vi.hoisted(() => vi.fn());
const mockPushSubscriptionFindMany = vi.hoisted(() => vi.fn());

vi.mock("web-push", () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    FEATURE_PUSH_NOTIFICATIONS: true,
    VAPID_PUBLIC_KEY: "public-key",
    VAPID_PRIVATE_KEY: "private-key",
    VAPID_EMAIL: "admin@example.test",
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    pushSubscription: {
      updateMany: mockPushSubscriptionUpdateMany,
      findMany: mockPushSubscriptionFindMany,
    },
  }),
}));

const { sendPushToSubscription } = await import("@/server/modules/notifications/push");

const subscription = {
  endpoint: "https://push.example.test/secret-endpoint-token",
  p256dh: "p256dh-key",
  auth: "auth-key",
};

const payload = {
  title: "Заголовок",
  body: "Текст",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPushSubscriptionUpdateMany.mockResolvedValue({ count: 1 });
});

describe("push safe logging", () => {
  it("does not log raw push provider errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockSendNotification.mockRejectedValue(
      Object.assign(new Error("https://push.example.test/secret-provider-token"), {
        statusCode: 500,
      }),
    );

    const result = await sendPushToSubscription(subscription, payload);

    expect(result).toBe(false);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-provider-token");
    expect(JSON.stringify(consoleError.mock.calls)).toContain("statusCode");
  });

  it("does not log raw expired subscription endpoints", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockSendNotification.mockRejectedValue(
      Object.assign(new Error("subscription expired"), {
        statusCode: 410,
      }),
    );

    const result = await sendPushToSubscription(subscription, payload);

    expect(result).toBe(false);
    expect(mockPushSubscriptionUpdateMany).toHaveBeenCalledWith({
      where: { endpoint: subscription.endpoint },
      data: { active: false },
    });
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain("secret-endpoint-token");
    expect(JSON.stringify(consoleLog.mock.calls)).toContain("410");
  });
});
