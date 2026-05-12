import ExcelJS from "exceljs";
import type { ProgressRow, RiskRow, CertificateRow } from "./types";
import { groupByCourse } from "./data";

async function buildProgressSheet(wb: ExcelJS.Workbook, rows: ProgressRow[]) {
  const ws = wb.addWorksheet("Прогресс");

  ws.columns = [
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 38 },
    { header: "Поток", key: "cohort", width: 28 },
    { header: "Прогресс %", key: "progressPercent", width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  headerRow.alignment = { horizontal: "center" };

  const grouped = groupByCourse(rows);
  let rowNum = 2;

  for (const [course, courseRows] of grouped) {
    // Course header
    const ch = ws.addRow([`КУРС: ${course}`, "", "", "", ""]);
    ch.getCell(1).font = { bold: true, size: 11, color: { argb: "FF1E3A5F" } };
    ch.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
    ws.mergeCells(`A${rowNum}:E${rowNum}`);
    rowNum++;

    const total = courseRows.length;
    const completed = courseRows.filter((r) => r.progressPercent >= 100).length;
    const avg = total > 0 ? Math.round(courseRows.reduce((s, r) => s + r.progressPercent, 0) / total) : 0;

    const sr = ws.addRow([`Слушателей: ${total} | Завершили: ${completed} | Средний: ${avg}%`, "", "", "", ""]);
    sr.getCell(1).font = { italic: true, size: 10, color: { argb: "FF666666" } };
    ws.mergeCells(`A${rowNum}:E${rowNum}`);
    rowNum++;

    for (const r of courseRows) {
      const dataRow = ws.addRow([r.studentName, r.email, r.course, r.cohort, r.progressPercent]);
      const pct = dataRow.getCell(5);
      pct.numFmt = "0%";
      pct.value = r.progressPercent / 100;
      pct.alignment = { horizontal: "center" };

      if (r.progressPercent >= 100) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
        });
      } else if (r.progressPercent === 0) {
        dataRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
        });
      }
      rowNum++;
    }

    rowNum++; // empty row between courses
  }

  // Summary sheet
  const summaryWs = wb.addWorksheet("Сводка");
  summaryWs.columns = [
    { header: "Показатель", key: "metric", width: 40 },
    { header: "Значение", key: "value", width: 20 },
  ];
  const summaryHeader = summaryWs.getRow(1);
  summaryHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  summaryHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

  summaryWs.addRow(["Всего записей", rows.length]);
  summaryWs.addRow(["Завершили курс", rows.filter((r) => r.progressPercent >= 100).length]);
  const totalRows = rows.length;
  summaryWs.addRow(["Средний прогресс", totalRows > 0 ? `${Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / totalRows)}%` : "0%"]);

  // Bar charts for each course using data bars
  for (const [course, courseRows] of grouped) {
    const chartWs = wb.addWorksheet(`Диаграмма: ${course.slice(0, 25)}`);
    chartWs.columns = [
      { header: "Слушатель", key: "name", width: 25 },
      { header: "Прогресс %", key: "progress", width: 15 },
    ];
    chartWs.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    chartWs.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

    for (const r of courseRows) {
      chartWs.addRow([r.studentName, r.progressPercent]);
    }
  }
}

export async function generateProgressXlsx(rows: ProgressRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();

  await buildProgressSheet(wb, rows);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateRiskXlsx(rows: RiskRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();

  const ws = wb.addWorksheet("Риски");

  ws.columns = [
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 38 },
    { header: "Тип риска", key: "type", width: 20 },
    { header: "Уровень", key: "severity", width: 14 },
    { header: "Статус", key: "status", width: 14 },
  ];

  const hdr = ws.getRow(1);
  hdr.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

  const severityColors: Record<string, string> = {
    critical: "FFFEE2E2",
    high: "FFFEF3C7",
    medium: "FFFEF9C3",
    low: "FFF3F4F6",
  };

  for (const r of rows) {
    const row = ws.addRow([r.studentName, r.email, r.course, r.type, r.severity, r.status]);
    const color = severityColors[r.severity] ?? "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    });
  }

  // Summary sheet
  const summaryWs = wb.addWorksheet("Сводка");
  summaryWs.columns = [{ header: "Показатель", width: 40 }, { header: "Значение", width: 20 }];
  const sh = summaryWs.getRow(1);
  sh.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  sh.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  summaryWs.addRow(["Всего рисков", rows.length]);
  summaryWs.addRow(["Критических", rows.filter((r) => r.severity === "critical").length]);
  summaryWs.addRow(["Высоких", rows.filter((r) => r.severity === "high").length]);
  summaryWs.addRow(["Средних", rows.filter((r) => r.severity === "medium").length]);
  summaryWs.addRow(["Низких", rows.filter((r) => r.severity === "low").length]);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateCertificateXlsx(rows: CertificateRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI Strategic Academy";
  wb.created = new Date();

  const ws = wb.addWorksheet("Сертификаты");

  ws.columns = [
    { header: "Номер", key: "number", width: 20 },
    { header: "Слушатель", key: "studentName", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Курс", key: "course", width: 38 },
    { header: "Дата выдачи", key: "issuedAt", width: 16 },
  ];

  const hdr = ws.getRow(1);
  hdr.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };

  for (const r of rows) {
    ws.addRow([r.number, r.studentName, r.email, r.course, r.issuedAt]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
