import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockGetSuperCuratorScope = vi.hoisted(() => vi.fn());
const mockRiskFlagFindMany = vi.hoisted(() => vi.fn());
const mockRiskFlagCreate = vi.hoisted(() => vi.fn());
const mockRiskFlagFindUnique = vi.hoisted(() => vi.fn());
const mockRiskFlagUpdate = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/server/modules/super-curator/scope", () => ({
  getSuperCuratorScope: mockGetSuperCuratorScope,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    riskFlag: {
      findMany: mockRiskFlagFindMany,
      create: mockRiskFlagCreate,
      findUnique: mockRiskFlagFindUnique,
      update: mockRiskFlagUpdate,
    },
    cohort: {
      findMany: mockCohortFindMany,
    },
    user: {
      findMany: mockUserFindMany,
    },
    curatorAssignment: {
      findMany: mockCuratorAssignmentFindMany,
    },
  }),
}));

const { createRiskAction, getRiskOverview, getStudentsForRisk, resolveRiskAction } = await import(
  "@/server/actions/risk-management"
);

const adminUser = { id: "admin-1", email: "admin@example.test", roles: ["admin"] };
const superCuratorUser = { id: "sc-1", email: "sc@example.test", roles: ["super_curator"] };
const globalScope = {
  isGlobal: true,
  studentIds: [],
  cohortIds: [],
  curatorIds: [],
  assignments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(adminUser);
  mockRevalidatePath.mockReturnValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
  mockGetSuperCuratorScope.mockResolvedValue(globalScope);
  mockRiskFlagFindMany.mockResolvedValue([]);
  mockRiskFlagCreate.mockResolvedValue({ id: "risk-1" });
  mockRiskFlagFindUnique.mockResolvedValue({ id: "risk-1", userId: "student-1" });
  mockRiskFlagUpdate.mockResolvedValue({ id: "risk-1", status: "resolved" });
  mockCohortFindMany.mockResolvedValue([]);
  mockUserFindMany.mockResolvedValue([]);
  mockCuratorAssignmentFindMany.mockResolvedValue([]);
});

describe("risk management actions safe error handling", () => {
  it("does not log controlled overview validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await expect(getRiskOverview({ cohortId: 123 } as never)).rejects.toMatchObject({
        code: "validation_error",
        status: 422,
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockRequireRole).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps overview load failures without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRiskFlagFindMany.mockRejectedValueOnce(new Error("postgres://secret-risk-overview"));

    try {
      await expect(getRiskOverview()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить риски",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-risk-overview");
      expect(consoleSpy).toHaveBeenCalledWith("[getRiskOverview]", expect.objectContaining({ errorType: "Error" }));
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not log controlled create-risk scope errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRequireRole.mockResolvedValueOnce(superCuratorUser);
    mockGetSuperCuratorScope.mockResolvedValueOnce({
      isGlobal: false,
      studentIds: ["student-allowed"],
      cohortIds: ["cohort-1"],
      curatorIds: [],
      assignments: [],
    });
    const formData = new FormData();
    formData.set("userId", "student-foreign");
    formData.set("type", "inactive_login");

    try {
      await expect(createRiskAction(formData)).rejects.toMatchObject({
        code: "forbidden",
        status: 403,
        message: "Слушатель вне зоны ответственности супер-куратора",
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockRiskFlagCreate).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw create-risk persistence failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRiskFlagCreate.mockRejectedValueOnce(new Error("postgres://secret-risk-create-action"));
    const formData = new FormData();
    formData.set("userId", "student-1");
    formData.set("type", "inactive_login");

    try {
      const result = await createRiskAction(formData);

      expect(result).toEqual({ success: false, error: "Произошла ошибка при создании риска" });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-risk-create-action");
      expect(consoleSpy).toHaveBeenCalledWith("[createRiskAction]", expect.objectContaining({ errorType: "Error" }));
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not log controlled resolve-risk not-found errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRequireRole.mockResolvedValueOnce(superCuratorUser);
    mockGetSuperCuratorScope.mockResolvedValueOnce({
      isGlobal: false,
      studentIds: ["student-1"],
      cohortIds: [],
      curatorIds: [],
      assignments: [],
    });
    mockRiskFlagFindUnique.mockResolvedValueOnce(null);

    try {
      await expect(resolveRiskAction("risk-missing")).rejects.toMatchObject({
        code: "not_found",
        status: 404,
        message: "Риск не найден",
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockRiskFlagUpdate).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw resolve-risk persistence failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRiskFlagUpdate.mockRejectedValueOnce(new Error("postgres://secret-risk-resolve-action"));

    try {
      const result = await resolveRiskAction("risk-1");

      expect(result).toEqual({ success: false, error: "Произошла ошибка при разрешении риска" });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-risk-resolve-action");
      expect(consoleSpy).toHaveBeenCalledWith("[resolveRiskAction]", expect.objectContaining({ errorType: "Error" }));
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps student list failures inside the read-action boundary", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserFindMany.mockRejectedValueOnce(new Error("postgres://secret-risk-students-list"));

    try {
      await expect(getStudentsForRisk()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить список слушателей",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-risk-students-list");
      expect(consoleSpy).toHaveBeenCalledWith("[getStudentsForRisk]", expect.objectContaining({ errorType: "Error" }));
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
