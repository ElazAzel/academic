import { describe, it, expect } from "vitest";
import type { ReportData, ReportFormat, ProgressRow, RiskRow, CertificateRow } from "@/lib/reports/types";

describe("ReportFormat", () => {
  it("accepts csv", () => {
    const formats: ReportFormat[] = ["csv", "xlsx", "pdf"] as const;
    expect(formats).toContain("csv");
    expect(formats).toContain("xlsx");
    expect(formats).toContain("pdf");
  });

  it("rejects unknown formats", () => {
    const isKnown = (v: string): v is ReportFormat =>
      ["csv", "xlsx", "pdf"].includes(v);
    expect(isKnown("csv")).toBe(true);
    expect(isKnown("xlsx")).toBe(true);
    expect(isKnown("pdf")).toBe(true);
    expect(isKnown("html")).toBe(false);
    expect(isKnown("json")).toBe(false);
  });
});

describe("ReportData<T>", () => {
  const progressData: ReportData<ProgressRow> = {
    title: "Отчёт по прогрессу",
    filename: "progress.csv",
    rows: [
      {
        studentName: "Alice",
        email: "alice@test.com",
        course: "AI 101",
        cohort: "A",
        progressPercent: 100,
      },
    ],
    grouped: new Map([["AI 101", [{
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      cohort: "A",
      progressPercent: 100,
    }]]]),
    summary: { total: 1, completed: 1 },
  };

  it("has correct structure with title, filename, rows, grouped, summary", () => {
    expect(progressData).toHaveProperty("title");
    expect(progressData).toHaveProperty("filename");
    expect(progressData).toHaveProperty("rows");
    expect(progressData).toHaveProperty("grouped");
    expect(progressData).toHaveProperty("summary");

    expect(typeof progressData.title).toBe("string");
    expect(progressData.filename).toMatch(/\.csv$/);
    expect(Array.isArray(progressData.rows)).toBe(true);
    expect(progressData.grouped instanceof Map).toBe(true);
    expect(typeof progressData.summary).toBe("object");
  });

  it("groups rows by course in grouped map", () => {
    const rows: ProgressRow[] = [
      { studentName: "Alice", email: "a@t.com", course: "AI 101", cohort: "A", progressPercent: 100 },
      { studentName: "Bob", email: "b@t.com", course: "AI 101", cohort: "A", progressPercent: 50 },
      { studentName: "Charlie", email: "c@t.com", course: "ML 201", cohort: "B", progressPercent: 75 },
    ];

    const grouped = new Map<string, ProgressRow[]>();
    for (const r of rows) {
      const existing = grouped.get(r.course) ?? [];
      existing.push(r);
      grouped.set(r.course, existing);
    }

    const data: ReportData<ProgressRow> = {
      title: "Test",
      filename: "test.csv",
      rows,
      grouped,
      summary: { total: 3 },
    };

    expect(data.grouped.size).toBe(2);
    expect(data.grouped.get("AI 101")).toHaveLength(2);
    expect(data.grouped.get("ML 201")).toHaveLength(1);
    expect(data.summary.total).toBe(3);
  });
});

describe("ReportData with RiskRow", () => {
  it("stores risk rows correctly", () => {
    const riskData: ReportData<RiskRow> = {
      title: "Отчёт по рискам",
      filename: "risks.csv",
      rows: [
        { studentName: "Alice", email: "a@t.com", course: "AI 101", type: "inactive", severity: "high", status: "open" },
      ],
      grouped: new Map(),
      summary: { critical: 0, high: 1 },
    };

    expect(riskData.rows[0].severity).toBe("high");
    expect(riskData.rows[0].type).toBe("inactive");
    expect(riskData.summary.high).toBe(1);
  });
});

describe("ReportData with CertificateRow", () => {
  it("stores certificate rows correctly", () => {
    const certData: ReportData<CertificateRow> = {
      title: "Отчёт по сертификатам",
      filename: "certs.csv",
      rows: [
        { number: "ASA-001", studentName: "Alice", email: "a@t.com", course: "AI 101", issuedAt: "2026-05-01" },
      ],
      grouped: new Map(),
      summary: { total: 1 },
    };

    expect(certData.rows[0].number).toBe("ASA-001");
    expect(certData.rows[0].issuedAt).toBe("2026-05-01");
    expect(certData.summary.total).toBe(1);
  });
});
