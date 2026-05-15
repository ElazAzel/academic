import type { ProgressRow, RiskRow, CertificateRow } from "./types";
import { groupByCourse } from "./data";

function esc(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function headerBlock(title: string): string[] {
  return [
    "\uFEFF" + title,
    `Сформирован: ${new Date().toLocaleDateString("ru-RU", {
      year: "numeric", month: "long", day: "numeric",
    })}`,
    `Время: ${new Date().toLocaleTimeString("ru-RU")}`,
    "",
  ];
}

function separator(): string {
  return "━".repeat(70);
}

// ── Progress report ──────────────────────────────────────────────────

export function generateProgressCsv(rows: ProgressRow[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО ПРОГРЕССУ СЛУШАТЕЛЕЙ"));

  // Summary
  const total = rows.length;
  const completed = rows.filter((r) => r.progressPercent >= 100).length;
  const inProgress = rows.filter((r) => r.progressPercent > 0 && r.progressPercent < 100).length;
  const notStarted = rows.filter((r) => r.progressPercent === 0).length;
  const avg = total > 0 ? Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / total) : 0;

  lines.push("=== СВОДКА ===");
  lines.push(`Всего слушателей,${total}`);
  lines.push(`Завершили курс,${completed}`);
  lines.push(`В процессе,${inProgress}`);
  lines.push(`Не начали,${notStarted}`);
  lines.push(`Средний прогресс,${avg}%`);
  lines.push(`Всего курсов,${new Set(rows.map((r) => r.course)).size}`);
  lines.push(`Всего потоков,${new Set(rows.map((r) => r.cohort)).size}`);
  lines.push(`Всего рисков,${rows.reduce((s, r) => s + (r.riskCount ?? 0), 0)}`);
  lines.push("");

  const grouped = groupByCourse(rows);

  for (const [course, courseRows] of grouped) {
    const cTotal = courseRows.length;
    const cCompleted = courseRows.filter((r) => r.progressPercent >= 100).length;
    const cAvg = cTotal > 0 ? Math.round(courseRows.reduce((s, r) => s + r.progressPercent, 0) / cTotal) : 0;

    lines.push(separator());
    lines.push(`КУРС: ${course}`);
    lines.push(`Слушателей: ${cTotal} | Завершили: ${cCompleted} | Средний: ${cAvg}%`);

    // Cohort summary
    const cohortSummary = new Map<string, { total: number; completed: number }>();
    for (const r of courseRows) {
      const c = cohortSummary.get(r.cohort) ?? { total: 0, completed: 0 };
      c.total++;
      if (r.progressPercent >= 100) c.completed++;
      cohortSummary.set(r.cohort, c);
    }
    lines.push("Потоки:");
    for (const [cohort, c] of cohortSummary) {
      const pct = Math.round((c.completed / c.total) * 100);
      lines.push(`  • ${cohort}: ${c.total} слуш. | Завершили: ${c.completed} (${pct}%)`);
    }
    lines.push("");

    lines.push("Слушатель,Email,Поток,Прогресс %,Модуль,Блок,Урок,Последний вход,Ср. мин/урок,Риски");

    for (const r of courseRows) {
      const lastLogin = r.lastLoginAt
        ? new Date(r.lastLoginAt).toLocaleDateString("ru-RU")
        : "";
      lines.push([
        esc(r.studentName), esc(r.email), esc(r.cohort), `${r.progressPercent}%`,
        esc(r.currentModule ?? ""), esc(r.currentBlock ?? ""), esc(r.currentLesson ?? ""),
        esc(lastLogin), r.avgLessonMinutes ?? 0, r.riskCount ?? 0,
      ].join(","));
    }
    lines.push("");
  }

  // Overall footer
  lines.push(separator());
  lines.push("ИТОГО");
  lines.push(`Всего записей: ${total}`);
  lines.push(`Завершили курс: ${completed}`);
  lines.push(`Активных слушателей: ${inProgress}`);
  lines.push(`Средний прогресс: ${avg}%`);

  return lines.join("\n");
}

// ── Risk report ──────────────────────────────────────────────────────

export function generateRiskCsv(rows: RiskRow[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО РИСКАМ СЛУШАТЕЛЕЙ"));

  const critical = rows.filter((r) => r.severity === "critical").length;
  const high = rows.filter((r) => r.severity === "high").length;
  const medium = rows.filter((r) => r.severity === "medium").length;
  const low = rows.filter((r) => r.severity === "low").length;
  const open = rows.filter((r) => r.status === "open").length;

  lines.push("=== СВОДКА ===");
  lines.push(`Всего рисков,${rows.length}`);
  lines.push(`Критических,${critical}`);
  lines.push(`Высоких,${high}`);
  lines.push(`Средних,${medium}`);
  lines.push(`Низких,${low}`);
  lines.push(`Открытых,${open}`);
  lines.push("");
  lines.push(separator());
  lines.push("Слушатель,Email,Курс,Тип риска,Уровень,Статус");

  for (const r of rows) {
    lines.push([
      esc(r.studentName), esc(r.email), esc(r.course),
      esc(r.type), esc(r.severity), esc(r.status),
    ].join(","));
  }

  return lines.join("\n");
}

// ── Certificate report ───────────────────────────────────────────────

export function generateCertificateCsv(rows: CertificateRow[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО СЕРТИФИКАТАМ"));

  const uniqueCourses = new Set(rows.map((r) => r.course)).size;

  lines.push("=== СВОДКА ===");
  lines.push(`Всего сертификатов,${rows.length}`);
  lines.push(`По курсам,${uniqueCourses}`);
  lines.push("");
  lines.push(separator());
  lines.push("Номер,Слушатель,Email,Курс,Дата выдачи");

  for (const r of rows) {
    lines.push([
      esc(r.number), esc(r.studentName), esc(r.email),
      esc(r.course), r.issuedAt,
    ].join(","));
  }

  return lines.join("\n");
}
