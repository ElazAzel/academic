import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    user: {
      findMany: mockUserFindMany,
    },
  }),
}));

const usersExportRoute = await import("@/app/api/v1/users/export/route");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
  mockUserFindMany.mockResolvedValue([]);
});

describe("users export API", () => {
  it("preserves requireUser authorization errors and does not query users", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("unauthorized", "Требуется вход", 401));

    const response = await usersExportRoute.GET(new Request("http://localhost/api/v1/users/export"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("allows only admin and super curator roles to export users", async () => {
    mockRequireUser.mockResolvedValue({ id: "instructor-1", roles: ["instructor"] });

    const response = await usersExportRoute.GET(new Request("http://localhost/api/v1/users/export"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("exports filtered users as BOM-prefixed escaped CSV", async () => {
    mockRequireUser.mockResolvedValue({ id: "super-curator-1", roles: ["super_curator"] });
    mockUserFindMany.mockResolvedValue([
      {
        name: 'Alice "Lead"',
        email: "=cmd@example.test",
        organization: "Academy, HQ",
        status: "ACTIVE",
        lastLoginAt: new Date("2026-06-01T12:00:00.000Z"),
        createdAt: new Date("2026-05-20T12:00:00.000Z"),
      },
    ]);

    const response = await usersExportRoute.GET(
      new Request("http://localhost/api/v1/users/export?search=alice"),
    );
    const csv = Buffer.from(await response.arrayBuffer()).toString("utf8");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Alice ""Lead"""');
    expect(csv).toContain('"\'=cmd@example.test"');
    expect(csv).toContain('"Academy, HQ"');
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "alice", mode: "insensitive" } },
            { email: { contains: "alice", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("does not leak raw database errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUserFindMany.mockRejectedValue(new Error("postgres://secret-password"));

    const response = await usersExportRoute.GET(new Request("http://localhost/api/v1/users/export"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("secret-password");
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-password");
    expect(consoleSpy).toHaveBeenCalledWith("[Users Export] Error", expect.objectContaining({ errorType: "Error" }));
    consoleSpy.mockRestore();
  });
});
