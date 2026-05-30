import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthDeviceSessionCreate = vi.hoisted(() => vi.fn());
const mockAuthDeviceSessionFindMany = vi.hoisted(() => vi.fn());
const mockAuthDeviceSessionFindFirst = vi.hoisted(() => vi.fn());
const mockAuthDeviceSessionUpdateMany = vi.hoisted(() => vi.fn());
const mockAuditLogCreate = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());

const mockTx = vi.hoisted(() => ({
  authDeviceSession: {
    create: mockAuthDeviceSessionCreate,
    findMany: mockAuthDeviceSessionFindMany,
    updateMany: mockAuthDeviceSessionUpdateMany,
  },
  auditLog: {
    create: mockAuditLogCreate,
  },
}));

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(
    async (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx),
  ),
  authDeviceSession: {
    findFirst: mockAuthDeviceSessionFindFirst,
    updateMany: mockAuthDeviceSessionUpdateMany,
  },
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => mockPrisma,
}));

vi.mock("@/server/modules/notifications/service", () => ({
  createNotification: mockCreateNotification,
}));

const {
  DEVICE_LIMIT_REVOKE_REASON,
  MAX_ACTIVE_DEVICE_SESSIONS,
  isAuthDeviceSessionActive,
  registerAuthDeviceSession,
  touchAuthDeviceSession,
} = await import("@/server/modules/auth/device-sessions");

describe("auth device sessions", () => {
  beforeEach(() => {
    mockAuthDeviceSessionCreate.mockReset();
    mockAuthDeviceSessionFindMany.mockReset();
    mockAuthDeviceSessionFindFirst.mockReset();
    mockAuthDeviceSessionUpdateMany.mockReset();
    mockAuditLogCreate.mockReset();
    mockCreateNotification.mockReset();
    mockPrisma.$transaction.mockClear();
  });

  it("creates a device session without revoking when the user is under the limit", async () => {
    const startedAt = new Date("2026-05-29T10:00:00.000Z");
    mockAuthDeviceSessionCreate.mockResolvedValue({ id: "session-new", startedAt });
    mockAuthDeviceSessionFindMany.mockResolvedValue([
      {
        id: "session-existing",
        startedAt: new Date("2026-05-29T09:00:00.000Z"),
        lastSeenAt: new Date("2026-05-29T09:05:00.000Z"),
        ipAddress: null,
        userAgent: null,
      },
    ]);

    const result = await registerAuthDeviceSession({
      userId: "user-1",
      ipAddress: "203.0.113.10",
      userAgent: "Mozilla/5.0",
    });

    expect(result).toEqual({
      id: "session-new",
      startedAt,
      revokedSessionIds: [],
    });
    expect(mockAuthDeviceSessionUpdateMany).not.toHaveBeenCalled();
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it("revokes the oldest previous session, audits the event, and sends a push-only notification (no in-app)", async () => {
    const startedAt = new Date("2026-05-29T10:00:00.000Z");
    mockAuthDeviceSessionCreate.mockResolvedValue({ id: "session-new", startedAt });
    mockAuthDeviceSessionFindMany.mockResolvedValue([
      {
        id: "session-old",
        startedAt: new Date("2026-05-29T08:00:00.000Z"),
        lastSeenAt: new Date("2026-05-29T08:05:00.000Z"),
        ipAddress: "203.0.113.1",
        userAgent: "Old browser",
      },
      {
        id: "session-current",
        startedAt: new Date("2026-05-29T09:00:00.000Z"),
        lastSeenAt: new Date("2026-05-29T09:05:00.000Z"),
        ipAddress: "203.0.113.2",
        userAgent: "Current browser",
      },
    ]);
    mockAuthDeviceSessionUpdateMany.mockResolvedValue({ count: 1 });
    mockAuditLogCreate.mockResolvedValue({ id: "audit-1" });
    mockCreateNotification.mockResolvedValue({ id: "notification-1" });

    const result = await registerAuthDeviceSession({ userId: "user-1" });

    expect(result.revokedSessionIds).toEqual(["session-old"]);
    expect(mockAuthDeviceSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["session-old"] }, userId: "user-1" },
        data: expect.objectContaining({
          revokedReason: DEVICE_LIMIT_REVOKE_REASON,
          revokedAt: expect.any(Date) as Date,
        }),
      }),
    );
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "user-1",
          action: "auth.device_limit_exceeded",
          entity: "auth_device_session",
          entityId: "session-new",
        }),
      }),
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        event: DEVICE_LIMIT_REVOKE_REASON,
        channel: "push",
        persist: false,
        refType: "auth_device_session",
        refId: "session-new",
      }),
    );
    expect(MAX_ACTIVE_DEVICE_SESSIONS).toBe(2);
  });

  it("checks whether a device session is still active", async () => {
    mockAuthDeviceSessionFindFirst.mockResolvedValueOnce({ id: "session-1" });
    await expect(isAuthDeviceSessionActive("user-1", "session-1")).resolves.toBe(true);

    mockAuthDeviceSessionFindFirst.mockResolvedValueOnce(null);
    await expect(isAuthDeviceSessionActive("user-1", "session-2")).resolves.toBe(false);
  });

  it("touches only active sessions that belong to the user", async () => {
    mockAuthDeviceSessionUpdateMany.mockResolvedValue({ count: 1 });

    await touchAuthDeviceSession("user-1", "session-1");

    expect(mockAuthDeviceSessionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        userId: "user-1",
        revokedAt: null,
      },
      data: { lastSeenAt: expect.any(Date) as Date },
    });
  });
});
