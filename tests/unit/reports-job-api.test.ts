import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetAvailableReportsForRoles = vi.hoisted(() => vi.fn());
const mockWriteOutboxEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/server/modules/reports/service", () => ({
  getAvailableReportsForRoles: mockGetAvailableReportsForRoles,
}));

vi.mock("@/server/modules/outbox/service", () => ({
  writeOutboxEvent: mockWriteOutboxEvent,
}));

const { POST } = await import("@/app/api/v1/reports/job/route");

function jobRequest(payload = { type: "progress", format: "csv" }) {
  return new Request("http://localhost/api/v1/reports/job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "curator-1", roles: ["curator"] });
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 });
  mockGetAvailableReportsForRoles.mockReturnValue([
    {
      type: "progress",
      title: "Прогресс",
      owner: "Academic operations",
      decision: "Контроль прогресса",
      allowedRoles: ["curator"],
    },
  ]);
  mockWriteOutboxEvent.mockResolvedValue({ id: "job-1" });
});

describe("reports job API access", () => {
  it("requires reports read permission before queuing report jobs", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await POST(jobRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("reports:read");
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(mockGetAvailableReportsForRoles).not.toHaveBeenCalled();
    expect(mockWriteOutboxEvent).not.toHaveBeenCalled();
  });

  it("queues an async report job for an allowed report type", async () => {
    const response = await POST(jobRequest({ type: "progress", format: "xlsx" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ jobId: "job-1", status: "pending" });
    expect(mockRequireUser).toHaveBeenCalledWith("reports:read");
    expect(mockCheckRateLimit).toHaveBeenCalledWith("reports:job:curator-1");
    expect(mockWriteOutboxEvent).toHaveBeenCalledWith("report.generate", {
      reportType: "progress",
      format: "xlsx",
      userId: "curator-1",
    });
  });

  it("returns structured rate-limit errors before parsing and queuing report jobs", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 60000 });

    const response = await POST(jobRequest());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("too_many_requests");
    expect(mockGetAvailableReportsForRoles).not.toHaveBeenCalled();
    expect(mockWriteOutboxEvent).not.toHaveBeenCalled();
  });

  it("does not queue jobs for report types unavailable to the user's roles", async () => {
    mockGetAvailableReportsForRoles.mockReturnValue([]);

    const response = await POST(jobRequest({ type: "certificates", format: "pdf" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockWriteOutboxEvent).not.toHaveBeenCalled();
  });
});
