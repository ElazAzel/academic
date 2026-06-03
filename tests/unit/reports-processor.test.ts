import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDequeuePendingEvents = vi.hoisted(() => vi.fn());
const mockMarkFailed = vi.hoisted(() => vi.fn());
const mockGenerateReportDownload = vi.hoisted(() => vi.fn());
const mockGetReportUser = vi.hoisted(() => vi.fn());
const mockParseReportFormat = vi.hoisted(() => vi.fn());
const mockOutboxUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    outboxEvent: { update: mockOutboxUpdate },
  }),
}));
vi.mock("@/server/modules/outbox/service", () => ({
  dequeuePendingEvents: mockDequeuePendingEvents,
  markFailed: mockMarkFailed,
}));
vi.mock("@/server/modules/reports/service", () => ({
  generateReportDownload: mockGenerateReportDownload,
  getReportUser: mockGetReportUser,
  parseReportFormat: mockParseReportFormat,
}));

const { processReportJobs } = await import("@/server/modules/reports/processor");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockParseReportFormat.mockReturnValue("csv");
  mockGetReportUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
  mockGenerateReportDownload.mockResolvedValue({
    definition: { type: "progress", owner: "admin" },
    format: "csv",
    access: { scopeLabel: "Все данные" },
    filename: "progress.csv",
    content: "id,name\n1,test",
  });
});

describe("processReportJobs", () => {
  it("marks invalid report payloads with a safe Russian message", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      { id: "event-1", eventType: "report.generate", payload: { reportType: "progress" } },
    ]);

    const result = await processReportJobs();

    expect(result).toBe(1);
    expect(mockMarkFailed).toHaveBeenCalledWith("event-1", "Некорректный payload отчета");
    expect(mockGenerateReportDownload).not.toHaveBeenCalled();
  });

  it("stores generated report metadata and marks the event as sent", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "report.generate",
        payload: { reportType: "progress", format: "csv", userId: "admin-1" },
      },
    ]);

    const result = await processReportJobs();

    expect(result).toBe(1);
    expect(mockOutboxUpdate).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({
        status: "sent",
        payload: expect.objectContaining({
          reportType: "progress",
          format: "csv",
          userId: "admin-1",
          downloadUrl: "/api/v1/reports?type=progress&format=csv",
          filename: "progress.csv",
          sizeBytes: 14,
        }),
      }),
    });
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it("preserves selected fields in generated report jobs", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "report.generate",
        payload: { reportType: "progress", format: "csv", userId: "admin-1", fields: ["studentName", "email"] },
      },
    ]);

    const result = await processReportJobs();

    expect(result).toBe(1);
    expect(mockGenerateReportDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "progress",
        format: "csv",
        fields: ["studentName", "email"],
        user: expect.objectContaining({ id: "admin-1" }),
      }),
    );
    expect(mockOutboxUpdate).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: expect.objectContaining({
        status: "sent",
        payload: expect.objectContaining({
          downloadUrl: "/api/v1/reports?type=progress&format=csv&fields=studentName%2Cemail",
          fields: ["studentName", "email"],
        }),
      }),
    });
  });

  it("does not persist raw report generation errors into outbox state", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "report.generate",
        payload: { reportType: "progress", format: "csv", userId: "admin-1" },
      },
    ]);
    mockGenerateReportDownload.mockRejectedValue(new Error("postgres://secret-report-error"));

    const result = await processReportJobs();

    expect(result).toBe(1);
    expect(mockMarkFailed).toHaveBeenCalledWith("event-1", "Не удалось сформировать отчет");
    expect(JSON.stringify(mockMarkFailed.mock.calls)).not.toContain("secret-report-error");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-report-error");
    expect(consoleError).toHaveBeenCalledWith(
      "[Reports Processor] Failed job",
      expect.objectContaining({ eventId: "event-1", errorType: "Error" }),
    );
  });
});
