import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/server/auth/options", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: mockUserFindUnique },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser", () => {
  it("rethrows Next dynamic server usage errors so App Router can classify dynamic routes", async () => {
    const dynamicUsageError = Object.assign(new Error("Dynamic server usage"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    mockGetServerSession.mockRejectedValueOnce(dynamicUsageError);

    const { getCurrentUser } = await import("@/lib/auth/session");

    await expect(getCurrentUser()).rejects.toBe(dynamicUsageError);
  });

  it("does not log raw session provider errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetServerSession.mockRejectedValueOnce(new Error("postgres://secret-session-provider"));

    const { getCurrentUser } = await import("@/lib/auth/session");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-session-provider");
    expect(consoleError).toHaveBeenCalledWith(
      "[getCurrentUser] Failed to get session:",
      expect.objectContaining({ errorType: "Error" }),
    );
  });

  it("does not log raw DB errors during device-session revalidation", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetServerSession.mockResolvedValueOnce({
      user: {
        id: "user-1",
        roles: ["student"],
        authDeviceSessionId: "device-session-1",
      },
    });
    mockUserFindUnique.mockRejectedValueOnce(new Error("postgres://secret-session-db"));

    const { getCurrentUser } = await import("@/lib/auth/session");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-session-db");
    expect(consoleError).toHaveBeenCalledWith(
      "[revalidateSession] Failed to validate session from DB:",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});
