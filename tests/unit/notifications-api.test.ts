import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetNotificationById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/notifications/service", () => ({
  getNotificationById: mockGetNotificationById,
}));

const notificationDetailRoute = await import("@/app/api/v1/notifications/[id]/route");

describe("notification detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-1", roles: ["student"] });
    mockGetNotificationById.mockResolvedValue({
      id: "notification-1",
      title: "Новое уведомление",
      message: "Текст",
    });
  });

  it("returns a notification for the current user", async () => {
    const response = await notificationDetailRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "notification-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("notification-1");
    expect(mockGetNotificationById).toHaveBeenCalledWith("notification-1", "user-1");
  });

  it("returns structured not_found when notification is missing", async () => {
    mockGetNotificationById.mockResolvedValue(null);

    const response = await notificationDetailRoute.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing-notification" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
  });
});
