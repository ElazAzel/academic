import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockPushSubscriptionUpsert = vi.hoisted(() => vi.fn());
const mockPushSubscriptionUpdateMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: mockCheckRateLimit }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    pushSubscription: {
      upsert: mockPushSubscriptionUpsert,
      updateMany: mockPushSubscriptionUpdateMany,
    },
  }),
}));

const pushSubscribeRoute = await import("@/app/api/v1/push/subscribe/route");

const validSubscription = {
  endpoint: "https://push.example.test/subscription-1",
  keys: {
    p256dh: "p256dh-key",
    auth: "auth-key",
  },
};

function jsonRequest(method: "POST" | "DELETE", body: unknown) {
  return new Request("http://localhost/api/v1/push/subscribe", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 60000 });
  mockPushSubscriptionUpsert.mockResolvedValue({ id: "subscription-1" });
  mockPushSubscriptionUpdateMany.mockResolvedValue({ count: 1 });
});

describe("push subscribe API", () => {
  it("returns a Russian silent reason for unauthenticated background subscription attempts", async () => {
    mockRequireUser.mockRejectedValue(new Error("no session"));

    const response = await pushSubscribeRoute.POST(jsonRequest("POST", validSubscription));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: false, reason: "Требуется вход" });
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockPushSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("returns a Russian silent reason for unauthenticated background unsubscribe attempts", async () => {
    mockRequireUser.mockRejectedValue(new Error("no session"));

    const response = await pushSubscribeRoute.DELETE(jsonRequest("DELETE", { endpoint: validSubscription.endpoint }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: false, reason: "Требуется вход" });
    expect(mockPushSubscriptionUpdateMany).not.toHaveBeenCalled();
  });

  it("returns a structured rate-limit error before storing a subscription", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await pushSubscribeRoute.POST(jsonRequest("POST", validSubscription));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(mockPushSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("upserts an authenticated push subscription by endpoint", async () => {
    const response = await pushSubscribeRoute.POST(jsonRequest("POST", validSubscription));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockCheckRateLimit).toHaveBeenCalledWith("push-subscribe:student-1");
    expect(mockPushSubscriptionUpsert).toHaveBeenCalledWith({
      where: { endpoint: validSubscription.endpoint },
      update: {
        p256dh: validSubscription.keys.p256dh,
        auth: validSubscription.keys.auth,
        active: true,
      },
      create: {
        userId: "student-1",
        endpoint: validSubscription.endpoint,
        p256dh: validSubscription.keys.p256dh,
        auth: validSubscription.keys.auth,
      },
    });
  });

  it("validates unsubscribe payloads before touching subscriptions", async () => {
    const response = await pushSubscribeRoute.DELETE(jsonRequest("DELETE", { endpoint: "" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockPushSubscriptionUpdateMany).not.toHaveBeenCalled();
  });

  it("deactivates only the current user's matching push endpoint", async () => {
    const response = await pushSubscribeRoute.DELETE(
      jsonRequest("DELETE", { endpoint: validSubscription.endpoint }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockPushSubscriptionUpdateMany).toHaveBeenCalledWith({
      where: { userId: "student-1", endpoint: validSubscription.endpoint },
      data: { active: false },
    });
  });
});
