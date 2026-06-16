import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, FinalCohortRow, ProductivityScoreRow, ProgressRow, RiskRow, WeeklyCohortRow } from "./types";
import { groupByCourse } from "./data";
import { BRANDING } from "@/lib/branding";

// ── Font loading ────────────────────────────────────────────────────

let regularFontBytes: Uint8Array | null = null;
let boldFontBytes: Uint8Array | null = null;

function loadFontBytes(name: string): Uint8Array | null {
  try {
    const p = path.join(process.cwd(), "public", "assets", "fonts", name);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch { /* ignore */ }
  return null;
}

function getFonts() {
  if (!regularFontBytes) regularFontBytes = loadFontBytes("NotoSans-Regular.ttf");
  if (!boldFontBytes) boldFontBytes = loadFontBytes("NotoSans-Bold.ttf");
  return { regular: regularFontBytes, bold: boldFontBytes };
}

// ── Page helpers ─────────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_SIZE_BODY = 7.5;
const ROW_H = 14;

// ── Text truncation ──────────────────────────────────────────────────

/**
 * Truncate text so that it fits within `maxWidth` at the given font size.
 * Appends an ellipsis character when truncation occurs.
 */
function truncateText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  try {
    if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (font.widthOfTextAtSize(text.slice(0, mid) + "...", fontSize) <= maxWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo === 0 ? "" : text.slice(0, lo) + "...";
  } catch {
    // If widthOfTextAtSize fails (e.g. missing glyphs), do a rough char-based truncation
    const avgCharWidth = fontSize * 0.55;
    const maxChars = Math.floor(maxWidth / avgCharWidth);
    if (text.length <= maxChars) return text;
    return text.slice(0, Math.max(0, maxChars - 3)) + "...";
  }
}

function addPage(doc: PDFDocument): PDFPage {
  return doc.addPage([PAGE_W, PAGE_H]);
}

function drawHeader(page: PDFPage, font: PDFFont, bold: PDFFont, title: string, dateStr: string) {
  page.drawRectangle({
    x: 0, y: PAGE_H - 52, width: PAGE_W, height: 52,
    color: rgb(0.12, 0.23, 0.47),
  });
  page.drawText(title, {
    x: MARGIN, y: PAGE_H - 36, size: 14, font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(dateStr, {
    x: MARGIN, y: PAGE_H - 50, size: 7, font,
    color: rgb(0.8, 0.85, 0.95),
  });
}

function drawFooter(page: PDFPage, font: PDFFont, pageNum: number, totalPages: number) {
  const footerY = 24;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 8 },
    end: { x: PAGE_W - MARGIN, y: footerY + 8 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.85),
  });
  page.drawText(`${BRANDING.name}  |  ${new Date().toLocaleDateString("ru-RU")}`, {
    x: MARGIN, y: footerY - 2, size: 6, font,
    color: rgb(0.6, 0.6, 0.65),
  });
  page.drawText(`Страница ${pageNum} из ${totalPages}`, {
    x: PAGE_W - MARGIN - 60, y: footerY - 2, size: 6, font,
    color: rgb(0.6, 0.6, 0.65),
  });
}

// ── Table drawing ────────────────────────────────────────────────────

interface TableColumn {
  header: string;
  key: string;
  width: number;
  align?: "left" | "center" | "right";
}

