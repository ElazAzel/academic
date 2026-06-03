import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetLatestUnviewedPopup = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/popups/service", () => ({
  getLatestUnviewedPopup: mockGetLatestUnviewedPopup,
}));

const activeRoute = await import("@/app/api/v1/popups/active/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockGetLatestUnviewedPopup.mockResolvedValue(null);
});

describe("popups active API safe logging", () => {
  it("does not log raw active popup lookup errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetLatestUnviewedPopup.mockRejectedValueOnce(new Error("postgres://secret-active-popup"));

    const response = await activeRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("secret-active-popup");
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-active-popup");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[popups/active] Error",
      expect.objectContaining({ errorType: "Error" }),
    );
    consoleSpy.mockRestore();
  });

  it("does not log controlled auth errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRequireUser.mockRejectedValueOnce(new ApiError("unauthorized", "Нужна авторизация", 401));

    const response = await activeRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(mockGetLatestUnviewedPopup).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
