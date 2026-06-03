import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockOutboxEventFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    outboxEvent: { findUnique: mockOutboxEventFindUnique },
  }),
}));

const { GET } = await import("@/app/api/v1/reports/job/status/route");

function statusRequest(jobId = "job-1") {
  return new NextRequest(`http://localhost/api/v1/reports/job/status?jobId=${jobId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "user-1", roles: ["curator"] });
  mockOutboxEventFindUnique.mockResolvedValue({
    id: "job-1",
    status: "sent",
    error: null,
    payload: {
      userId: "user-1",
      downloadUrl: "/api/v1/reports?type=progress&format=csv",
    },
  });
});

describe("reports job status API privacy", () => {
  it("requires reports read permission before polling report jobs", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await GET(statusRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("reports:read");
    expect(mockOutboxEventFindUnique).not.toHaveBeenCalled();
  });

  it("lets the report job owner poll status and download URL", async () => {
    const response = await GET(statusRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "completed",
      downloadUrl: "/api/v1/reports?type=progress&format=csv",
    });
  });

  it("returns sanitized download URLs with selected fields", async () => {
    mockOutboxEventFindUnique.mockResolvedValue({
      id: "job-1",
      status: "sent",
      error: null,
      payload: {
        userId: "user-1",
        downloadUrl: "/api/v1/reports?type=certificates&format=csv&fields=number,status,revokedAt",
      },
    });

    const response = await GET(statusRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "completed",
      downloadUrl: "/api/v1/reports?type=certificates&format=csv&fields=number%2Cstatus%2CrevokedAt",
    });
  });

  it("does not return download URLs with unsafe selected fields", async () => {
    mockOutboxEventFindUnique.mockResolvedValue({
      id: "job-1",
      status: "sent",
      error: null,
      payload: {
        userId: "user-1",
        downloadUrl: "/api/v1/reports?type=progress&format=csv&fields=studentName,bad-field",
      },
    });

    const response = await GET(statusRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "completed" });
  });

  it("denies polling another user's report job", async () => {
    mockRequireUser.mockResolvedValue({ id: "user-2", roles: ["curator"] });

    const response = await GET(statusRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: {
        code: "forbidden",
        message: "Доступ к задаче запрещен",
      },
    });
  });

  it("treats jobs without owner userId as admin-only", async () => {
    mockOutboxEventFindUnique.mockResolvedValue({
      id: "job-legacy",
      status: "sent",
      error: null,
      payload: { downloadUrl: "/api/v1/reports?type=certificates&format=pdf" },
    });

    const response = await GET(statusRequest("job-legacy"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
  });

  it("lets admins inspect legacy jobs without owner userId", async () => {
    mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
    mockOutboxEventFindUnique.mockResolvedValue({
      id: "job-legacy",
      status: "sent",
      error: null,
      payload: { downloadUrl: "/api/v1/reports?type=certificates&format=pdf" },
    });

    const response = await GET(statusRequest("job-legacy"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.downloadUrl).toBe("/api/v1/reports?type=certificates&format=pdf");
  });

  it("does not return external or malformed download URLs from job payload", async () => {
    mockOutboxEventFindUnique.mockResolvedValue({
      id: "job-1",
      status: "sent",
      error: null,
      payload: {
        userId: "user-1",
        downloadUrl: "https://example.com/steal.csv",
      },
    });

    const response = await GET(statusRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "completed" });
  });
});