function drawTable(
  doc: PDFDocument,
  pages: PDFPage[],
  columns: TableColumn[],
  rows: Record<string, string | number>[],
  font: PDFFont,
  bold: PDFFont,
  startY: number,
  title?: string,
): number {
  let page = pages[pages.length - 1];
  let y = startY;

  const headerBg = rgb(0.12, 0.23, 0.47);
  const altBg1 = rgb(0.97, 0.98, 1);
  const altBg2 = rgb(1, 1, 1);
  const borderColor = rgb(0.85, 0.87, 0.9);
  const textColor = rgb(0.15, 0.18, 0.25);
  const headerTextColor = rgb(1, 1, 1);
  const lineH = ROW_H;
  const cellPad = 4;

  // Section title
  if (title) {
    if (y < 60) {
      page = addPage(doc);
      pages.push(page);
      y = PAGE_H - 80;
    }
    const truncTitle = truncateText(title, bold, 11, CONTENT_W);
    page.drawText(truncTitle, {
      x: MARGIN, y, size: 11, font: bold, color: rgb(0.12, 0.23, 0.47),
    });
    y -= 20;
  }

  // Table header
  if (y < 50) {
    page = addPage(doc);
    pages.push(page);
    y = PAGE_H - 80;
  }

  let x = MARGIN;
  page.drawRectangle({
    x: MARGIN, y: y - 2, width: CONTENT_W, height: lineH,
    color: headerBg,
  });
  for (const col of columns) {
    const maxCellW = col.width - cellPad * 2;
    const truncHeader = truncateText(col.header, bold, FONT_SIZE_BODY, maxCellW);
    const textX = col.align === "right" ? x + col.width - cellPad
      : col.align === "center" ? x + col.width / 2
      : x + cellPad;
    page.drawText(truncHeader, {
      x: textX, y: y + 2, size: FONT_SIZE_BODY, font: bold,
      color: headerTextColor,
    });
    x += col.width;
  }
  y -= lineH;

  // Table rows
  for (let i = 0; i < rows.length; i++) {
    if (y < 40) {
      page = addPage(doc);
      pages.push(page);
      y = PAGE_H - 60;
      // Redraw header on new page
      x = MARGIN;
      page.drawRectangle({
        x: MARGIN, y: y - 2, width: CONTENT_W, height: lineH,
        color: headerBg,
      });
      for (const col of columns) {
        const maxCellW = col.width - cellPad * 2;
        const truncHeader = truncateText(col.header, bold, FONT_SIZE_BODY, maxCellW);
        const textX = col.align === "right" ? x + col.width - cellPad
          : col.align === "center" ? x + col.width / 2
          : x + cellPad;
        page.drawText(truncHeader, {
          x: textX, y: y + 2, size: FONT_SIZE_BODY, font: bold,
          color: headerTextColor,
        });
        x += col.width;
      }
      y -= lineH;
    }

    const bg = i % 2 === 0 ? altBg1 : altBg2;
    x = MARGIN;
    page.drawRectangle({
      x: MARGIN, y: y - 2, width: CONTENT_W, height: lineH,
      color: bg,
    });

    for (const col of columns) {
      const raw = String(rows[i][col.key] ?? "");
      const maxCellW = col.width - cellPad * 2;
      const val = truncateText(raw, font, FONT_SIZE_BODY, maxCellW);
      const textX = col.align === "right" ? x + col.width - cellPad
        : col.align === "center" ? x + col.width / 2
        : x + cellPad;
      page.drawText(val, {
        x: textX, y: y + 2, size: FONT_SIZE_BODY, font,
        color: textColor,
      });
      x += col.width;
    }

    // Row border
    page.drawLine({
      start: { x: MARGIN, y: y - 2 },
      end: { x: PAGE_W - MARGIN, y: y - 2 },
      thickness: 0.3,
      color: borderColor,
    });

    y -= lineH;
  }

  return y;
}

// ── Progress report ──────────────────────────────────────────────────

