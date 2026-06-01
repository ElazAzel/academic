import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockGetCohortBlockDeadlines = vi.hoisted(() => vi.fn());
const mockSetBlockDeadlines = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/server/modules/deadlines/service", () => ({
  getCohortBlockDeadlines: mockGetCohortBlockDeadlines,
  setBlockDeadlines: mockSetBlockDeadlines,
}));

const route =
  await import("@/app/api/v1/cohorts/[cohortId]/block-deadlines/route");

const params = { params: Promise.resolve({ cohortId: "cohort-1" }) };

function jsonRequest(body: unknown) {
  return new Request(
    "http://localhost/api/v1/cohorts/cohort-1/block-deadlines",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("cohort block deadlines API scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: "instructor-1",
      roles: ["instructor"],
    });
    mockGetCohortBlockDeadlines.mockResolvedValue([
      {
        id: "block-1",
        targetType: "block",
        title: "Блок 1",
        order: 1,
        moduleId: "module-1",
        moduleTitle: "Модуль 1",
        moduleOrder: 1,
        deadline: null,
      },
    ]);
    mockSetBlockDeadlines.mockResolvedValue([{ id: "deadline-1" }]);
  });

  it("requires course write permission and passes actor id for reads", async () => {
    const response = await route.GET(
      new Request("http://localhost") as never,
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockGetCohortBlockDeadlines).toHaveBeenCalledWith(
      "cohort-1",
      "instructor-1",
    );
    expect(body.data[0].id).toBe("block-1");
  });

  it("does not expose deadlines when course write permission is missing", async () => {
    mockRequireUser.mockRejectedValue(
      new ApiError("forbidden", "Недостаточно прав", 403),
    );

    const response = await route.GET(
      new Request("http://localhost") as never,
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockGetCohortBlockDeadlines).not.toHaveBeenCalled();
  });

  it("requires course write permission for deadline mutations", async () => {
    const response = await route.POST(
      jsonRequest({
        deadlines: [
          {
            blockId: "block-1",
            dueAt: "2026-06-15T00:00:00.000Z",
          },
        ],
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("courses:write");
    expect(mockSetBlockDeadlines).toHaveBeenCalledWith(
      "cohort-1",
      [
        {
          blockId: "block-1",
          moduleId: undefined,
          dueAt: expect.any(Date),
        },
      ],
      "instructor-1",
    );
  });
});
