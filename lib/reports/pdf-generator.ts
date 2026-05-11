import type { ProgressRow, RiskRow } from "./types";
import { groupByCourse } from "./data";

async function getPdfMake() {
  const pdfMake = await import("pdfmake/build/pdfmake");
  const pdfFonts = await import("pdfmake/build/vfs_fonts");
  const fonts = (pdfFonts.default as unknown as { pdfMake?: { vfs: Record<string, string> } })?.pdfMake?.vfs ?? (pdfFonts.default as unknown as Record<string, string>);
  (pdfMake.default as unknown as { vfs: Record<string, string> }).vfs = fonts;
  return pdfMake.default;
}

type Margin = [number, number, number, number];

const STYLES = {
  header: { fontSize: 18, bold: true, color: "#1E3A5F", margin: [0, 0, 0, 8] as Margin },
  subheader: { fontSize: 13, bold: true, color: "#1E3A5F", margin: [0, 12, 0, 4] as Margin },
  summaryLabel: { fontSize: 10, color: "#666666", margin: [0, 2, 0, 2] as Margin },
  summaryValue: { fontSize: 11, bold: true, margin: [0, 2, 0, 2] as Margin },
  tableHeader: { fontSize: 9, bold: true, color: "#FFFFFF", fillColor: "#1E3A5F", alignment: "center" as const },
  tableCell: { fontSize: 8, margin: [2, 2, 2, 2] as Margin },
  dateLabel: { fontSize: 8, color: "#999999", margin: [0, 0, 0, 12] as Margin },
};

interface BarItem {
  label: string;
  value: number;
}

function buildBarChart(data: BarItem[], maxBars: number = 15) {
  const sliced = data.slice(0, maxBars);
  const maxVal = Math.max(...sliced.map((d) => d.value), 1);
  const labelWidth = 140;
  const barMaxWidth = 460 - labelWidth - 40;

  const rects: Record<string, unknown>[] = [];
  let y = 0;

  for (const item of sliced) {
    const barW = Math.max(2, (item.value / maxVal) * barMaxWidth);
    const pctColor = item.value >= 100 ? "#22C55E" : item.value >= 50 ? "#EAB308" : "#EF4444";

    rects.push(
      { type: "rect", x: labelWidth, y, w: barW, h: 12, color: pctColor, r: 2 },
      { type: "line", x1: labelWidth, y1: y + 14, x2: labelWidth + barMaxWidth, y2: y + 14, lineWidth: 0.5, lineColor: "#E5E7EB" },
    );
    y += 16;
  }

  return rects;
}

function summaryCard(text: string, value: string | number, bg: string, color: string) {
  return {
    text: `${text}\n${value}`,
    alignment: "center" as const,
    margin: [8, 8, 8, 8] as Margin,
    fillColor: bg,
    fontSize: 14,
    bold: true,
    color,
  };
}

