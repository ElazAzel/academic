import ExcelJS from "exceljs";
import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, ProgressRow, RiskRow } from "./types";
import { groupByCourse } from "./data";

// ── Shared helpers ───────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" },
};
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Calibri" };
const BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin", color: { argb: "FFD0D5DD" } },
};
const BORDER_ALL: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD0D5DD" } },
  bottom: { style: "thin", color: { argb: "FFD0D5DD" } },
  left: { style: "thin", color: { argb: "FFD0D5DD" } },
  right: { style: "thin", color: { argb: "FFD0D5DD" } },
};

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { horizontal: "center", vertical: "middle" };
  row.height = 22;
  row.eachCell((cell) => { cell.border = BORDER_ALL; });
}

function styleDataCell(cell: ExcelJS.Cell) {
  cell.border = BORDER;
  cell.alignment = { vertical: "middle", wrapText: false };
}

function applyAutoFilter(ws: ExcelJS.Worksheet, colCount: number) {
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colCount },
  };
}

function freezeHeader(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

// ── Colors for severity ──────────────────────────────────────────────

const SEVERITY_FILLS: Record<string, ExcelJS.Fill> = {
  critical: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } },
  high: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } },
  medium: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } },
  low: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } },
};

// ── Progress report ──────────────────────────────────────────────────

