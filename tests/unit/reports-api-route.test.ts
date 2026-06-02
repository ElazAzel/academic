import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGenerateReportDownload = vi.hoisted(() => vi.fn());
const mockGenerateReportPreview = vi.hoisted(() => vi.fn());
const mockGetAvailableReportsForRoles = vi.hoisted(() => vi.fn());
const mockParseReportFormat = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/server/modules/reports/service", () => ({
  generateReportDownload: mockGenerateReportDownload,
  generateReportPreview: mockGenerateReportPreview,
  getAvailableReportsForRoles: mockGetAvailableReportsForRoles,
  parseReportFormat: mockParseReportFormat,
}));

const reportsRoute = await import("@/app/api/v1/reports/route");
const previewRoute = await import("@/app/api/v1/reports/preview/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "curator-1", roles: ["curator"] });
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 });
  mockParseReportFormat.mockReturnValue("csv");
  mockGetAvailableReportsForRoles.mockReturnValue([
    { type: "progress", title: "Прогресс", owner: "Academic operations", decision: "Контроль прогресса", allowedRoles: ["curator"] },
  ]);
  mockGenerateReportDownload.mockResolvedValue({
    content: "student,progress\nИван,80",
    format: "csv",
    filename: "progress_report.csv",
    definition: { type: "progress", owner: "Academic operations" },
    access: { scopeLabel: "Назначенные слушатели куратора" },
  });
  mockGenerateReportPreview.mockResolvedValue({
    type: "progress",
    totalRowsCount: 1,
    previewRows: [{ studentName: "Иван" }],
  });
});

describe("reports API route scope", () => {
  it("requires reports read permission for downloads and metadata", async () => {
    const response = await reportsRoute.GET(new Request("http://localhost/api/v1/reports?meta=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("reports:read");
    expect(body.data).toEqual([
      {
        type: "progress",
        title: "Прогресс",
        owner: "Academic operations",
        decision: "Контроль прогресса",
        allowedRoles: ["curator"],
      },
    ]);
  });

  it("does not generate reports when reports read permission is missing", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await reportsRoute.GET(new Request("http://localhost/api/v1/reports?type=progress&format=csv"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockGenerateReportDownload).not.toHaveBeenCalled();
  });

  it("returns structured rate-limit errors before generating report downloads", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await reportsRoute.GET(new Request("http://localhost/api/v1/reports?type=progress&format=csv"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(mockGenerateReportDownload).not.toHaveBeenCalled();
  });

  it("requires reports read permission for report previews", async () => {
    const response = await previewRoute.GET(new Request("http://localhost/api/v1/reports/preview?type=progress"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRequireUser).toHaveBeenCalledWith("reports:read");
    expect(body.data.previewRows).toEqual([{ studentName: "Иван" }]);
  });

  it("does not generate previews when reports read permission is missing", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await previewRoute.GET(new Request("http://localhost/api/v1/reports/preview?type=progress"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockGenerateReportPreview).not.toHaveBeenCalled();
  });

  it("returns structured rate-limit errors before generating report previews", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await previewRoute.GET(new Request("http://localhost/api/v1/reports/preview?type=progress"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(mockGenerateReportPreview).not.toHaveBeenCalled();
  });
});
