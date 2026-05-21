import { describe, expect, it, vi } from "vitest";
import { groupByCourse } from "@/lib/reports/data";
import { generateProgressCsv, generateRiskCsv, generateCertificateCsv } from "@/lib/reports/csv-generator";

const mockEnrollmentFindMany = vi.hoisted(() => vi.fn());
const mockRiskFlagFindMany = vi.hoisted(() => vi.fn());
const mockCertificateFindMany = vi.hoisted(() => vi.fn());
const mockLessonProgressFindMany = vi.hoisted(() => vi.fn());
const mockRiskFlagGroupBy = vi.hoisted(() => vi.fn());
const mockQueryRaw = vi.hoisted(() => vi.fn());
const mockAuditCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    $queryRaw: mockQueryRaw,
    enrollment: { findMany: mockEnrollmentFindMany },
    riskFlag: { findMany: mockRiskFlagFindMany, groupBy: mockRiskFlagGroupBy },
    certificate: { findMany: mockCertificateFindMany },
    lessonProgress: { findMany: mockLessonProgressFindMany },
    auditLog: { create: mockAuditCreate },
  }),
}));

const { fetchProgressData, fetchRiskData, fetchCertificateData } = await import("@/lib/reports/data");

describe("groupByCourse", () => {
  const rows: { course: string; studentName: string; progressPercent: number }[] = [
    { course: "AI 101", studentName: "Alice", progressPercent: 80 },
    { course: "AI 101", studentName: "Bob", progressPercent: 90 },
    { course: "ML 201", studentName: "Charlie", progressPercent: 70 },
  ];

  it("groups rows by course name", () => {
    const grouped = groupByCourse(rows);
    expect(grouped.size).toBe(2);
    expect(grouped.get("AI 101")?.length).toBe(2);
    expect(grouped.get("ML 201")?.length).toBe(1);
  });

  it("returns empty map for empty input", () => {
    const grouped = groupByCourse([]);
    expect(grouped.size).toBe(0);
  });
});

describe("generateProgressCsv", () => {
  const rows = [
    { studentName: "Alice", email: "alice@test.com", course: "AI 101", cohort: "A", progressPercent: 100 },
    { studentName: "Bob", email: "bob@test.com", course: "ML 201", cohort: "B", progressPercent: 40 },
  ];

  it("includes BOM and title header", () => {
    const csv = generateProgressCsv(rows);
    expect(csv).toContain("\uFEFF");
    expect(csv).toContain("ОТЧЁТ ПО ПРОГРЕССУ СЛУШАТЕЛЕЙ");
  });

  it("contains per-course summaries", () => {
    const csv = generateProgressCsv(rows);
    expect(csv).toContain("КУРС: AI 101");
    expect(csv).toContain("КУРС: ML 201");
  });

  it("contains overall summary", () => {
    const csv = generateProgressCsv(rows);
    expect(csv).toContain("=== СВОДКА ===");
    expect(csv).toContain("Всего записей: 2");
    expect(csv).toContain("Завершили курс: 1");
  });

  it("handles empty rows", () => {
    const csv = generateProgressCsv([]);
    expect(csv).toContain("Всего записей: 0");
  });
});

describe("generateRiskCsv", () => {
  const rows = [
    { studentName: "Alice", email: "alice@test.com", course: "AI 101", type: "inactive_login", severity: "high", status: "open" },
    { studentName: "Bob", email: "bob@test.com", course: "ML 201", type: "overdue_module", severity: "critical", status: "open" },
  ];

  it("includes BOM and title", () => {
    const csv = generateRiskCsv(rows);
    expect(csv).toContain("\uFEFF");
    expect(csv).toContain("ОТЧЁТ ПО РИСКАМ СЛУШАТЕЛЕЙ");
  });

  it("counts critical and high risks", () => {
    const csv = generateRiskCsv(rows);
    expect(csv).toContain("Критических,1");
    expect(csv).toContain("Высоких,1");
  });

  it("handles empty rows", () => {
    const csv = generateRiskCsv([]);
    expect(csv).toContain("Всего рисков,0");
  });
});

