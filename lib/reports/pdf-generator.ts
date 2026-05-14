import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { ProgressRow, RiskRow } from "./types";
import { groupByCourse } from "./data";

function drawTable(
  page: PDFPage,
  headers: string[],
  rows: (string | number)[][],
  startY: number,
  font: PDFFont,
  bold: PDFFont,
  colWidths: number[],
  pageWidth: number,
) {
  const cellPadding = 4;
  const rowHeight = 16;
  let y = startY;

  // Header
  let x = 40;
  page.drawRectangle({ x: 38, y: y - 2, width: pageWidth - 76, height: rowHeight, color: rgb(0.12, 0.23, 0.47) });
  headers.forEach((h, i) => {
    page.drawText(h, { x: x + cellPadding, y: y + 2, size: 8, font: bold, color: rgb(1, 1, 1) });
    x += colWidths[i];
  });
  y -= rowHeight;

  // Data rows
  for (const row of rows) {
    if (y < 40) break; // page overflow
    x = 40;
    row.forEach((cell, i) => {
      page.drawText(String(cell ?? ""), { x: x + cellPadding, y: y + 2, size: 7, font });
      x += colWidths[i];
    });
    y -= rowHeight;
  }
  return y;
}

export async function generateProgressPdf(rows: ProgressRow[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595, 842]);
  const pw = 595;
  let y = 800;

  // Title
  page.drawText("Отчёт по прогрессу слушателей", { x: 40, y, size: 18, font: bold, color: rgb(0.12, 0.23, 0.47) });
  y -= 30;

  // Summary
  const total = rows.length;
  const completed = rows.filter((r) => r.progressPercent >= 100).length;
  const avg = total > 0 ? Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / total) : 0;

  page.drawText(`Всего: ${total}  |  Завершили: ${completed}  |  Средний: ${avg}%`, { x: 40, y, size: 11, font });
  y -= 25;

  // Table
  const colWidths = [90, 100, 80, 50, 60, 60, 60];
  const headers = ["Слушатель", "Email", "Курс", "Прогресс", "Модуль", "Блок", "Урок"];

  const grouped = groupByCourse(rows);
  for (const [course, courseRows] of grouped) {
    if (y < 60) break;
    page.drawText(course, { x: 40, y, size: 12, font: bold, color: rgb(0.12, 0.23, 0.47) });
    y -= 18;

    const tableRows = courseRows.map((r) => [
      r.studentName,
      r.email,
      r.course,
      `${r.progressPercent}%`,
      r.currentModule ?? "",
      r.currentBlock ?? "",
      r.currentLesson ?? "",
    ]);

    y = drawTable(page, headers, tableRows, y, font, bold, colWidths, pw);
    y -= 10;
  }

  return doc.save();
}

export async function generateRiskPdf(rows: RiskRow[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595, 842]);
  const pw = 595;
  let y = 800;

  page.drawText("Отчёт по рискам слушателей", { x: 40, y, size: 18, font: bold, color: rgb(0.12, 0.23, 0.47) });
  y -= 30;

  const critical = rows.filter((r) => r.severity === "critical").length;
  const high = rows.filter((r) => r.severity === "high").length;
  page.drawText(`Всего: ${rows.length}  |  Критических: ${critical}  |  Высоких: ${high}`, { x: 40, y, size: 11, font });
  y -= 25;

  const colWidths = [90, 110, 90, 80, 60, 50];
  const headers = ["Слушатель", "Email", "Курс", "Тип риска", "Уровень", "Статус"];
  const tableRows = rows.map((r) => [r.studentName, r.email, r.course, r.type, r.severity, r.status]);

  y = drawTable(page, headers, tableRows, y, font, bold, colWidths, pw);

  return doc.save();
}
