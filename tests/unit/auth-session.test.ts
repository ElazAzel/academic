import { describe, expect, it, vi } from "vitest";

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/server/auth/options", () => ({
  authOptions: {},
}));

describe("getCurrentUser", () => {
  it("rethrows Next dynamic server usage errors so App Router can classify dynamic routes", async () => {
    const dynamicUsageError = Object.assign(new Error("Dynamic server usage"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    mockGetServerSession.mockRejectedValueOnce(dynamicUsageError);

    const { getCurrentUser } = await import("@/lib/auth/session");

    await expect(getCurrentUser()).rejects.toBe(dynamicUsageError);
  });
});
