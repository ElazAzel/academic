import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserSessionFindFirst = vi.hoisted(() => vi.fn());
const mockUserSessionUpdate = vi.hoisted(() => vi.fn());
const mockTouchAuthDeviceSession = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/server/auth/options", () => ({
  authOptions: {},
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { update: mockUserUpdate },
    userSession: {
      findFirst: mockUserSessionFindFirst,
      update: mockUserSessionUpdate,
    },
  }),
}));

vi.mock("@/server/modules/auth/device-sessions", () => ({
  touchAuthDeviceSession: mockTouchAuthDeviceSession,
}));

const visitHeartbeatRoute = await import("@/app/api/v1/sessions/heartbeat/route");
const visitEndRoute = await import("@/app/api/v1/sessions/end/route");
const globalHeartbeatRoute = await import("@/app/api/v1/heartbeat/route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/sessions/heartbeat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({
    id: "user-1",
    roles: ["student"],
    authDeviceSessionId: "device-session-1",
  });
  mockGetCurrentUser.mockResolvedValue({
    id: "user-1",
    roles: ["student"],
    authDeviceSessionId: "device-session-1",
  });
  mockGetServerSession.mockResolvedValue({
    user: { id: "user-1" },
    authDeviceSessionRevoked: false,
  });
  mockUserSessionFindFirst.mockResolvedValue({
    id: "visit-session-1",
    userId: "user-1",
    startedAt: new Date("2026-05-20T00:00:00.000Z"),
  });
  mockUserSessionUpdate.mockResolvedValue({ id: "visit-session-1" });
  mockUserUpdate.mockResolvedValue({ id: "user-1" });
  mockTouchAuthDeviceSession.mockResolvedValue({ count: 1 });
});

describe("visit session heartbeat device limit boundary", () => {
  it("validates heartbeat payload before loading the visit session", async () => {
    const response = await visitHeartbeatRoute.POST(jsonRequest({ sessionId: "" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockUserSessionFindFirst).not.toHaveBeenCalled();
    expect(mockTouchAuthDeviceSession).not.toHaveBeenCalled();
    expect(mockUserSessionUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 and does not extend visit session when device session was revoked", async () => {
    mockTouchAuthDeviceSession.mockResolvedValue({ count: 0 });

    const response = await visitHeartbeatRoute.POST(jsonRequest({ sessionId: "visit-session-1" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(body.error.details).toEqual({ reason: "device-limit" });
    expect(mockTouchAuthDeviceSession).toHaveBeenCalledWith("user-1", "device-session-1");
    expect(mockUserSessionUpdate).not.toHaveBeenCalled();
  });

  it("extends visit session when device session is still active", async () => {
    const response = await visitHeartbeatRoute.POST(jsonRequest({ sessionId: "visit-session-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sessionId).toBe("visit-session-1");
    expect(mockTouchAuthDeviceSession).toHaveBeenCalledWith("user-1", "device-session-1");
    expect(mockUserSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "visit-session-1" },
      }),
    );
  });
});

describe("visit session end boundary", () => {
  it("validates end-session payload before loading the visit session", async () => {
    const response = await visitEndRoute.POST(jsonRequest({ sessionId: "" }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockUserSessionFindFirst).not.toHaveBeenCalled();
    expect(mockUserSessionUpdate).not.toHaveBeenCalled();
  });

  it("closes an active visit session for the current user", async () => {
    const response = await visitEndRoute.POST(jsonRequest({ sessionId: "visit-session-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.sessionId).toBe("visit-session-1");
    expect(body.data.durationSec).toEqual(expect.any(Number));
    expect(mockUserSessionFindFirst).toHaveBeenCalledWith({
      where: { id: "visit-session-1", userId: "user-1", durationSec: null },
    });
    expect(mockUserSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "visit-session-1" },
        data: expect.objectContaining({ durationSec: expect.any(Number) }),
      }),
    );
  });
});

describe("global heartbeat device limit boundary", () => {
  it("silently succeeds for users without an auth session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await globalHeartbeatRoute.POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when Auth.js marks the device session as revoked", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1" },
      authDeviceSessionRevoked: true,
    });

    const response = await globalHeartbeatRoute.POST();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(body.error.details).toEqual({ reason: "device-limit" });
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when touching the active device session updates no rows", async () => {
    mockTouchAuthDeviceSession.mockResolvedValue({ count: 0 });

    const response = await globalHeartbeatRoute.POST();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(body.error.details).toEqual({ reason: "device-limit" });
    expect(mockTouchAuthDeviceSession).toHaveBeenCalledWith("user-1", "device-session-1");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("updates lastLoginAt when the device session is active", async () => {
    const response = await globalHeartbeatRoute.POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockTouchAuthDeviceSession).toHaveBeenCalledWith("user-1", "device-session-1");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
      }),
    );
  });
});
