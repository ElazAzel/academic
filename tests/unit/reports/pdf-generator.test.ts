import { describe, it, expect } from "vitest";
import {
  generateProgressPdf,
  generateRiskPdf,
  generateCertificatePdf,
  generateAssignmentPdf,
  generateCuratorWorkloadPdf,
} from "@/lib/reports/pdf-generator";
import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, ProgressRow, RiskRow } from "@/lib/reports/types";

function isPdf(buf: Buffer | Uint8Array): boolean {
  // PDF files start with %PDF
  const bytes = buf instanceof Buffer ? buf : Buffer.from(buf);
  return bytes.length > 4 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 &&
    bytes[2] === 0x44 && bytes[3] === 0x46;
}

describe("generateProgressPdf", () => {
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

  it("produces valid PDF with %PDF header", async () => {
    const result = await generateProgressPdf(rows);
    expect(isPdf(result)).toBe(true);
  });

  it("handles empty rows", async () => {
    const result = await generateProgressPdf([]);
    expect(isPdf(result)).toBe(true);
  });
});

describe("generateRiskPdf", () => {
  const rows: RiskRow[] = [
    { studentName: "Alice", email: "alice@test.com", course: "AI 101", type: "inactive", severity: "critical", status: "open" },
    { studentName: "Bob", email: "bob@test.com", course: "ML 201", type: "overdue", severity: "high", status: "open" },
  ];

  it("produces valid PDF", async () => {
    const result = await generateRiskPdf(rows);
    expect(isPdf(result)).toBe(true);
  });

  it("handles empty rows", async () => {
    const result = await generateRiskPdf([]);
    expect(isPdf(result)).toBe(true);
  });
});

describe("generateCertificatePdf", () => {
  const rows: CertificateRow[] = [
    {
      number: "ASA-001",
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      issuedAt: "2026-05-01",
      status: "Действителен",
      revokedAt: null,
    },
    {
      number: "ASA-002",
      studentName: "Bob",
      email: "bob@test.com",
      course: "ML 201",
      issuedAt: "2026-05-15",
      status: "Отозван",
      revokedAt: "2026-05-20",
    },
  ];

  it("produces valid PDF", async () => {
    const result = await generateCertificatePdf(rows);
    expect(isPdf(result)).toBe(true);
  });

  it("handles empty rows", async () => {
    const result = await generateCertificatePdf([]);
    expect(isPdf(result)).toBe(true);
  });
});

describe("generateAssignmentPdf", () => {
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
  ];

  it("produces valid PDF", async () => {
    const result = await generateAssignmentPdf(rows);
    expect(isPdf(result)).toBe(true);
  });

  it("handles empty rows", async () => {
    const result = await generateAssignmentPdf([]);
    expect(isPdf(result)).toBe(true);
  });
});

describe("generateCuratorWorkloadPdf", () => {
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

  it("produces valid PDF", async () => {
    const result = await generateCuratorWorkloadPdf(rows);
    expect(isPdf(result)).toBe(true);
  });

  it("handles empty rows", async () => {
    const result = await generateCuratorWorkloadPdf([]);
    expect(isPdf(result)).toBe(true);
  });
});
