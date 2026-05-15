import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import type { ProgressRow, RiskRow, CertificateRow } from "./types";
import { groupByCourse } from "./data";

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
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_SIZE_BODY = 8;
const ROW_H = 14;

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
  page.drawText(`AI Strategic Academy  |  ${new Date().toLocaleDateString("ru-RU")}`, {
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
    page.drawText(title, {
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
    const textX = col.align === "right" ? x + col.width - cellPad
      : col.align === "center" ? x + col.width / 2
      : x + cellPad;
    page.drawText(col.header, {
      x: textX, y: y + 2, size: FONT_SIZE_BODY, font: bold,
      color: headerTextColor,
    });
    x += col.width;
  }
  y -= lineH;

  // Table rows
  for (let i = 0; i < rows.length; i++) {
    if (y < 40) {
      const page = addPage(doc);
      pages.push(page);
      y = PAGE_H - 60;
      // Redraw header on new page
      x = MARGIN;
      page.drawRectangle({
        x: MARGIN, y: y - 2, width: CONTENT_W, height: lineH,
        color: headerBg,
      });
      for (const col of columns) {
        const textX = col.align === "right" ? x + col.width - cellPad
          : col.align === "center" ? x + col.width / 2
          : x + cellPad;
        page.drawText(col.header, {
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
      const val = String(rows[i][col.key] ?? "");
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

export async function generateProgressPdf(rows: ProgressRow[]): Promise<Uint8Array> {
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
    page.drawText(`• ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }

  y -= 8;

  // Table columns
  const columns: TableColumn[] = [
    { header: "Слушатель", key: "studentName", width: 85 },
    { header: "Email", key: "email", width: 90 },
    { header: "Поток", key: "cohort", width: 60 },
    { header: "Прогресс", key: "progressPercent", width: 38, align: "center" },
    { header: "Модуль", key: "currentModule", width: 70 },
    { header: "Урок", key: "currentLesson", width: 80 },
    { header: "Риски", key: "riskCount", width: 28, align: "center" },
  ];

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

    y = drawTable(doc, pages, columns, tableRows, font, boldFont, y, course);
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

export async function generateRiskPdf(rows: RiskRow[]): Promise<Uint8Array> {
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
    page.drawText(`• ${item}`, { x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3) });
    y -= 14;
  }

  y -= 8;

  const columns: TableColumn[] = [
    { header: "Слушатель", key: "studentName", width: 90 },
    { header: "Email", key: "email", width: 100 },
    { header: "Курс", key: "course", width: 95 },
    { header: "Тип риска", key: "type", width: 75 },
    { header: "Уровень", key: "severity", width: 48, align: "center" },
    { header: "Статус", key: "status", width: 48, align: "center" },
  ];

  const tableRows = rows.map((r) => ({
    studentName: r.studentName,
    email: r.email,
    course: r.course,
    type: r.type,
    severity: r.severity,
    status: r.status,
  }));

  drawTable(doc, pages, columns, tableRows, font, boldFont, y);

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}

// ── Certificate report (PDF) ─────────────────────────────────────────

export async function generateCertificatePdf(rows: CertificateRow[]): Promise<Uint8Array> {
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
  page.drawText(`• Всего выдано сертификатов: ${rows.length}`, {
    x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3),
  });
  y -= 14;

  // Unique courses
  const uniqueCourses = new Set(rows.map((r) => r.course)).size;
  page.drawText(`• По курсам: ${uniqueCourses}`, {
    x: MARGIN + 4, y, size: FONT_SIZE_BODY, font, color: rgb(0.2, 0.22, 0.3),
  });
  y -= 22;

  const columns: TableColumn[] = [
    { header: "Номер", key: "number", width: 80 },
    { header: "Слушатель", key: "studentName", width: 95 },
    { header: "Email", key: "email", width: 95 },
    { header: "Курс", key: "course", width: 110 },
    { header: "Дата выдачи", key: "issuedAt", width: 56, align: "center" },
  ];

  const tableRows = rows.map((r) => ({
    number: r.number,
    studentName: r.studentName,
    email: r.email,
    course: r.course,
    issuedAt: r.issuedAt,
  }));

  drawTable(doc, pages, columns, tableRows, font, boldFont, y);

  const totalPages = pages.length;
  for (let i = 0; i < totalPages; i++) {
    drawFooter(pages[i], font, i + 1, totalPages);
  }

  return doc.save();
}
