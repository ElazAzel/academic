import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportCache } from "@/lib/cache";
import { QUERY_LIMITS } from "@/lib/query-limits";

const mockCourseFindMany = vi.hoisted(() => vi.fn());
const mockCohortFindMany = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindMany = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

const mockFetchProgressData = vi.hoisted(() => vi.fn());
const mockFetchRiskData = vi.hoisted(() => vi.fn());
const mockFetchAssignmentData = vi.hoisted(() => vi.fn());
const mockFetchCertificateData = vi.hoisted(() => vi.fn());
const mockFetchCuratorWorkloadData = vi.hoisted(() => vi.fn());
const mockGenerateProgressCsv = vi.hoisted(() =>
  vi.fn((_: unknown, fields?: string[]) => `progress:${fields?.join("|") ?? "all"}`),
);
const mockGenerateProgressXlsx = vi.hoisted(() => vi.fn(async () => new Uint8Array([1])));
const mockGenerateProgressPdf = vi.hoisted(() => vi.fn(async () => new Uint8Array([1])));

const mockGetObserverScope = vi.hoisted(() => vi.fn());
const mockGetScopedStudentIdsForObserver = vi.hoisted(() => vi.fn());
const mockGetSuperCuratorScope = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    course: { findMany: mockCourseFindMany },
    cohort: { findMany: mockCohortFindMany },
    curatorAssignment: { findMany: mockCuratorAssignmentFindMany },
    user: { findUnique: mockUserFindUnique },
  }),
}));

vi.mock("@/server/modules/observer/scope", () => ({
  getObserverScope: mockGetObserverScope,
  getScopedStudentIdsForObserver: mockGetScopedStudentIdsForObserver,
}));

vi.mock("@/server/modules/super-curator/scope", () => ({
  getSuperCuratorScope: mockGetSuperCuratorScope,
}));

vi.mock("@/lib/reports/data", () => ({
  fetchProgressData: mockFetchProgressData,
  fetchRiskData: mockFetchRiskData,
  fetchAssignmentData: mockFetchAssignmentData,
  fetchCertificateData: mockFetchCertificateData,
  fetchCuratorWorkloadData: mockFetchCuratorWorkloadData,
}));

vi.mock("@/lib/reports/csv-generator", () => ({
  generateProgressCsv: mockGenerateProgressCsv,
  generateRiskCsv: () => "risk,csv",
  generateAssignmentCsv: () => "assignment,csv",
  generateCertificateCsv: () => "certificate,csv",
  generateCuratorWorkloadCsv: () => "workload,csv",
}));

vi.mock("@/lib/reports/xlsx-generator", () => ({
  generateProgressXlsx: mockGenerateProgressXlsx,
  generateRiskXlsx: () => new Uint8Array([1]),
  generateAssignmentXlsx: () => new Uint8Array([1]),
  generateCertificateXlsx: () => new Uint8Array([1]),
  generateCuratorWorkloadXlsx: () => new Uint8Array([1]),
}));

vi.mock("@/lib/reports/pdf-generator", () => ({
  generateProgressPdf: mockGenerateProgressPdf,
  generateRiskPdf: () => new Uint8Array([1]),
  generateAssignmentPdf: () => new Uint8Array([1]),
  generateCertificatePdf: () => new Uint8Array([1]),
  generateCuratorWorkloadPdf: () => new Uint8Array([1]),
}));

const { generateReportDownload, generateReportPreview, getAvailableReportsForRoles, getDisplayReportsForRole, parseReportFormat } =
  await import("@/server/modules/reports/service");

beforeEach(() => {
  vi.clearAllMocks();
  reportCache.clear();
  mockFetchProgressData.mockResolvedValue([]);
  mockFetchRiskData.mockResolvedValue([]);
  mockFetchAssignmentData.mockResolvedValue([]);
  mockFetchCertificateData.mockResolvedValue([]);
  mockFetchCuratorWorkloadData.mockResolvedValue([]);
  mockCohortFindMany.mockResolvedValue([]);
  mockGenerateProgressXlsx.mockResolvedValue(new Uint8Array([1]));
  mockGenerateProgressPdf.mockResolvedValue(new Uint8Array([1]));
});

