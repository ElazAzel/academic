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

    expect(response.status).toBe(401);
    expect(mockProcessReportJobs).not.toHaveBeenCalled();
    expect(mockProcessNotificationEvents).not.toHaveBeenCalled();
  });

  it("rejects request without Authorization header", async () => {
    const response = await outboxRoute.POST(
      new Request("http://localhost/api/v1/outbox/process", { method: "POST" }),
    );

    expect(response.status).toBe(401);
  });
});
