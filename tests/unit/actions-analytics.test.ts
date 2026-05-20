import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockReportCreate = vi.hoisted(() => vi.fn());
const mockRiskFlagCreate = vi.hoisted(() => vi.fn());
const mockRiskFlagFindUnique = vi.hoisted(() => vi.fn());
const mockRiskFlagUpdate = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("@/server/modules/audit/service", () => ({ logAudit: mockLogAudit }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    report: { create: mockReportCreate },
    riskFlag: { create: mockRiskFlagCreate, findUnique: mockRiskFlagFindUnique, update: mockRiskFlagUpdate },
    curatorAssignment: { findFirst: mockCuratorAssignmentFindFirst },
  }),
}));

const { generateReportAction, createRiskFlagAction, resolveRiskFlagAction } = await import("@/server/actions/analytics");

const adminUser = { id: "admin1", email: "admin@test.com", name: "Admin", roles: ["admin"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(adminUser);
  mockCuratorAssignmentFindFirst.mockResolvedValue({ id: "ass1" });
});

describe("generateReportAction", () => {
  it("creates a report and logs audit", async () => {
    mockReportCreate.mockResolvedValue({ id: "rpt1", projectId: "p1", type: "progress", status: "ready", url: expect.any(String) });

    const result = await generateReportAction("p1", "progress");
    expect(mockReportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "p1", type: "progress", status: "ready" }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "report.generated" }));
    expect(result.id).toBe("rpt1");
  });
});

describe("createRiskFlagAction", () => {
  it("creates a risk flag", async () => {
    mockRiskFlagCreate.mockResolvedValue({ id: "flag1", userId: "u1", type: "inactive_login", severity: "high", status: "open" });

    const result = await createRiskFlagAction("u1", "inactive_login", "c1", "coh1");
    expect(mockRiskFlagCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", type: "inactive_login", courseId: "c1", cohortId: "coh1" }),
      }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "risk_flag.created" }));
    expect(result.status).toBe("open");
  });

  it("throws if no access to student", async () => {
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);
    mockRequireRole.mockResolvedValue({ id: "cur1", email: "cur@test.com", name: "Curator", roles: ["curator"] });

    await expect(createRiskFlagAction("u1", "inactive_login")).rejects.toThrow("Доступ запрещен");
  });
});

describe("resolveRiskFlagAction", () => {
  it("resolves a risk flag", async () => {
    mockRiskFlagFindUnique.mockResolvedValue({ id: "flag1", userId: "u1" });
    mockRiskFlagUpdate.mockResolvedValue({ id: "flag1", status: "resolved" });

    const result = await resolveRiskFlagAction("flag1");
    expect(result.status).toBe("resolved");
    expect(mockRiskFlagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "flag1" }, data: expect.objectContaining({ status: "resolved" }) }),
    );
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "risk_flag.resolved" }));
  });

  it("throws if flag not found", async () => {
    mockRiskFlagFindUnique.mockResolvedValue(null);
    await expect(resolveRiskFlagAction("bad-id")).rejects.toThrow("Флаг риска не найден");
  });
});
