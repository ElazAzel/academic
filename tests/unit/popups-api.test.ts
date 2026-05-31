import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockAdminPopupFindMany = vi.hoisted(() => vi.fn());
const mockAdminPopupFindUnique = vi.hoisted(() => vi.fn());
const mockAdminPopupCreate = vi.hoisted(() => vi.fn());
const mockAdminPopupUpdate = vi.hoisted(() => vi.fn());
const mockAdminPopupDelete = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/notifications/service", () => ({
  createNotification: mockCreateNotification,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    adminPopup: {
      findMany: mockAdminPopupFindMany,
      findUnique: mockAdminPopupFindUnique,
      create: mockAdminPopupCreate,
      update: mockAdminPopupUpdate,
      delete: mockAdminPopupDelete,
    },
    curatorAssignment: {
      findMany: mockCuratorAssignmentFindMany,
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  }),
}));

const popupsRoute = await import("@/app/api/v1/popups/route");
const toggleRoute = await import("@/app/api/v1/popups/[id]/toggle/route");

function popupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "popup-1",
    title: "Уведомление",
    message: "Текст",
    imageUrl: null,
    linkUrl: null,
    linkText: null,
    targetRoles: "[]",
    targetCohortIds: "[]",
    targetUserIds: JSON.stringify(["student-1"]),
    isActive: true,
    createdById: "curator-1",
    createdAt: new Date("2026-05-31T00:00:00.000Z"),
    createdBy: { id: "curator-1", name: "Куратор", email: "curator@academy.local" },
    views: [],
    ...overrides,
  };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/popups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("popups API scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminPopupFindMany.mockResolvedValue([]);
    mockAdminPopupFindUnique.mockResolvedValue(popupRow());
    mockAdminPopupCreate.mockResolvedValue(popupRow());
    mockAdminPopupUpdate.mockResolvedValue(popupRow({ isActive: false }));
    mockAdminPopupDelete.mockResolvedValue(popupRow());
    mockCuratorAssignmentFindMany.mockResolvedValue([]);
    mockCreateNotification.mockResolvedValue({ id: "notification-1" });
  });

  it("lets admins list all managed popups", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mockAdminPopupFindMany.mockResolvedValue([popupRow({ createdById: "curator-1" })]);

    const response = await popupsRoute.GET();

    expect(response.status).toBe(200);
    expect(mockAdminPopupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("scopes curator popup list to records created by that curator", async () => {
    mockRequireUser.mockResolvedValue({ id: "curator-1", roles: ["curator"] });
    mockAdminPopupFindMany.mockResolvedValue([popupRow({ createdById: "curator-1" })]);

    const response = await popupsRoute.GET();

    expect(response.status).toBe(200);
    expect(mockAdminPopupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: "curator-1" } }),
    );
  });

  it("blocks non-admin role targeting to prevent broad popup sends", async () => {
    mockRequireUser.mockResolvedValue({ id: "curator-1", roles: ["curator"] });

    const response = await popupsRoute.POST(jsonRequest({
      title: "Общее уведомление",
      message: "Текст",
      targetRoles: ["student"],
      targetUserIds: [],
      isActive: true,
    }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe("forbidden");
    expect(mockAdminPopupCreate).not.toHaveBeenCalled();
  });

  it("lets curators send popups only to assigned students", async () => {
    mockRequireUser.mockResolvedValue({ id: "curator-1", roles: ["curator"] });
    mockCuratorAssignmentFindMany.mockResolvedValue([{ studentId: "student-1" }]);

    const response = await popupsRoute.POST(jsonRequest({
      title: "Проверка",
      message: "Пожалуйста, откройте урок",
      targetRoles: [],
      targetUserIds: ["student-1"],
      isActive: true,
    }));

    expect(response.status).toBe(201);
    expect(mockCuratorAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          curatorId: "curator-1",
          active: true,
          studentId: { in: ["student-1"] },
        }),
      }),
    );
    expect(mockAdminPopupCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdById: "curator-1",
          targetUserIds: JSON.stringify(["student-1"]),
        }),
      }),
    );
  });

  it("requires admin-level settings permission for popup toggle", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await toggleRoute.POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "popup-1" }),
    });

    expect(response.status).toBe(403);
    expect(mockRequireUser).toHaveBeenCalledWith("settings:manage");
    expect(mockAdminPopupUpdate).not.toHaveBeenCalled();
  });
});
