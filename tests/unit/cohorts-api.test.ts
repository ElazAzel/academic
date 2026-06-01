import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockListPopupTargetingCohorts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/cohorts/service", () => ({
  listPopupTargetingCohorts: mockListPopupTargetingCohorts,
}));

const cohortsRoute = await import("@/app/api/v1/cohorts/route");

describe("cohorts API scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mockListPopupTargetingCohorts.mockResolvedValue([
      {
        id: "cohort-1",
        name: "Поток 1",
        status: "active",
        course: { title: "Стратегия ИИ" },
      },
      {
        id: "cohort-2",
        name: "Поток без курса",
        status: "planned",
        course: null,
      },
    ]);
  });

  it("requires settings management permission for popup cohort targeting", async () => {
    const response = await cohortsRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("settings:manage");
    expect(mockListPopupTargetingCohorts).toHaveBeenCalledTimes(1);
    expect(body.data).toEqual([
      {
        id: "cohort-1",
        name: "Поток 1",
        courseTitle: "Стратегия ИИ",
        status: "active",
      },
      {
        id: "cohort-2",
        name: "Поток без курса",
        courseTitle: "",
        status: "planned",
      },
    ]);
  });

  it("does not expose cohorts to roles without settings management permission", async () => {
    mockRequireUser.mockRejectedValue(
      new ApiError("forbidden", "Недостаточно прав", 403),
    );

    const response = await cohortsRoute.GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("settings:manage");
    expect(mockListPopupTargetingCohorts).not.toHaveBeenCalled();
  });
});