export async function generateProgressPdf(rows: ProgressRow[]): Promise<Buffer> {
  const pdfMake = await getPdfMake();
  const grouped = groupByCourse(rows);
  const total = rows.length;
  const completed = rows.filter((r) => r.progressPercent >= 100).length;
  const avg = total > 0 ? Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / total) : 0;
  const active = total - completed;
  const dateStr = new Date().toLocaleDateString("ru-RU");

  const content: Record<string, unknown>[] = [
    { text: "Отчёт по прогрессу слушателей", style: "header" },
    { text: `Сформирован: ${dateStr}`, style: "dateLabel" },
    {
      layout: "noBorders",
      table: {
        widths: ["auto", "auto", "auto", "auto"],
        body: [[
          summaryCard("Всего", total, "#E8F0FE", "#1E3A5F"),
          summaryCard("Завершили", completed, "#DCFCE7", "#16A34A"),
          summaryCard("Средний", `${avg}%`, "#FEF3C7", "#D97706"),
          summaryCard("Активных", active, "#FEE2E2", "#DC2626"),
        ]],
      },
    },
  ];

  for (const [course, courseRows] of grouped) {
    const courseCompleted = courseRows.filter((r) => r.progressPercent >= 100).length;
    const courseAvg = Math.round(courseRows.reduce((s, r) => s + r.progressPercent, 0) / courseRows.length);

    content.push(
      { text: course, style: "subheader" },
      { text: `Слушателей: ${courseRows.length} · Завершили: ${courseCompleted} · Средний: ${courseAvg}%`, style: "summaryLabel" },
    );

    const chartData = courseRows.map((r) => ({ label: r.studentName, value: r.progressPercent }));
    const bars = buildBarChart(chartData);

    if (bars.length > 0) {
      content.push({ canvas: bars, margin: [0, 4, 0, 8] });
    }

    const tableBody: Record<string, unknown>[][] = [
      [
        { text: "Слушатель", style: "tableHeader" },
        { text: "Email", style: "tableHeader" },
        { text: "Поток", style: "tableHeader" },
        { text: "Прогресс", style: "tableHeader" },
      ],
    ];

    for (const r of courseRows) {
      const pctColor = r.progressPercent >= 100 ? "#22C55E" : r.progressPercent === 0 ? "#EF4444" : "#EAB308";
      tableBody.push([
        { text: r.studentName, style: "tableCell" },
        { text: r.email, style: "tableCell" },
        { text: r.cohort, style: "tableCell" },
        { text: `${r.progressPercent}%`, style: "tableCell", color: pctColor, bold: true, alignment: "center" },
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ["auto", "auto", "auto", "auto"],
        body: tableBody,
      },
      layout: {
        fillColor: (rowIndex: number) => rowIndex === 0 ? "#1E3A5F" : rowIndex % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#E5E7EB",
        vLineColor: () => "#E5E7EB",
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
    });

    content.push({ text: "", margin: [0, 8, 0, 0] });
  }

  const dd = {
    content,
    styles: STYLES,
    defaultStyle: { font: "Roboto", fontSize: 9 },
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40] as Margin,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Страница ${currentPage} из ${pageCount} · AI Strategic Academy`,
      alignment: "center" as const,
      fontSize: 7,
      color: "#999999",
      margin: [0, 10, 0, 0] as Margin,
    }),
  };

  return new Promise((resolve) => {
    const pdfDoc = pdfMake.createPdf(dd);
    pdfDoc.getBuffer((buffer: Buffer) => { resolve(buffer); });
  });
}

export async function generateRiskPdf(rows: RiskRow[]): Promise<Buffer> {
  const pdfMake = await getPdfMake();
  const dateStr = new Date().toLocaleDateString("ru-RU");

  const critical = rows.filter((r) => r.severity === "critical").length;
  const high = rows.filter((r) => r.severity === "high").length;

  const content: Record<string, unknown>[] = [
    { text: "Отчёт по рискам слушателей", style: "header" },
    { text: `Сформирован: ${dateStr}`, style: "dateLabel" },
    {
      layout: "noBorders",
      table: {
        widths: ["auto", "auto", "auto"],
        body: [[
          summaryCard("Всего", rows.length, "#E8F0FE", "#1E3A5F"),
          summaryCard("Критических", critical, "#FEE2E2", "#DC2626"),
          summaryCard("Высоких", high, "#FEF3C7", "#D97706"),
        ]],
      },
    },
  ];

  const severityColors: Record<string, string> = {
    critical: "#FEE2E2",
    high: "#FEF3C7",
    medium: "#FEF9C3",
    low: "#F3F4F6",
  };

  const tableBody: Record<string, unknown>[][] = [
    [
      { text: "Слушатель", style: "tableHeader" },
      { text: "Email", style: "tableHeader" },
      { text: "Курс", style: "tableHeader" },
      { text: "Тип риска", style: "tableHeader" },
      { text: "Уровень", style: "tableHeader" },
      { text: "Статус", style: "tableHeader" },
    ],
  ];

  for (const r of rows) {
    tableBody.push([
      { text: r.studentName, style: "tableCell" },
      { text: r.email, style: "tableCell" },
      { text: r.course, style: "tableCell" },
      { text: r.type, style: "tableCell" },
      { text: r.severity, style: "tableCell", fillColor: severityColors[r.severity] ?? undefined, bold: r.severity === "critical" },
      { text: r.status, style: "tableCell" },
    ]);
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ["auto", "auto", "auto", "auto", "auto", "auto"],
      body: tableBody,
    },
    layout: {
      fillColor: (rowIndex: number) => rowIndex === 0 ? "#1E3A5F" : rowIndex % 2 === 0 ? "#F9FAFB" : "#FFFFFF",
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#E5E7EB",
      vLineColor: () => "#E5E7EB",
    },
    margin: [0, 12, 0, 0],
  });

  const dd = {
    content,
    styles: STYLES,
    defaultStyle: { font: "Roboto", fontSize: 9 },
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40] as Margin,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Страница ${currentPage} из ${pageCount} · AI Strategic Academy`,
      alignment: "center" as const,
      fontSize: 7,
      color: "#999999",
    }),
  };

  return new Promise((resolve) => {
    const pdfDoc = pdfMake.createPdf(dd);
    pdfDoc.getBuffer((buffer: Buffer) => { resolve(buffer); });
  });
}
