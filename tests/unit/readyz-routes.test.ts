import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $queryRaw: mockQueryRaw,
  }),
}));

const rootReadyz = await import("@/app/api/readyz/route");
const v1Readyz = await import("@/app/api/v1/readyz/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockQueryRaw.mockResolvedValue([{ ok: 1 }]);
});

describe("readyz routes", () => {
  it("returns root readiness payload when database is available", async () => {
    const response = await rootReadyz.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ status: "ready" });
  });

  it("returns v1 readiness payload when database is available", async () => {
    const response = await v1Readyz.GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ status: "ready", database: "ok" });
  });

  it("returns a Russian root readiness error when database is unavailable", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("postgres://secret-readyz-error"));

    const response = await rootReadyz.GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatchObject({
      code: "service_unavailable",
      message: "База данных недоступна",
    });
    expect(JSON.stringify(body)).not.toContain("secret-readyz-error");
  });

  it("returns a Russian v1 readiness error when database is unavailable", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("postgres://secret-readyz-error"));

    const response = await v1Readyz.GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatchObject({
      code: "service_unavailable",
      message: "База данных недоступна",
    });
    expect(JSON.stringify(body)).not.toContain("secret-readyz-error");
  });
});
