import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: "this-is-a-32-plus-char-secret-for-cron-jobs!",
  },
}));

const mockProcessReportJobs = vi.hoisted(() => vi.fn().mockResolvedValue(3));
const mockProcessNotificationEvents = vi.hoisted(() => vi.fn().mockResolvedValue(5));

vi.mock("@/server/modules/reports/processor", () => ({
  processReportJobs: mockProcessReportJobs,
}));

vi.mock("@/server/modules/notifications/outbox-handler", () => ({
  processNotificationEvents: mockProcessNotificationEvents,
}));

const outboxRoute = await import("@/app/api/v1/outbox/process/route");
const scheduledRoute = await import("@/app/api/v1/reports/scheduled/route");

describe("cron route — authorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes outbox jobs when CRON_SECRET is set and matches", async () => {
    const response = await outboxRoute.POST(
      new Request("http://localhost/api/v1/outbox/process", {
        method: "POST",
        headers: { authorization: "Bearer this-is-a-32-plus-char-secret-for-cron-jobs!" },
      }),
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.reportsProcessed).toBe(3);
    expect(body.notificationsProcessed).toBe(5);
    expect(body.timestamp).toBeDefined();

    expect(mockProcessReportJobs).toHaveBeenCalledWith(50);
    expect(mockProcessNotificationEvents).toHaveBeenCalledWith(50);
  });

  it("rejects request with wrong CRON_SECRET", async () => {
    const response = await outboxRoute.POST(
      new Request("http://localhost/api/v1/outbox/process", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockProcessReportJobs).not.toHaveBeenCalled();
    expect(mockProcessNotificationEvents).not.toHaveBeenCalled();
  });

  it("rejects request without Authorization header", async () => {
    const response = await outboxRoute.POST(
      new Request("http://localhost/api/v1/outbox/process", { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("rejects scheduled reports with wrong CRON_SECRET", async () => {
    const response = await scheduledRoute.POST(
      new Request("http://localhost/api/v1/reports/scheduled", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockProcessReportJobs).not.toHaveBeenCalled();
  });

  it("does not leak raw processor errors from the outbox endpoint", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockProcessReportJobs.mockRejectedValueOnce(new Error("database connection details"));

    const response = await outboxRoute.POST(
      new Request("http://localhost/api/v1/outbox/process", {
        method: "POST",
        headers: { authorization: "Bearer this-is-a-32-plus-char-secret-for-cron-jobs!" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("database connection details");
    expect(consoleSpy).toHaveBeenCalledWith("[Outbox Processor] Error:", expect.any(Error));
    consoleSpy.mockRestore();
  });
});
