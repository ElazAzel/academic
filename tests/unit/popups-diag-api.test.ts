import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockAdminPopupCount = vi.hoisted(() => vi.fn());
const mockNotificationCount = vi.hoisted(() => vi.fn());
const mockEnrollmentCount = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: mockUserFindUnique },
    adminPopup: { count: mockAdminPopupCount },
    notification: { count: mockNotificationCount },
    enrollment: { count: mockEnrollmentCount },
  }),
}));

const diagRoute = await import("@/app/api/v1/popups/diag/route");

describe("popups diagnostic API scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mockUserFindUnique.mockResolvedValue({
      id: "admin-1",
      roles: [{ role: { key: "admin" } }],
    });
    mockAdminPopupCount.mockResolvedValue(3);
    mockNotificationCount.mockResolvedValue(2);
    mockEnrollmentCount.mockResolvedValue(1);
  });

  it("requires settings management permission for diagnostics", async () => {
    const response = await diagRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("settings:manage");
    expect(mockAdminPopupCount).toHaveBeenCalledTimes(1);
    expect(mockNotificationCount).toHaveBeenCalledWith({
      where: { userId: "admin-1" },
    });
    expect(mockEnrollmentCount).toHaveBeenCalledWith({
      where: { userId: "admin-1" },
    });
    expect(body.data).toEqual(
      expect.objectContaining({
        userFound: true,
        userRoles: ["admin"],
        popupCount: 3,
        notifCount: 2,
        enrollmentCount: 1,
      }),
    );
  });

  it("does not expose diagnostic counts to roles without settings management permission", async () => {
    mockRequireUser.mockRejectedValue(
      new ApiError("forbidden", "Недостаточно прав", 403),
    );

    const response = await diagRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("settings:manage");
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockAdminPopupCount).not.toHaveBeenCalled();
    expect(mockNotificationCount).not.toHaveBeenCalled();
    expect(mockEnrollmentCount).not.toHaveBeenCalled();
  });
});
