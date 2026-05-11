import type { ProgressRow, RiskRow, CertificateRow } from "./types";
import { groupByCourse } from "./data";

function esc(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateProgressCsv(rows: ProgressRow[]): string {
  const grouped = groupByCourse(rows);
  const lines: string[] = [];

  lines.push("\uFEFFОТЧЁТ ПО ПРОГРЕССУ СЛУШАТЕЛЕЙ");
  lines.push(`Сформирован: ${new Date().toLocaleDateString("ru-RU")}`);
  lines.push("");

  for (const [course, courseRows] of grouped) {
    const total = courseRows.length;
    const completed = courseRows.filter((r) => r.progressPercent >= 100).length;
    const avg = Math.round(courseRows.reduce((s, r) => s + r.progressPercent, 0) / total);
    const cohortSummary = new Map<string, { total: number; avg: number }>();
    for (const r of courseRows) {
      const c = cohortSummary.get(r.cohort) ?? { total: 0, avg: 0 };
      c.total++;
      c.avg += r.progressPercent;
      cohortSummary.set(r.cohort, c);
    }

    lines.push(`═══════════════════════════════════════════════`);
    lines.push(`КУРС: ${course}`);
    lines.push(`Всего: ${total} | Завершили: ${completed} | Средний прогресс: ${avg}%`);
    lines.push(`Потоки:`);
    for (const [cohort, c] of cohortSummary) {
      lines.push(`  • ${cohort}: ${c.total} слуш. | Средний: ${Math.round(c.avg / c.total)}%`);
    }
    lines.push(``);
    lines.push(`Слушатель,Email,Поток,Прогресс,%`);
    for (const r of courseRows) {
      lines.push(`${esc(r.studentName)},${esc(r.email)},${esc(r.cohort)},${r.progressPercent}`);
    }
    lines.push(``);
  }

  // Общая сводка
  const allTotal = rows.length;
  const allCompleted = rows.filter((r) => r.progressPercent >= 100).length;
  const allAvg = Math.round(rows.reduce((s, r) => s + r.progressPercent, 0) / allTotal);
  lines.push(`═══════════════════════════════════════════════`);
  lines.push(`ОБЩАЯ СВОДКА`);
  lines.push(`Всего записей: ${allTotal}`);
  lines.push(`Завершили курс: ${allCompleted}`);
  lines.push(`Средний прогресс: ${allAvg}%`);
  lines.push(`Активных слушателей (< 100%): ${allTotal - allCompleted}`);

  return lines.join("\n");
}

export function generateRiskCsv(rows: RiskRow[]): string {
  const lines: string[] = [];

  lines.push("\uFEFFОТЧЁТ ПО РИСКАМ СЛУШАТЕЛЕЙ");
  lines.push(`Сформирован: ${new Date().toLocaleDateString("ru-RU")}`);
  lines.push("");

  const bySeverity = (sev: string) => rows.filter((r) => r.severity === sev);
  const critical = bySeverity("critical");
  const high = bySeverity("high");

  lines.push(`Критических рисков: ${critical.length}`);
  lines.push(`Высоких рисков: ${high.length}`);
  lines.push(`Всего рисков: ${rows.length}`);
  lines.push("");

  lines.push(`Слушатель,Email,Курс,Тип риска,Уровень,Статус`);
  for (const r of rows) {
    lines.push(`${esc(r.studentName)},${esc(r.email)},${esc(r.course)},${esc(r.type)},${esc(r.severity)},${esc(r.status)}`);
  }

  return lines.join("\n");
}

export function generateCertificateCsv(rows: CertificateRow[]): string {
  const lines: string[] = [];

  lines.push("\uFEFFОТЧЁТ ПО СЕРТИФИКАТАМ");
  lines.push(`Сформирован: ${new Date().toLocaleDateString("ru-RU")}`);
  lines.push(`Всего выдано: ${rows.length}`);
  lines.push("");

  lines.push(`Номер,Слушатель,Email,Курс,Дата выдачи`);
  for (const r of rows) {
    lines.push(`${esc(r.number)},${esc(r.studentName)},${esc(r.email)},${esc(r.course)},${r.issuedAt}`);
  }

  return lines.join("\n");
}