export async function generateProgressXlsx(rows: ProgressRow[], fields?: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Прогресс");

  ws.columns = [
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 38 },
    { header: "Поток", key: "cohort", width: 22 },
    { header: "Прогресс %", key: "progressPercent", width: 14 },
    { header: "Модуль", key: "currentModule", width: 24 },
    { header: "Блок", key: "currentBlock", width: 22 },
    { header: "Урок", key: "currentLesson", width: 24 },
    { header: "Последний вход", key: "lastLoginAt", width: 16 },
    { header: "Ср. мин/урок", key: "avgLessonMinutes", width: 14 },
    { header: "Риски", key: "riskCount", width: 10 },
  ];

  const filteredCols = fields ? ws.columns.filter(c => fields!.includes(c.key!)) : ws.columns;
  ws.columns = filteredCols;

  styleHeader(ws);
  applyAutoFilter(ws, ws.columns.length);
  freezeHeader(ws);

  const colKeys = ws.columns.map(c => c.key).filter((k): k is string => k != null);
  const progressIdx = colKeys.indexOf("progressPercent") + 1;

  for (const r of rows) {
    const lastLogin = r.lastLoginAt
      ? new Date(r.lastLoginAt).toLocaleDateString("ru-RU")
      : "";
    const values: Record<string, unknown> = {
      studentName: r.studentName,
      email: r.email,
      course: r.course,
      cohort: r.cohort,
      progressPercent: r.progressPercent / 100,
      currentModule: r.currentModule ?? "",
      currentBlock: r.currentBlock ?? "",
      currentLesson: r.currentLesson ?? "",
      lastLoginAt: lastLogin,
      avgLessonMinutes: r.avgLessonMinutes ?? 0,
      riskCount: r.riskCount ?? 0,
    };
    const row = ws.addRow(colKeys.map(key => values[key]));

    if (progressIdx > 0) {
      const pctCell = row.getCell(progressIdx);
      pctCell.numFmt = "0%";
      pctCell.alignment = { horizontal: "center" };
      styleDataCell(pctCell);
    }

    let rowFill: ExcelJS.Fill | undefined;
    if (r.progressPercent >= 100) {
      rowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
    } else if (r.progressPercent === 0) {
      rowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    }

    row.eachCell((cell, colNum) => {
      if (colNum !== progressIdx) {
        if (rowFill) cell.fill = rowFill;
        styleDataCell(cell);
      }
      cell.border = BORDER;
    });
  }

  // ── Summary sheet ──────────────────────────────────────────────────
  const ss = wb.addWorksheet("Сводка");
  ss.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];
  styleHeader(ss);

  const total = rows.length;
  const completed = rows.filter((r) => r.progressPercent >= 100).length;
  const inProgress = rows.filter((r) => r.progressPercent > 0 && r.progressPercent < 100).length;
  const notStarted = rows.filter((r) => r.progressPercent === 0).length;
  const avg = total > 0 ? Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / total) : 0;

  const summaryData = [
    ["Всего записей", total],
    ["Завершили курс", completed],
    ["В процессе", inProgress],
    ["Не начали", notStarted],
    ["Средний прогресс", `${avg}%`],
    ["Количество курсов", new Set(rows.map((r) => r.course)).size],
    ["Количество потоков", new Set(rows.map((r) => r.cohort)).size],
    ["Всего рисков", rows.reduce((s, r) => s + (r.riskCount ?? 0), 0)],
  ];

  for (const [metric, value] of summaryData) {
    const row = ss.addRow([metric, value]);
    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = BORDER;
      cell.alignment = { vertical: "middle" };
    });
  }

  // ── Per-course sheets ──────────────────────────────────────────────
  const grouped = groupByCourse(rows);
  for (const [course, courseRows] of grouped) {
    const sheetName = course.replace(/[\[\]\:*?\/]/g, "").slice(0, 31);
    const cws = wb.addWorksheet(sheetName);
    cws.columns = [
      { header: "Слушатель", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Прогресс %", key: "progress", width: 14 },
      { header: "Риски", key: "risks", width: 10 },
    ];
    styleHeader(cws);

    for (const r of courseRows) {
      cws.addRow([r.studentName, r.email, r.progressPercent, r.riskCount ?? 0]);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ── Risk report ──────────────────────────────────────────────────────

export async function generateRiskXlsx(rows: RiskRow[], fields?: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Риски");

  ws.columns = [
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 38 },
    { header: "Тип риска", key: "type", width: 22 },
    { header: "Уровень", key: "severity", width: 14 },
    { header: "Статус", key: "status", width: 14 },
  ];

  const filteredCols = fields ? ws.columns.filter(c => fields!.includes(c.key!)) : ws.columns;
  ws.columns = filteredCols;

  styleHeader(ws);
  applyAutoFilter(ws, ws.columns.length);
  freezeHeader(ws);

  const colKeys = ws.columns.map(c => c.key).filter((k): k is string => k != null);

  for (const r of rows) {
    const values: Record<string, unknown> = {
      studentName: r.studentName,
      email: r.email,
      course: r.course,
      type: r.type,
      severity: r.severity,
      status: r.status,
    };
    const row = ws.addRow(colKeys.map(key => values[key]));
    const fill = SEVERITY_FILLS[r.severity];
    row.eachCell((cell) => {
      if (fill) cell.fill = fill;
      cell.border = BORDER;
      cell.alignment = { vertical: "middle" };
      cell.font = { name: "Calibri", size: 11 };
    });
  }

  // Summary sheet
  const ss = wb.addWorksheet("Сводка");
  ss.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];
  styleHeader(ss);

  const bySeverity = (sev: string) => rows.filter((r) => r.severity === sev);
  const summaryData = [
    ["Всего рисков", rows.length],
    ["Критических", bySeverity("critical").length],
    ["Высоких", bySeverity("high").length],
    ["Средних", bySeverity("medium").length],
    ["Низких", bySeverity("low").length],
    ["Открытых", rows.filter((r) => r.status === "open").length],
    ["Закрытых", rows.filter((r) => r.status !== "open").length],
  ];

  for (const [metric, value] of summaryData) {
    const row = ss.addRow([metric, value]);
    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = BORDER;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ── Certificate report ───────────────────────────────────────────────

export async function generateCertificateXlsx(rows: CertificateRow[], fields?: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Сертификаты");

  ws.columns = [
    { header: "Номер", key: "number", width: 22 },
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 38 },
    { header: "Дата выдачи", key: "issuedAt", width: 16 },
    { header: "Статус", key: "status", width: 16 },
    { header: "Дата отзыва", key: "revokedAt", width: 16 },
  ];

  const filteredCols = fields ? ws.columns.filter(c => fields!.includes(c.key!)) : ws.columns;
  ws.columns = filteredCols;

  styleHeader(ws);
  applyAutoFilter(ws, ws.columns.length);
  freezeHeader(ws);

  const colKeys = ws.columns.map(c => c.key).filter((k): k is string => k != null);

  for (const r of rows) {
    const values: Record<string, unknown> = {
      number: r.number,
      studentName: r.studentName,
      email: r.email,
      course: r.course,
      issuedAt: r.issuedAt,
      status: r.status,
      revokedAt: r.revokedAt ?? "",
    };
    const row = ws.addRow(colKeys.map(key => values[key]));
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle" };
      cell.font = { name: "Calibri", size: 11 };
    });
  }

  // Summary sheet
  const ss = wb.addWorksheet("Сводка");
  ss.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];
  styleHeader(ss);

  const uniqueCourses = new Set(rows.map((r) => r.course)).size;
  const revoked = rows.filter((r) => r.revokedAt).length;
  const summaryData = [
    ["Всего сертификатов", rows.length],
    ["Действующих", rows.length - revoked],
    ["Отозвано", revoked],
    ["По курсам", uniqueCourses],
  ];

  for (const [metric, value] of summaryData) {
    const row = ss.addRow([metric, value]);
    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = BORDER;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ── Assignment report ────────────────────────────────────────────────

export async function generateAssignmentXlsx(rows: AssignmentRow[], fields?: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Задания");
  ws.columns = [
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 34 },
    { header: "Урок", key: "lesson", width: 28 },
    { header: "Задание", key: "assignment", width: 34 },
    { header: "Статус", key: "status", width: 18 },
    { header: "Балл", key: "score", width: 10 },
    { header: "Отправлено", key: "submittedAt", width: 16 },
    { header: "Проверено", key: "reviewedAt", width: 16 },
    { header: "Проверяющий", key: "reviewerName", width: 24 },
  ];

  const filteredCols = fields ? ws.columns.filter(c => fields!.includes(c.key!)) : ws.columns;
  ws.columns = filteredCols;

  styleHeader(ws);
  applyAutoFilter(ws, ws.columns.length);
  freezeHeader(ws);

  const colKeys = ws.columns.map(c => c.key).filter((k): k is string => k != null);

  for (const r of rows) {
    const values: Record<string, unknown> = {
      studentName: r.studentName,
      email: r.email,
      course: r.course,
      lesson: r.lesson ?? "",
      assignment: r.assignment,
      status: r.status,
      score: r.score ?? "",
      submittedAt: r.submittedAt,
      reviewedAt: r.reviewedAt ?? "",
      reviewerName: r.reviewerName ?? "",
    };
    const row = ws.addRow(colKeys.map(key => values[key]));
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle" };
      cell.font = { name: "Calibri", size: 11 };
    });
  }

  const ss = wb.addWorksheet("Сводка");
  ss.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];
  styleHeader(ss);
  const summaryData = [
    ["Всего отправок", rows.length],
    ["На проверке", rows.filter((r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW").length],
    ["Принято", rows.filter((r) => r.status === "ACCEPTED").length],
    ["Нужна доработка", rows.filter((r) => r.status === "NEEDS_REVISION" || r.status === "REJECTED").length],
  ];
  for (const [metric, value] of summaryData) {
    const row = ss.addRow([metric, value]);
    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = BORDER;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ── Curator workload report ──────────────────────────────────────────

export async function generateCuratorWorkloadXlsx(rows: CuratorWorkloadRow[], fields?: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Нагрузка кураторов");
  ws.columns = [
    { header: "Куратор", key: "curatorName", width: 28 },
    { header: "Email", key: "curatorEmail", width: 32 },
    { header: "Потоки", key: "cohorts", width: 34 },
    { header: "Слушателей", key: "studentsCount", width: 14 },
    { header: "Средний прогресс %", key: "avgProgress", width: 20 },
    { header: "Открытые вопросы", key: "openQuestions", width: 18 },
    { header: "Задания на проверке", key: "pendingAssignments", width: 22 },
    { header: "Активные риски", key: "activeRisks", width: 16 },
    { header: "Критические риски", key: "criticalRisks", width: 18 },
  ];

  const filteredCols = fields ? ws.columns.filter(c => fields!.includes(c.key!)) : ws.columns;
  ws.columns = filteredCols;

  styleHeader(ws);
  applyAutoFilter(ws, ws.columns.length);
  freezeHeader(ws);

  const colKeys = ws.columns.map(c => c.key).filter((k): k is string => k != null);

  for (const r of rows) {
    const values: Record<string, unknown> = {
      curatorName: r.curatorName,
      curatorEmail: r.curatorEmail,
      cohorts: r.cohorts,
      studentsCount: r.studentsCount,
      avgProgress: r.avgProgress,
      openQuestions: r.openQuestions,
      pendingAssignments: r.pendingAssignments,
      activeRisks: r.activeRisks,
      criticalRisks: r.criticalRisks,
    };
    const row = ws.addRow(colKeys.map(key => values[key]));
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle" };
      cell.font = { name: "Calibri", size: 11 };
    });
  }

  const ss = wb.addWorksheet("Сводка");
  ss.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];
  styleHeader(ss);
  const summaryData = [
    ["Кураторов", rows.length],
    ["Слушателей", rows.reduce((sum, row) => sum + row.studentsCount, 0)],
    ["Открытых вопросов", rows.reduce((sum, row) => sum + row.openQuestions, 0)],
    ["Заданий на проверке", rows.reduce((sum, row) => sum + row.pendingAssignments, 0)],
    ["Активных рисков", rows.reduce((sum, row) => sum + row.activeRisks, 0)],
  ];
  for (const [metric, value] of summaryData) {
    const row = ss.addRow([metric, value]);
    row.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11 };
      cell.border = BORDER;
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