describe("reports service access and scope", () => {
  it("scopes instructor progress by owned courses instead of global student fallback", async () => {
    mockCourseFindMany.mockResolvedValue([{ id: "course-owned" }]);

    const report = await generateReportDownload({
      user: { id: "instructor-1", roles: ["instructor"] },
      type: "progress",
      format: "csv",
    });

    expect(report.definition.type).toBe("progress");
    expect(mockFetchProgressData).toHaveBeenCalledWith({ courseIds: ["course-owned"] });
    expect(report.access.scopeLabel).toContain("Курсы преподавателя");
  });

  it("keeps custom report field selections isolated in the download cache", async () => {
    mockCourseFindMany.mockResolvedValue([{ id: "course-owned" }]);

    const first = await generateReportDownload({
      user: { id: "instructor-1", roles: ["instructor"] },
      type: "progress",
      format: "csv",
      fields: ["studentName"],
    });
    const second = await generateReportDownload({
      user: { id: "instructor-1", roles: ["instructor"] },
      type: "progress",
      format: "csv",
      fields: ["studentName", "email"],
    });

    expect(first.content).toBe("progress:studentName");
    expect(second.content).toBe("progress:studentName|email");
    expect(mockGenerateProgressCsv).toHaveBeenCalledTimes(2);
  });

  it("does not log raw report renderer errors when falling back to CSV", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockFetchProgressData.mockResolvedValue([{ studentName: "student-1" }]);
    mockGenerateProgressPdf.mockRejectedValueOnce(new Error("postgres://secret-report-render"));

    const report = await generateReportDownload({
      user: { id: "admin-1", roles: ["admin"] },
      type: "progress",
      format: "pdf",
    });

    expect(report.format).toBe("csv");
    expect(report.fallbackReason).toBeTruthy();
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain("secret-report-render");
    expect(consoleWarn).toHaveBeenCalledWith(
      "[Reports] Report generation failed, falling back to CSV",
      expect.objectContaining({ format: "pdf", errorType: "Error" }),
    );
  });

  it("scopes customer observer certificate exports to permitted students and cohorts", async () => {
    mockGetObserverScope.mockResolvedValue({ isUnrestricted: false, projectIds: ["project-1"], cohortIds: ["cohort-1"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-allowed"]);
    mockCohortFindMany.mockResolvedValue([{ courseId: "course-allowed" }]);

    await generateReportDownload({
      user: { id: "observer-1", roles: ["customer_observer"] },
      type: "certificates",
      format: "csv",
    });

    expect(mockFetchCertificateData).toHaveBeenCalledWith({
      studentIds: ["student-allowed"],
      cohortIds: ["cohort-1"],
      courseIds: ["course-allowed"],
    });
  });

  it("scopes customer observer progress exports to permitted students and cohorts", async () => {
    mockGetObserverScope.mockResolvedValue({ isUnrestricted: false, projectIds: ["project-1"], cohortIds: ["cohort-1"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-allowed"]);
    mockCohortFindMany.mockResolvedValue([{ courseId: "course-allowed" }]);

    await generateReportDownload({
      user: { id: "observer-1", roles: ["customer_observer"] },
      type: "progress",
      format: "csv",
    });

    expect(mockFetchProgressData).toHaveBeenCalledWith({
      studentIds: ["student-allowed"],
      cohortIds: ["cohort-1"],
      courseIds: ["course-allowed"],
    });
  });

  it("scopes customer observer risk previews to permitted students and cohorts", async () => {
    mockGetObserverScope.mockResolvedValue({ isUnrestricted: false, projectIds: ["project-1"], cohortIds: ["cohort-1"] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue(["student-allowed"]);
    mockCohortFindMany.mockResolvedValue([{ courseId: "course-allowed" }]);

    await generateReportPreview({
      user: { id: "observer-1", roles: ["customer_observer"] },
      type: "risk",
    });

    expect(mockFetchRiskData).toHaveBeenCalledWith({
      studentIds: ["student-allowed"],
      cohortIds: ["cohort-1"],
      courseIds: ["course-allowed"],
    });
  });

  it("marks report previews as truncated when the bounded report row limit is reached", async () => {
    mockFetchProgressData.mockResolvedValue(
      Array.from({ length: QUERY_LIMITS.reportRows }, (_, index) => ({ studentName: `student-${index}` })),
    );

    const preview = await generateReportPreview({
      user: { id: "admin-1", roles: ["admin"] },
      type: "progress",
    });

    expect(preview.totalRowsCount).toBe(QUERY_LIMITS.reportRows);
    expect(preview.isTruncated).toBe(true);
    expect(preview.rowLimit).toBe(QUERY_LIMITS.reportRows);
    expect(preview.previewRows).toHaveLength(5);
  });

  it("denies assignment exports to customer observers", async () => {
    mockGetObserverScope.mockResolvedValue({ isUnrestricted: false, projectIds: [], cohortIds: [] });
    mockGetScopedStudentIdsForObserver.mockResolvedValue([]);

    await expect(
      generateReportDownload({
        user: { id: "observer-1", roles: ["customer_observer"] },
        type: "assignments",
        format: "csv",
      }),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });

  it("returns Russian ApiErrors for missing and unknown report types", async () => {
    await expect(
      generateReportDownload({
        user: { id: "curator-1", roles: ["curator"] },
        type: null,
        format: "csv",
      }),
    ).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
      message: "Не указан тип отчёта",
    });

    await expect(
      generateReportPreview({
        user: { id: "curator-1", roles: ["curator"] },
        type: "unknown",
      }),
    ).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
      message: "Неизвестный тип отчёта",
    });
  });

  it("scopes super-curator workload to assigned operational area", async () => {
    mockGetSuperCuratorScope.mockResolvedValue({
      isGlobal: false,
      assignments: [],
      studentIds: ["student-1"],
      curatorIds: ["curator-1"],
      cohortIds: ["cohort-1"],
    });
    mockCohortFindMany.mockResolvedValue([{ courseId: "course-1" }]);

    await generateReportDownload({
      user: { id: "super-1", roles: ["super_curator"] },
      type: "curator_workload",
      format: "csv",
    });

    expect(mockFetchCuratorWorkloadData).toHaveBeenCalledWith({
      studentIds: ["student-1"],
      curatorIds: ["curator-1"],
      cohortIds: ["cohort-1"],
      courseIds: ["course-1"],
    });
  });

  it("lists only reports available to the active role priority", () => {
    const observerReports = getAvailableReportsForRoles(["customer_observer"]).map((report) => report.type);
    expect(observerReports).toEqual(["progress", "risk", "certificates", "productivity_score"]);

    const superCuratorReports = getAvailableReportsForRoles(["super_curator"]).map((report) => report.type);
    expect(superCuratorReports).toContain("curator_workload");
    expect(superCuratorReports).toContain("productivity_score");

    expect(getAvailableReportsForRoles(["student"])).toEqual([]);
  });

  it("builds Russian-first display metadata for downloadable reports", () => {
    const observerReports = getDisplayReportsForRole(["customer_observer"]);

    expect(observerReports.map((report) => report.owner)).toEqual([
      "Наблюдатель",
      "Наблюдатель",
      "Наблюдатель",
      "Наблюдатель",
    ]);
    expect(observerReports.map((report) => report.scope)).toEqual([
      "Только разрешенные проекты",
      "Только разрешенные проекты",
      "Только разрешенные проекты",
      "Только разрешенные проекты",
    ]);
  });

  it("returns a Russian ApiError for unsupported report formats", () => {
    expect(() => parseReportFormat("html")).toThrowError(
      expect.objectContaining({
        code: "bad_request",
        status: 400,
        message: "Неподдерживаемый формат отчёта. Используйте csv, xlsx или pdf.",
      }),
    );
  });
});