export async function generateProgressPdf(rows: ProgressRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  const page = pages[0];
  let y = PAGE_H - 80;

  const dateStr = `Сформирован: ${new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric",
  })}`;

  drawHeader(page, font, boldFont, "Отчёт по прогрессу слушателей", dateStr);

  // Summary
  const total = rows.length;
  const completed = rows.filter((r) => r.progressPercent >= 100).length;
  const inProgress = rows.filter((r) => r.progressPercent > 0 && r.progressPercent < 100).length;
  const notStarted = rows.filter((r) => r.progressPercent === 0).length;
  const avg = total > 0 ? Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / total) : 0;

  y -= 12;
  page.drawText("Сводка", { x: MARGIN, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
  y -= 18;

  const summaryItems = [
    `Всего слушателей: ${total}`,
    `Завершили курс: ${completed}`,
    `В процессе: ${inProgress}`,
    `Не начали: ${notStarted}`,
    `Средний прогресс: ${avg}%`,
  ];
  for (const item of summaryItems) {
    page.drawText(`- ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }

  y -= 8;

  // Table columns
  const columns: TableColumn[] = [
    { header: "Слушатель", key: "studentName", width: 95 },
    { header: "Email", key: "email", width: 100 },
    { header: "Поток", key: "cohort", width: 65 },
    { header: "%", key: "progressPercent", width: 30, align: "center" },
    { header: "Модуль", key: "currentModule", width: 75 },
    { header: "Урок", key: "currentLesson", width: 95 },
    { header: "Риски", key: "riskCount", width: 26, align: "center" },
  ];
  const activeCols = fields ? columns.filter((c) => fields.includes(c.key)) : columns;

  const grouped = groupByCourse(rows);
  for (const [course, courseRows] of grouped) {
    const tableRows = courseRows.map((r) => ({
      studentName: r.studentName,
      email: r.email,
      cohort: r.cohort,
      progressPercent: `${r.progressPercent}%`,
      currentModule: r.currentModule ?? "",
      currentLesson: r.currentLesson ?? "",
      riskCount: r.riskCount ?? 0,
    }));

    y = drawTable(doc, pages, activeCols, tableRows, font, boldFont, y, course);
    y -= 12;
  }

  // Footer on each page
  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Risk report ──────────────────────────────────────────────────────

export async function generateRiskPdf(rows: RiskRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  const page = pages[0];
  let y = PAGE_H - 80;

  const dateStr = `Сформирован: ${new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric",
  })}`;

  drawHeader(page, font, boldFont, "Отчёт по рискам слушателей", dateStr);

  // Summary
  const critical = rows.filter((r) => r.severity === "critical").length;
  const high = rows.filter((r) => r.severity === "high").length;
  const medium = rows.filter((r) => r.severity === "medium").length;
  const low = rows.filter((r) => r.severity === "low").length;

  y -= 12;
  page.drawText("Сводка", { x: MARGIN, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
  y -= 18;

  const summaryItems = [
    `Всего рисков: ${rows.length}`,
    `Критических: ${critical}`,
    `Высоких: ${high}`,
    `Средних: ${medium}`,
    `Низких: ${low}`,
  ];
  for (const item of summaryItems) {
    page.drawText(`- ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }

  y -= 8;

  const columns: TableColumn[] = [
    { header: "Слушатель", key: "studentName", width: 100 },
    { header: "Email", key: "email", width: 105 },
    { header: "Курс", key: "course", width: 105 },
    { header: "Тип риска", key: "type", width: 75 },
    { header: "Уровень", key: "severity", width: 45, align: "center" },
    { header: "Статус", key: "status", width: 45, align: "center" },
  ];
  const activeCols = fields ? columns.filter((c) => fields.includes(c.key)) : columns;

  const tableRows = rows.map((r) => ({
    studentName: r.studentName,
    email: r.email,
    course: r.course,
    type: r.type,
    severity: r.severity,
    status: r.status,
  }));

  drawTable(doc, pages, activeCols, tableRows, font, boldFont, y);

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Certificate report (PDF) ─────────────────────────────────────────

export async function generateCertificatePdf(rows: CertificateRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  const page = pages[0];
  let y = PAGE_H - 80;

  const dateStr = `Сформирован: ${new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric",
  })}`;

  drawHeader(page, font, boldFont, "Отчёт по сертификатам", dateStr);

  // Summary
  y -= 12;
  page.drawText("Сводка", { x: MARGIN, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
  y -= 18;
  page.drawText(`- Всего выдано сертификатов: ${rows.length}`, {
    x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3),
  });
  y -= 14;
  const revoked = rows.filter((r) => r.revokedAt).length;
  page.drawText(`- Действующих: ${rows.length - revoked} | Отозвано: ${revoked}`, {
    x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3),
  });
  y -= 14;

  // Unique courses
  const uniqueCourses = new Set(rows.map((r) => r.course)).size;
  page.drawText(`- По курсам: ${uniqueCourses}`, {
    x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3),
  });
  y -= 22;

  const columns: TableColumn[] = [
    { header: "Номер", key: "number", width: 72 },
    { header: "Слушатель", key: "studentName", width: 86 },
    { header: "Email", key: "email", width: 95 },
    { header: "Курс", key: "course", width: 102 },
    { header: "Выдан", key: "issuedAt", width: 48, align: "center" },
    { header: "Статус", key: "status", width: 58, align: "center" },
    { header: "Отозван", key: "revokedAt", width: 50, align: "center" },
  ];
  const activeCols = fields ? columns.filter((c) => fields.includes(c.key)) : columns;

  const tableRows = rows.map((r) => ({
    number: r.number,
    studentName: r.studentName,
    email: r.email,
    course: r.course,
    issuedAt: r.issuedAt,
    status: r.status,
    revokedAt: r.revokedAt ?? "",
  }));

  drawTable(doc, pages, activeCols, tableRows, font, boldFont, y);

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Assignment report (PDF) ──────────────────────────────────────────

export async function generateAssignmentPdf(rows: AssignmentRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  const page = pages[0];
  let y = PAGE_H - 80;

  drawHeader(page, font, boldFont, "Отчёт по заданиям", `Сформирован: ${new Date().toLocaleDateString("ru-RU")}`);

  y -= 12;
  page.drawText("Сводка", { x: MARGIN, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
  y -= 18;
  const summaryItems = [
    `Всего отправок: ${rows.length}`,
    `На проверке: ${rows.filter((r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW").length}`,
    `Принято: ${rows.filter((r) => r.status === "ACCEPTED").length}`,
  ];
  for (const item of summaryItems) {
    page.drawText(`- ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }
  y -= 8;

  const columns: TableColumn[] = [
    { header: "Слушатель", key: "studentName", width: 95 },
    { header: "Курс", key: "course", width: 100 },
    { header: "Задание", key: "assignment", width: 115 },
    { header: "Статус", key: "status", width: 55 },
    { header: "Балл", key: "score", width: 30, align: "center" },
    { header: "Дата", key: "submittedAt", width: 58, align: "center" },
  ];
  const activeCols = fields ? columns.filter((c) => fields.includes(c.key)) : columns;

  drawTable(
    doc,
    pages,
    activeCols,
    rows.map((row) => ({
      studentName: row.studentName,
      course: row.course,
      assignment: row.assignment,
      status: row.status,
      score: row.score ?? "",
      submittedAt: row.submittedAt,
    })),
    font,
    boldFont,
    y,
  );

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Curator workload report (PDF) ────────────────────────────────────

export async function generateCuratorWorkloadPdf(rows: CuratorWorkloadRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  const page = pages[0];
  let y = PAGE_H - 80;

  drawHeader(page, font, boldFont, "Отчёт по нагрузке кураторов", `Сформирован: ${new Date().toLocaleDateString("ru-RU")}`);

  y -= 12;
  page.drawText("Сводка", { x: MARGIN, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
  y -= 18;
  const summaryItems = [
    `Кураторов: ${rows.length}`,
    `Слушателей: ${rows.reduce((sum, row) => sum + row.studentsCount, 0)}`,
    `Открытых вопросов: ${rows.reduce((sum, row) => sum + row.openQuestions, 0)}`,
    `Заданий на проверке: ${rows.reduce((sum, row) => sum + row.pendingAssignments, 0)}`,
  ];
  for (const item of summaryItems) {
    page.drawText(`- ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }
  y -= 8;

  const columns: TableColumn[] = [
    { header: "Куратор", key: "curatorName", width: 100 },
    { header: "Слуш.", key: "studentsCount", width: 35, align: "center" },
    { header: "%", key: "avgProgress", width: 30, align: "center" },
    { header: "Вопр.", key: "openQuestions", width: 38, align: "center" },
    { header: "Зад.", key: "pendingAssignments", width: 38, align: "center" },
    { header: "Риски", key: "activeRisks", width: 38, align: "center" },
    { header: "Крит.", key: "criticalRisks", width: 38, align: "center" },
    { header: "Потоки", key: "cohorts", width: 120 },
  ];
  const activeCols = fields ? columns.filter((c) => fields.includes(c.key)) : columns;

  drawTable(
    doc,
    pages,
    activeCols,
    rows.map((row) => ({
      curatorName: row.curatorName,
      studentsCount: row.studentsCount,
      avgProgress: `${row.avgProgress}%`,
      openQuestions: row.openQuestions,
      pendingAssignments: row.pendingAssignments,
      activeRisks: row.activeRisks,
      criticalRisks: row.criticalRisks,
      cohorts: row.cohorts,
    })),
    font,
    boldFont,
    y,
  );

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Final Cohort Report ──────────────────────────────────────────────

export async function generateFinalCohortPdf(rows: FinalCohortRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  let page = pages[0];
  let y = PAGE_H - 80;

  const dateStr = `Сформирован: ${new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric",
  })}`;

  drawHeader(page, font, boldFont, "Итоговый отчёт по потоку", dateStr);

  for (const cohort of rows) {
    // Cohort header
    y -= 12;
    page.drawText(cohort.cohortName, { x: MARGIN, y, size: 13, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
    y -= 16;
    page.drawText(`${cohort.course}  |  ${cohort.periodStart} – ${cohort.periodEnd}`, {
      x: MARGIN, y, size: 8, font, color: rgb(0.4, 0.42, 0.5),
    });
    y -= 20;

    // Summary metrics
    const summaryItems = [
      `Всего зачислено: ${cohort.totalEnrolled}`,
      `Завершили курс: ${cohort.completedCount} (${cohort.completedPercent}%)`,
      `Сдали финальную работу: ${cohort.finalProjectSubmitted} (${cohort.finalProjectPercent}%)`,
      `Получили сертификат: ${cohort.certificatesIssued} (${cohort.certificatesPercent}%)`,
      `AI Productivity Score (avg): ${cohort.avgProductivityScore} / 100`,
      `Средняя оценка тестов: ${cohort.avgTestScore}%`,
      `Средняя оценка заданий: ${cohort.avgAssignmentScore} / 100`,
      `Финальная работа (avg): ${cohort.avgFinalProjectScore} / 100`,
      `Satisfaction: ${cohort.satisfactionScore > 0 ? `${cohort.satisfactionScore} / 5` : "—"}`,
      `NPS: ${cohort.nps !== 0 ? `+${cohort.nps}` : "—"}`,
    ];

    for (const item of summaryItems) {
      if (y < 50) {
        page = addPage(doc);
        pages.push(page);
        y = PAGE_H - 80;
      }
      page.drawText(`• ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
      y -= 14;
    }
    y -= 8;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Weekly Cohort Report ──────────────────────────────────────────────

export async function generateWeeklyCohortPdf(rows: WeeklyCohortRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  let page = pages[0];
  let y = PAGE_H - 80;

  const dateStr = `Сформирован: ${new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric",
  })}`;

  drawHeader(page, font, boldFont, "Еженедельный отчёт по потоку", dateStr);

  for (const cohort of rows) {
    // Cohort header
    y -= 12;
    page.drawText(cohort.cohortName, { x: MARGIN, y, size: 13, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
    y -= 16;
    page.drawText(`${cohort.course}  |  ${cohort.periodStart} – ${cohort.periodEnd}`, {
      x: MARGIN, y, size: 8, font, color: rgb(0.4, 0.42, 0.5),
    });
    y -= 20;

    // Summary key-value pairs
    const summaryItems = [
      `Всего слушателей: ${cohort.totalStudents}`,
      `Активных: ${cohort.activeStudents} (${cohort.activePercent}%)`,
      `Прохождение модуля: ${cohort.moduleProgressPercent}%`,
      `Завершили неделю: ${cohort.completedWeekCount} (${cohort.completedWeekPercent}%)`,
      `Отстающих: ${cohort.behindCount} (${cohort.behindPercent}%)`,
      `Критических рисков: ${cohort.criticalRisks}`,
      `Всего вопросов: ${cohort.totalQuestions}`,
      `Среднее время ответа: ${cohort.avgResponseTimeHours} ч`,
      `Сданных заданий: ${cohort.submittedAssignments}`,
      `Средняя оценка: ${cohort.avgAssignmentScore}/100`,
    ];

    for (const item of summaryItems) {
      if (y < 50) {
        page = addPage(doc);
        pages.push(page);
        y = PAGE_H - 80;
      }
      page.drawText(`• ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
      y -= 14;
    }
    y -= 8;
  }

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Productivity Score report ──────────────────────────────────────────

export async function generateProductivityScorePdf(rows: ProductivityScoreRow[], fields?: string[]): Promise<Uint8Array> {
  const { regular, bold } = getFonts();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const font = regular
    ? await doc.embedFont(regular, { subset: true })
    : await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = bold
    ? await doc.embedFont(bold, { subset: true })
    : await doc.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [addPage(doc)];
  const page = pages[0];
  let y = PAGE_H - 80;

  drawHeader(page, font, boldFont, "Отчёт по Productivity Score", new Date().toLocaleDateString("ru-RU"));
  y -= 12;

  const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.totalScore, 0) / rows.length) : 0;
  page.drawText("Сводка", { x: MARGIN, y, size: 12, font: boldFont, color: rgb(0.12, 0.23, 0.47) });
  y -= 18;
  const summaryItems = [
    `Слушателей: ${rows.length}`,
    `Средний балл: ${avg}`,
    `Курсов: ${new Set(rows.map((r) => r.course)).size}`,
  ];
  for (const item of summaryItems) {
    page.drawText(`- ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }
  y -= 8;

  const columns: TableColumn[] = [
    { header: "Слушатель", key: "studentName", width: 96 },
    { header: "Балл", key: "totalScore", width: 30, align: "center" },
    { header: "Уровень", key: "level", width: 56, align: "center" },
    { header: "Тесты", key: "testsScore", width: 38, align: "center" },
    { header: "Задания", key: "assignmentsScore", width: 44, align: "center" },
    { header: "Фин.раб", key: "finalProjectScore", width: 40, align: "center" },
    { header: "Активн.", key: "activityScore", width: 42, align: "center" },
  ];
  const activeCols = fields ? columns.filter((c) => fields.includes(c.key)) : columns;

  drawTable(
    doc,
    pages,
    activeCols,
    rows.map((row) => ({
      studentName: row.studentName,
      totalScore: String(row.totalScore),
      level: row.level,
      testsScore: String(row.testsScore),
      assignmentsScore: String(row.assignmentsScore),
      finalProjectScore: String(row.finalProjectScore),
      activityScore: String(row.activityScore),
    })),
    font,
    boldFont,
    y,
  );

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}
