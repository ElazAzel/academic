import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

import { GET } from "@/app/api/v1/notifications/stream/route";

describe("legacy notification stream route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "student-1" });
  });

  it("authenticates and returns 204 so legacy EventSource clients stop reconnecting", async () => {
    const response = await GET();

    expect(mockRequireUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(await response.text()).toBe("");
  });
});
