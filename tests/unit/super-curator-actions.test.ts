import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockGetSuperCuratorScope = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockCohortCreate = vi.hoisted(() => vi.fn());
const mockCohortUpdate = vi.hoisted(() => vi.fn());
const mockCohortFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockEnrollmentFindUnique = vi.hoisted(() => vi.fn());
const mockEnrollmentUpdate = vi.hoisted(() => vi.fn());
const mockEnrollmentCreate = vi.hoisted(() => vi.fn());
const mockEnrollmentDelete = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentUpdateMany = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentUpsert = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockRoleFindUnique = vi.hoisted(() => vi.fn());
const mockUserRoleFindUnique = vi.hoisted(() => vi.fn());
const mockUserRoleCreate = vi.hoisted(() => vi.fn());
const mockUserRoleDeleteMany = vi.hoisted(() => vi.fn());
const mockRiskFlagFindMany = vi.hoisted(() => vi.fn());
const mockCourseProgressFindMany = vi.hoisted(() => vi.fn());
const mockLessonQuestionFindMany = vi.hoisted(() => vi.fn());
const mockLessonQuestionGroupBy = vi.hoisted(() => vi.fn());
const mockAssignmentSubmissionFindMany = vi.hoisted(() => vi.fn());
const mockActivityLogFindMany = vi.hoisted(() => vi.fn());
const mockMessageFindMany = vi.hoisted(() => vi.fn());

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

vi.mock("@/server/modules/notifications/service", () => ({
  createNotification: mockCreateNotification,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    cohort: {
      findMany: mockCohortFindMany,
      create: mockCohortCreate,
      update: mockCohortUpdate,
      findUnique: mockCohortFindUnique,
    },
    enrollment: {
      findMany: mockEnrollmentFindMany,
      findUnique: mockEnrollmentFindUnique,
      update: mockEnrollmentUpdate,
      create: mockEnrollmentCreate,
      delete: mockEnrollmentDelete,
    },
    curatorAssignment: {
      findMany: mockCuratorAssignmentFindMany,
      updateMany: mockCuratorAssignmentUpdateMany,
      upsert: mockCuratorAssignmentUpsert,
    },
    user: {
      findMany: mockUserFindMany,
      findUnique: mockUserFindUnique,
    },
    role: {
      findUnique: mockRoleFindUnique,
    },
    userRole: {
      findUnique: mockUserRoleFindUnique,
      create: mockUserRoleCreate,
      deleteMany: mockUserRoleDeleteMany,
    },
    riskFlag: {
      findMany: mockRiskFlagFindMany,
    },
    courseProgress: {
      findMany: mockCourseProgressFindMany,
    },
    lessonQuestion: {
      findMany: mockLessonQuestionFindMany,
      groupBy: mockLessonQuestionGroupBy,
    },
    assignmentSubmission: {
      findMany: mockAssignmentSubmissionFindMany,
    },
    activityLog: {
      findMany: mockActivityLogFindMany,
    },
    message: {
      findMany: mockMessageFindMany,
    },
  }),
}));

const {
  createCohortAction,
  getCohortDetail,
  getSuperCuratorCohorts,
  getSuperCuratorDistributionData,
  getSuperCuratorReportData,
} = await import("@/server/actions/super-curator");

const actor = { id: "sc-1", email: "sc@example.test", roles: ["super_curator"] };
const globalScope = {
  isGlobal: true,
  assignments: [],
  studentIds: [],
  curatorIds: [],
  cohortIds: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(actor);
  mockRevalidatePath.mockReturnValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
  mockGetSuperCuratorScope.mockResolvedValue(globalScope);
  mockCohortFindMany.mockResolvedValue([]);
  mockCohortCreate.mockResolvedValue({ id: "cohort-1" });
  mockCohortUpdate.mockResolvedValue({ id: "cohort-1" });
  mockCohortFindUnique.mockResolvedValue(null);
  mockEnrollmentFindMany.mockResolvedValue([]);
  mockEnrollmentFindUnique.mockResolvedValue(null);
  mockEnrollmentUpdate.mockResolvedValue({ id: "enrollment-1" });
  mockEnrollmentCreate.mockResolvedValue({ id: "enrollment-1" });
  mockEnrollmentDelete.mockResolvedValue({ id: "enrollment-1" });
  mockCuratorAssignmentFindMany.mockResolvedValue([]);
  mockCuratorAssignmentUpdateMany.mockResolvedValue({ count: 0 });
  mockCuratorAssignmentUpsert.mockResolvedValue({ id: "assignment-1" });
  mockUserFindMany.mockResolvedValue([]);
  mockUserFindUnique.mockResolvedValue(null);
  mockRoleFindUnique.mockResolvedValue({ id: "role-curator" });
  mockUserRoleFindUnique.mockResolvedValue(null);
  mockUserRoleCreate.mockResolvedValue({ id: "user-role-1" });
  mockUserRoleDeleteMany.mockResolvedValue({ count: 0 });
  mockRiskFlagFindMany.mockResolvedValue([]);
  mockCourseProgressFindMany.mockResolvedValue([]);
  mockLessonQuestionFindMany.mockResolvedValue([]);
  mockLessonQuestionGroupBy.mockResolvedValue([]);
  mockAssignmentSubmissionFindMany.mockResolvedValue([]);
  mockActivityLogFindMany.mockResolvedValue([]);
  mockMessageFindMany.mockResolvedValue([]);
  mockCreateNotification.mockResolvedValue(undefined);
});

describe("super-curator actions safe error handling", () => {
  it("wraps cohort list failures without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockCohortFindMany.mockRejectedValueOnce(new Error("postgres://secret-super-cohorts"));

    try {
      await expect(getSuperCuratorCohorts()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить потоки",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-super-cohorts");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[getSuperCuratorCohorts]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not log controlled detail validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await expect(getCohortDetail("")).rejects.toMatchObject({
        code: "validation_error",
        status: 422,
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockCohortFindUnique).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not log controlled create-cohort validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const formData = new FormData();
    formData.set("name", "Поток A");

    try {
      await expect(createCohortAction(formData)).rejects.toMatchObject({
        code: "bad_request",
        status: 400,
        message: "Название и курс обязательны",
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockCohortCreate).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw create-cohort persistence failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockCohortCreate.mockRejectedValueOnce(new Error("postgres://secret-super-cohort-create"));
    const formData = new FormData();
    formData.set("name", "Поток A");
    formData.set("courseId", "course-1");

    try {
      const result = await createCohortAction(formData);

      expect(result).toEqual({ success: false, error: "Произошла ошибка при создании потока" });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-super-cohort-create");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[createCohortAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps distribution load failures inside the read-action boundary", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockEnrollmentFindMany.mockRejectedValueOnce(new Error("postgres://secret-super-distribution"));

    try {
      await expect(getSuperCuratorDistributionData()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить распределение кураторов",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-super-distribution");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[getSuperCuratorDistributionData]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps report data failures inside the read-action boundary", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockCohortFindMany.mockRejectedValueOnce(new Error("postgres://secret-super-report"));

    try {
      await expect(getSuperCuratorReportData()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить данные отчета супер-куратора",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-super-report");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[getSuperCuratorReportData]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
