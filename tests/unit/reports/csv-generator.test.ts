import { describe, it, expect } from "vitest";
import {
  generateAssignmentCsv,
  generateCuratorWorkloadCsv,
  generateProgressCsv,
  generateRiskCsv,
  generateCertificateCsv,
} from "@/lib/reports/csv-generator";
import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, ProgressRow, RiskRow } from "@/lib/reports/types";

describe("generateProgressCsv", () => {
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

  it("produces valid CSV with header row and data rows per course", () => {
    const csv = generateProgressCsv(rows);
    const lines = csv.split("\n");
    const headerLine = lines.find((l) => l.startsWith("Слушатель,Email,"));
    expect(headerLine).toBeDefined();
    expect(headerLine).toContain("Слушатель,Email,Поток,Прогресс %");

    const dataLines = lines.filter((l) => l.startsWith("Alice,") || l.startsWith("Bob,"));
    expect(dataLines.length).toBeGreaterThan(0);
  });

  it("contains per-course and overall summary sections", () => {
    const csv = generateProgressCsv(rows);
    expect(csv).toContain("КУРС: AI 101");
    expect(csv).toContain("=== СВОДКА ===");
    expect(csv).toContain("Всего записей: 2");
    expect(csv).toContain("Завершили курс: 1");
  });

  it("includes BOM and title header", () => {
    const csv = generateProgressCsv(rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("ОТЧЁТ ПО ПРОГРЕССУ СЛУШАТЕЛЕЙ");
  });

  it("handles empty rows", () => {
    const csv = generateProgressCsv([]);
    expect(csv).toContain("Всего записей: 0");
  });
});

describe("generateRiskCsv", () => {
  const rows: RiskRow[] = [
    {
      studentName: "Alice",
      email: "alice@test.com",
      course: "AI 101",
      type: "inactive_login",
      severity: "critical",
      status: "open",
    },
    {
      studentName: "Bob",
      email: "bob@test.com",
      course: "ML 201",
      type: "overdue_module",
      severity: "high",
      status: "open",
    },
    {
      studentName: "Charlie",
      email: "charlie@test.com",
      course: "AI 101",
      type: "low_score",
      severity: "low",
      status: "resolved",
    },
  ];

  it("includes severity levels in output", () => {
    const csv = generateRiskCsv(rows);
    expect(csv).toContain("Критических,1");
    expect(csv).toContain("Высоких,1");
    expect(csv).toContain("Всего рисков,3");
  });

  it("has correct header columns", () => {
    const csv = generateRiskCsv(rows);
    expect(csv).toContain("Слушатель,Email,Курс,Тип риска,Уровень,Статус");
  });

  it("includes all data rows", () => {
    const csv = generateRiskCsv(rows);
    expect(csv).toContain("Alice");
    expect(csv).toContain("Bob");
    expect(csv).toContain("Charlie");
    expect(csv).toContain("critical");
    expect(csv).toContain("high");
    expect(csv).toContain("low");
    expect(csv).toContain("resolved");
  });
});

describe("generateCertificateCsv", () => {
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

  it("has correct columns: number, name, email, course, dates and status", () => {
    const csv = generateCertificateCsv(rows);
    expect(csv).toContain("Номер,Слушатель,Email,Курс,Дата выдачи,Статус,Дата отзыва");
    const lines = csv.split("\n");
    const dataLine = lines.find((l) => l.startsWith("ASA-001"));
    expect(dataLine).toBeDefined();
    expect(dataLine).toContain("Alice");
    expect(dataLine).toContain("alice@test.com");
    expect(dataLine).toContain("AI 101");
    expect(dataLine).toContain("2026-05-01");
  });

  it("includes total count", () => {
    const csv = generateCertificateCsv(rows);
    expect(csv).toContain("Всего сертификатов,2");
    expect(csv).toContain("Действующих,1");
    expect(csv).toContain("Отозвано,1");
    expect(csv).toContain("ASA-002,Bob,bob@test.com,ML 201,2026-05-15,Отозван,2026-05-20");
  });

  it("handles empty rows", () => {
    const csv = generateCertificateCsv([]);
    expect(csv).toContain("Всего сертификатов,0");
  });
});

describe("generateAssignmentCsv", () => {
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

  it("contains assignment status and review columns", () => {
    const csv = generateAssignmentCsv(rows);
    expect(csv).toContain("ОТЧЁТ ПО ЗАДАНИЯМ");
    expect(csv).toContain("Слушатель,Email,Курс,Урок,Задание,Статус,Балл,Отправлено,Проверено,Проверяющий");
    expect(csv).toContain("Strategy memo");
    expect(csv).toContain("SUBMITTED");
  });
});

describe("generateCuratorWorkloadCsv", () => {
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

  it("contains workload decision columns", () => {
    const csv = generateCuratorWorkloadCsv(rows);
    expect(csv).toContain("ОТЧЁТ ПО НАГРУЗКЕ КУРАТОРОВ");
    expect(csv).toContain("Куратор,Email,Потоки,Слушателей,Средний прогресс %,Открытые вопросы,Задания на проверке,Активные риски,Критические риски");
    expect(csv).toContain("Curator A");
  });
});

describe("CSV escaping", () => {
  it("escapes commas in values with double quotes", () => {
    const rows: ProgressRow[] = [
      {
        studentName: "Doe, John",
        email: "john@test.com",
        course: "AI 101",
        cohort: "A",
        progressPercent: 100,
      },
    ];
    const csv = generateProgressCsv(rows);
    const escaped = csv.split("\n").find((l) => l.includes("Doe"));
    expect(escaped).toMatch(/".*"/);
    expect(escaped).toContain('"Doe, John"');
  });

  it("escapes double quotes by doubling them", () => {
    const rows: ProgressRow[] = [
      {
        studentName: 'Smith "Bob"',
        email: 'bob"test@test.com',
        course: 'AI 101',
        cohort: "A",
        progressPercent: 100,
      },
    ];
    const csv = generateProgressCsv(rows);
    const line = csv.split("\n").find((l) => l.includes("Smith"));
    expect(line).toContain('"Smith ""Bob"""');
  });
});