describe("generateCertificateCsv", () => {
  const rows = [
    { number: "C001", studentName: "Alice", email: "alice@test.com", course: "AI 101", issuedAt: "2026-05-01" },
  ];

  it("includes BOM and title", () => {
    const csv = generateCertificateCsv(rows);
    expect(csv).toContain("\uFEFF");
    expect(csv).toContain("ОТЧЁТ ПО СЕРТИФИКАТАМ");
  });

  it("contains certificate data", () => {
    const csv = generateCertificateCsv(rows);
    expect(csv).toContain("C001");
    expect(csv).toContain("Alice");
    expect(csv).toContain("2026-05-01");
  });

  it("handles empty rows", () => {
    const csv = generateCertificateCsv([]);
    expect(csv).toContain("Всего сертификатов,0");
  });
});

describe("fetchProgressData", () => {
  it("returns correctly shaped ProgressRow array", async () => {
    mockEnrollmentFindMany.mockResolvedValue([
      {
        userId: "u1",
        user: { name: "Alice", email: "alice@test.com", lastLoginAt: new Date("2026-05-01") },
        course: { id: "c1", title: "AI 101" },
        cohort: { name: "Cohort A" },
        courseProgress: [{ percent: 75 }],
      },
      {
        userId: "u2",
        user: { name: null, email: "bob@test.com", lastLoginAt: null },
        course: { id: "c2", title: "ML 201" },
        cohort: null,
        courseProgress: [],
      },
    ]);
    mockLessonProgressFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);
    mockRiskFlagGroupBy.mockResolvedValue([]);

    const rows = await fetchProgressData();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      cohort: "Cohort A",
      progressPercent: 75,
    });
    expect(rows[1]).toMatchObject({
      studentName: "bob@test.com",
      cohort: "Без потока",
      progressPercent: 0,
    });
  });

  it("filters by studentIds when provided", async () => {
    mockEnrollmentFindMany.mockResolvedValue([]);
    mockLessonProgressFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);
    mockRiskFlagGroupBy.mockResolvedValue([]);
    await fetchProgressData(["u1"]);
    expect(mockEnrollmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ["u1"] } },
      })
    );
  });
});

describe("fetchRiskData", () => {
  it("returns correctly shaped RiskRow array", async () => {
    mockRiskFlagFindMany.mockResolvedValue([
      {
        userId: "u1",
        user: { name: "Alice", email: "alice@test.com" },
        course: { title: "AI 101" },
        type: "inactive_login",
        severity: "high",
        status: "open",
      },
    ]);

    const rows = await fetchRiskData();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      type: "inactive_login",
      severity: "high",
      status: "open",
    });
  });

  it("handles null course", async () => {
    mockRiskFlagFindMany.mockResolvedValue([
      {
        userId: "u1",
        user: { name: "Alice", email: "alice@test.com" },
        course: null,
        type: "inactive_login",
        severity: "low",
        status: "open",
      },
    ]);

    const rows = await fetchRiskData();
    expect(rows[0].course).toBe("—");
  });
});

describe("fetchCertificateData", () => {
  it("returns correctly shaped CertificateRow array", async () => {
    mockCertificateFindMany.mockResolvedValue([
      {
        number: "ASA-2026-0001",
        userId: "u1",
        user: { name: "Alice", email: "alice@test.com" },
        course: { title: "AI 101" },
        issuedAt: new Date("2026-05-01"),
      },
    ]);

    const rows = await fetchCertificateData();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      number: "ASA-2026-0001",
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      issuedAt: "2026-05-01",
    });
  });

  it("uses email when name is null", async () => {
    mockCertificateFindMany.mockResolvedValue([
      {
        number: "ASA-2026-0002",
        userId: "u2",
        user: { name: null, email: "bob@test.com" },
        course: { title: "ML 201" },
        issuedAt: new Date("2026-05-02"),
      },
    ]);

    const rows = await fetchCertificateData();
    expect(rows[0].studentName).toBe("bob@test.com");
  });
});
