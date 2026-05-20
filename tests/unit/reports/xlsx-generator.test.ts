import { describe, it, expect } from "vitest";
import {
  generateProgressXlsx,
  generateRiskXlsx,
  generateCertificateXlsx,
  generateAssignmentXlsx,
  generateCuratorWorkloadXlsx,
} from "@/lib/reports/xlsx-generator";
import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, ProgressRow, RiskRow } from "@/lib/reports/types";

function isXlsx(buf: Buffer): boolean {
  // XLSX files are ZIP archives, start with PK\x03\x04
  return buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

describe("generateProgressXlsx", () => {
  const rows: ProgressRow[] = [
    {
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      cohort: "A",
      progressPercent: 100,
      currentModule: "Module 1",
      currentBlock: "Block A",
      currentLesson: "Lesson 1",
      lastLoginAt: "2026-05-14T10:00:00Z",
      avgLessonMinutes: 15,
      riskCount: 0,
    },
    {
      studentName: "Bob",
      email: "bob@test.com",
      course: "AI 101",
      cohort: "A",
      progressPercent: 50,
      currentModule: "Module 1",
      currentBlock: "Block B",
      currentLesson: "Lesson 2",
      lastLoginAt: null,
      avgLessonMinutes: 20,
      riskCount: 1,
    },
  ];

  it("produces valid XLSX binary", async () => {
    const buf = await generateProgressXlsx(rows);
    expect(isXlsx(buf)).toBe(true);
  });

  it("handles empty rows", async () => {
    const buf = await generateProgressXlsx([]);
    expect(isXlsx(buf)).toBe(true);
  });
});

describe("generateRiskXlsx", () => {
  const rows: RiskRow[] = [
    { studentName: "Alice", email: "alice@test.com", course: "AI 101", type: "inactive", severity: "critical", status: "open" },
    { studentName: "Bob", email: "bob@test.com", course: "ML 201", type: "overdue", severity: "high", status: "open" },
  ];

  it("produces valid XLSX binary", async () => {
    const buf = await generateRiskXlsx(rows);
    expect(isXlsx(buf)).toBe(true);
  });

  it("handles empty rows", async () => {
    const buf = await generateRiskXlsx([]);
    expect(isXlsx(buf)).toBe(true);
  });
});

describe("generateCertificateXlsx", () => {
  const rows: CertificateRow[] = [
    { number: "ASA-001", studentName: "Alice", email: "alice@test.com", course: "AI 101", issuedAt: "2026-05-01" },
    { number: "ASA-002", studentName: "Bob", email: "bob@test.com", course: "ML 201", issuedAt: "2026-05-15" },
  ];

  it("produces valid XLSX binary", async () => {
    const buf = await generateCertificateXlsx(rows);
    expect(isXlsx(buf)).toBe(true);
  });

  it("handles empty rows", async () => {
    const buf = await generateCertificateXlsx([]);
    expect(isXlsx(buf)).toBe(true);
  });
});

describe("generateAssignmentXlsx", () => {
  const rows: AssignmentRow[] = [
    {
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      lesson: "Lesson 1",
      assignment: "Strategy memo",
      status: "SUBMITTED",
      score: null,
      submittedAt: "2026-05-01",
      reviewedAt: null,
      reviewerName: null,
    },
    {
      studentName: "Bob",
      email: "bob@test.com",
      course: "AI 101",
      lesson: "Lesson 2",
      assignment: "Data analysis",
      status: "APPROVED",
      score: 85,
      submittedAt: "2026-05-02",
      reviewedAt: "2026-05-05",
      reviewerName: "Curator A",
    },
  ];

  it("produces valid XLSX binary", async () => {
    const buf = await generateAssignmentXlsx(rows);
    expect(isXlsx(buf)).toBe(true);
  });

  it("handles empty rows", async () => {
    const buf = await generateAssignmentXlsx([]);
    expect(isXlsx(buf)).toBe(true);
  });
});

describe("generateCuratorWorkloadXlsx", () => {
  const rows: CuratorWorkloadRow[] = [
    {
      curatorName: "Curator A",
      curatorEmail: "curator@test.com",
      cohorts: "Cohort A",
      studentsCount: 12,
      avgProgress: 55,
      openQuestions: 2,
      pendingAssignments: 3,
      activeRisks: 1,
      criticalRisks: 0,
    },
  ];

  it("produces valid XLSX binary", async () => {
    const buf = await generateCuratorWorkloadXlsx(rows);
    expect(isXlsx(buf)).toBe(true);
  });

  it("handles empty rows", async () => {
    const buf = await generateCuratorWorkloadXlsx([]);
    expect(isXlsx(buf)).toBe(true);
  });
});
