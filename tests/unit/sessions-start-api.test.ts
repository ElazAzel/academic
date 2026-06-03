import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockUserSessionCreate = vi.hoisted(() => vi.fn());
const mockActivityLogCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    userSession: {
      create: mockUserSessionCreate,
    },
    activityLog: {
      create: mockActivityLogCreate,
    },
  }),
}));

const sessionsStartRoute = await import("@/app/api/v1/sessions/start/route");

function request() {
  return new Request("http://localhost/api/v1/sessions/start", {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "Vitest",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "user-1", roles: ["student"] });
  mockUserSessionCreate.mockResolvedValue({
    id: "visit-session-1",
    startedAt: new Date("2026-06-03T10:00:00.000Z"),
  });
  mockActivityLogCreate.mockResolvedValue({ id: "log-1" });
});

describe("sessions start API", () => {
  it("creates a visit session and logs the initial page view", async () => {
    const response = await sessionsStartRoute.POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      sessionId: "visit-session-1",
      startedAt: "2026-06-03T10:00:00.000Z",
    });
    expect(mockUserSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        role: "student",
        ipAddress: "203.0.113.10",
        userAgent: "Vitest",
      }),
    });
    expect(mockActivityLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "PAGE_VIEW",
        resource: "app",
        sessionId: "visit-session-1",
      }),
    });
  });

  it("does not leak raw persistence errors in response or console payload", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserSessionCreate.mockRejectedValue(new Error("postgres://secret-session-start"));

    const response = await sessionsStartRoute.POST(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toEqual({
      code: "internal_error",
      message: "Внутренняя ошибка сервера",
    });
    expect(JSON.stringify(body)).not.toContain("secret-session-start");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-session-start");
    expect(mockActivityLogCreate).not.toHaveBeenCalled();
  });
});
