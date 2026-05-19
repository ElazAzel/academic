import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    CRON_SECRET: undefined,
  },
}));

const mockProcessReportJobs = vi.hoisted(() => vi.fn());
const mockProcessNotificationEvents = vi.hoisted(() => vi.fn());

vi.mock("@/server/modules/reports/processor", () => ({
  processReportJobs: mockProcessReportJobs,
}));

vi.mock("@/server/modules/notifications/outbox-handler", () => ({
  processNotificationEvents: mockProcessNotificationEvents,
}));

const outboxRoute = await import("@/app/api/v1/outbox/process/route");
const scheduledRoute = await import("@/app/api/v1/reports/scheduled/route");

describe("cron route authentication", () => {
  it("does not process outbox jobs when CRON_SECRET is unset", async () => {
    const response = await outboxRoute.POST(new Request("http://localhost/api/v1/outbox/process", { method: "POST" }));

    expect(response.status).toBe(503);
    expect(mockProcessReportJobs).not.toHaveBeenCalled();
    expect(mockProcessNotificationEvents).not.toHaveBeenCalled();
  });

  it("does not process scheduled reports when CRON_SECRET is unset", async () => {
    const response = await scheduledRoute.POST(new Request("http://localhost/api/v1/reports/scheduled", { method: "POST" }));

    expect(response.status).toBe(503);
    expect(mockProcessReportJobs).not.toHaveBeenCalled();
  });
});
