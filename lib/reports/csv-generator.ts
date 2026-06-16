import type { AssignmentRow, CertificateRow, CuratorWorkloadRow, FinalCohortRow, ProductivityScoreRow, ProgressRow, RiskRow, WeeklyCohortRow } from "./types";
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

export function generateProgressCsv(rows: ProgressRow[], fields?: string[]): string {
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

  const COLS = [
    { key: "studentName", label: "Слушатель", get: (r: ProgressRow) => esc(r.studentName) },
    { key: "email", label: "Email", get: (r: ProgressRow) => esc(r.email) },
    { key: "cohort", label: "Поток", get: (r: ProgressRow) => esc(r.cohort) },
    { key: "progressPercent", label: "Прогресс %", get: (r: ProgressRow) => `${r.progressPercent}%` },
    { key: "currentModule", label: "Модуль", get: (r: ProgressRow) => esc(r.currentModule ?? "") },
    { key: "currentBlock", label: "Блок", get: (r: ProgressRow) => esc(r.currentBlock ?? "") },
    { key: "currentLesson", label: "Урок", get: (r: ProgressRow) => esc(r.currentLesson ?? "") },
    { key: "lastLoginAt", label: "Последний вход", get: (r: ProgressRow) => r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString("ru-RU") : "" },
    { key: "avgLessonMinutes", label: "Ср. мин/урок", get: (r: ProgressRow) => String(r.avgLessonMinutes ?? 0) },
    { key: "riskCount", label: "Риски", get: (r: ProgressRow) => String(r.riskCount ?? 0) },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

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

    lines.push(activeCols.map(c => c.label).join(","));

    for (const r of courseRows) {
      lines.push(activeCols.map(c => c.get(r)).join(","));
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

export function generateRiskCsv(rows: RiskRow[], fields?: string[]): string {
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

  const COLS = [
    { key: "studentName", label: "Слушатель", get: (r: RiskRow) => esc(r.studentName) },
    { key: "email", label: "Email", get: (r: RiskRow) => esc(r.email) },
    { key: "course", label: "Курс", get: (r: RiskRow) => esc(r.course) },
    { key: "type", label: "Тип риска", get: (r: RiskRow) => esc(r.type) },
    { key: "severity", label: "Уровень", get: (r: RiskRow) => esc(r.severity) },
    { key: "status", label: "Статус", get: (r: RiskRow) => esc(r.status) },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));

  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}

// ── Certificate report ───────────────────────────────────────────────

export function generateCertificateCsv(rows: CertificateRow[], fields?: string[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО СЕРТИФИКАТАМ"));

  const uniqueCourses = new Set(rows.map((r) => r.course)).size;
  const revoked = rows.filter((r) => r.revokedAt).length;

  lines.push("=== СВОДКА ===");
  lines.push(`Всего сертификатов,${rows.length}`);
  lines.push(`Действующих,${rows.length - revoked}`);
  lines.push(`Отозвано,${revoked}`);
  lines.push(`По курсам,${uniqueCourses}`);
  lines.push("");
  lines.push(separator());

  const COLS = [
    { key: "number", label: "Номер", get: (r: CertificateRow) => esc(r.number) },
    { key: "studentName", label: "Слушатель", get: (r: CertificateRow) => esc(r.studentName) },
    { key: "email", label: "Email", get: (r: CertificateRow) => esc(r.email) },
    { key: "course", label: "Курс", get: (r: CertificateRow) => esc(r.course) },
    { key: "issuedAt", label: "Дата выдачи", get: (r: CertificateRow) => r.issuedAt },
    { key: "status", label: "Статус", get: (r: CertificateRow) => esc(r.status) },
    { key: "revokedAt", label: "Дата отзыва", get: (r: CertificateRow) => r.revokedAt ?? "" },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));

  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}

// ── Assignment report ────────────────────────────────────────────────

export function generateAssignmentCsv(rows: AssignmentRow[], fields?: string[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО ЗАДАНИЯМ"));

  const pending = rows.filter((r) => r.status === "SUBMITTED" || r.status === "IN_REVIEW").length;
  const accepted = rows.filter((r) => r.status === "ACCEPTED").length;
  const needsRevision = rows.filter((r) => r.status === "NEEDS_REVISION" || r.status === "REJECTED").length;

  lines.push("=== СВОДКА ===");
  lines.push(`Всего отправок,${rows.length}`);
  lines.push(`На проверке,${pending}`);
  lines.push(`Принято,${accepted}`);
  lines.push(`Нужна доработка,${needsRevision}`);
  lines.push("");
  lines.push(separator());

  const COLS = [
    { key: "studentName", label: "Слушатель", get: (r: AssignmentRow) => esc(r.studentName) },
    { key: "email", label: "Email", get: (r: AssignmentRow) => esc(r.email) },
    { key: "course", label: "Курс", get: (r: AssignmentRow) => esc(r.course) },
    { key: "lesson", label: "Урок", get: (r: AssignmentRow) => esc(r.lesson ?? "") },
    { key: "assignment", label: "Задание", get: (r: AssignmentRow) => esc(r.assignment) },
    { key: "status", label: "Статус", get: (r: AssignmentRow) => esc(r.status) },
    { key: "score", label: "Балл", get: (r: AssignmentRow) => r.score ?? "" },
    { key: "submittedAt", label: "Отправлено", get: (r: AssignmentRow) => r.submittedAt },
    { key: "reviewedAt", label: "Проверено", get: (r: AssignmentRow) => r.reviewedAt ?? "" },
    { key: "reviewerName", label: "Проверяющий", get: (r: AssignmentRow) => esc(r.reviewerName ?? "") },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));

  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}

// ── Curator workload report ──────────────────────────────────────────

export function generateCuratorWorkloadCsv(rows: CuratorWorkloadRow[], fields?: string[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО НАГРУЗКЕ КУРАТОРОВ"));

  const overloaded = rows.filter((r) => r.criticalRisks > 0 || r.openQuestions > 10 || r.pendingAssignments > 15).length;
  lines.push("=== СВОДКА ===");
  lines.push(`Кураторов,${rows.length}`);
  lines.push(`Слушателей,${rows.reduce((sum, row) => sum + row.studentsCount, 0)}`);
  lines.push(`Открытых вопросов,${rows.reduce((sum, row) => sum + row.openQuestions, 0)}`);
  lines.push(`Заданий на проверке,${rows.reduce((sum, row) => sum + row.pendingAssignments, 0)}`);
  lines.push(`Активных рисков,${rows.reduce((sum, row) => sum + row.activeRisks, 0)}`);
  lines.push(`Перегружены,${overloaded}`);
  lines.push("");
  lines.push(separator());

  const COLS = [
    { key: "curatorName", label: "Куратор", get: (r: CuratorWorkloadRow) => esc(r.curatorName) },
    { key: "curatorEmail", label: "Email", get: (r: CuratorWorkloadRow) => esc(r.curatorEmail) },
    { key: "cohorts", label: "Потоки", get: (r: CuratorWorkloadRow) => esc(r.cohorts) },
    { key: "studentsCount", label: "Слушателей", get: (r: CuratorWorkloadRow) => String(r.studentsCount) },
    { key: "avgProgress", label: "Средний прогресс %", get: (r: CuratorWorkloadRow) => `${r.avgProgress}%` },
    { key: "openQuestions", label: "Открытые вопросы", get: (r: CuratorWorkloadRow) => String(r.openQuestions) },
    { key: "pendingAssignments", label: "Задания на проверке", get: (r: CuratorWorkloadRow) => String(r.pendingAssignments) },
    { key: "activeRisks", label: "Активные риски", get: (r: CuratorWorkloadRow) => String(r.activeRisks) },
    { key: "criticalRisks", label: "Критические риски", get: (r: CuratorWorkloadRow) => String(r.criticalRisks) },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));

  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}

// ── Productivity Score report ──────────────────────────────────────────

// ── Weekly Cohort Report ─────────────────────────────────────────────

// ── Final Cohort Report ──────────────────────────────────────────────

export function generateFinalCohortCsv(rows: FinalCohortRow[], fields?: string[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ИТОГОВЫЙ ОТЧЁТ ПО ПОТОКУ"));
  lines.push(`Всего потоков: ${rows.length}`);
  lines.push("");

  const COLS = [
    { key: "cohortName", label: "Поток", get: (r: FinalCohortRow) => esc(r.cohortName) },
    { key: "course", label: "Курс", get: (r: FinalCohortRow) => esc(r.course) },
    { key: "totalEnrolled", label: "Зачислено", get: (r: FinalCohortRow) => String(r.totalEnrolled) },
    { key: "completedCount", label: "Завершили", get: (r: FinalCohortRow) => String(r.completedCount) },
    { key: "completedPercent", label: "Завершили %", get: (r: FinalCohortRow) => `${r.completedPercent}%` },
    { key: "finalProjectSubmitted", label: "Фин. работа сдана", get: (r: FinalCohortRow) => String(r.finalProjectSubmitted) },
    { key: "finalProjectPercent", label: "Фин. работа %", get: (r: FinalCohortRow) => `${r.finalProjectPercent}%` },
    { key: "certificatesIssued", label: "Сертификатов", get: (r: FinalCohortRow) => String(r.certificatesIssued) },
    { key: "certificatesPercent", label: "Сертификаты %", get: (r: FinalCohortRow) => `${r.certificatesPercent}%` },
    { key: "avgProductivityScore", label: "Средний Score", get: (r: FinalCohortRow) => String(r.avgProductivityScore) },
    { key: "avgTestScore", label: "Средний тест", get: (r: FinalCohortRow) => `${r.avgTestScore}%` },
    { key: "avgAssignmentScore", label: "Среднее задание", get: (r: FinalCohortRow) => `${r.avgAssignmentScore}/100` },
    { key: "avgFinalProjectScore", label: "Фин. работа (avg)", get: (r: FinalCohortRow) => `${r.avgFinalProjectScore}/100` },
    { key: "satisfactionScore", label: "Satisfaction", get: (r: FinalCohortRow) => String(r.satisfactionScore) },
    { key: "nps", label: "NPS", get: (r: FinalCohortRow) => String(r.nps) },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));
  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}

export function generateWeeklyCohortCsv(rows: WeeklyCohortRow[], fields?: string[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ ПО ПОТОКУ"));
  lines.push(`Всего потоков: ${rows.length}`);
  const totalStudentsSum = rows.reduce((s, r) => s + r.totalStudents, 0);
  lines.push(`Всего слушателей: ${totalStudentsSum}`);
  lines.push(`Период: ${rows[0]?.periodStart ?? "—"} – ${rows[0]?.periodEnd ?? "—"}`);
  lines.push("");

  const COLS = [
    { key: "cohortName", label: "Поток", get: (r: WeeklyCohortRow) => esc(r.cohortName) },
    { key: "course", label: "Курс", get: (r: WeeklyCohortRow) => esc(r.course) },
    { key: "totalStudents", label: "Всего слушателей", get: (r: WeeklyCohortRow) => String(r.totalStudents) },
    { key: "activeStudents", label: "Активных", get: (r: WeeklyCohortRow) => String(r.activeStudents) },
    { key: "activePercent", label: "Активность %", get: (r: WeeklyCohortRow) => `${r.activePercent}%` },
    { key: "moduleProgressPercent", label: "Прохождение модуля %", get: (r: WeeklyCohortRow) => `${r.moduleProgressPercent}%` },
    { key: "completedWeekCount", label: "Завершили неделю", get: (r: WeeklyCohortRow) => String(r.completedWeekCount) },
    { key: "completedWeekPercent", label: "Завершили %", get: (r: WeeklyCohortRow) => `${r.completedWeekPercent}%` },
    { key: "behindCount", label: "Отстающих", get: (r: WeeklyCohortRow) => String(r.behindCount) },
    { key: "behindPercent", label: "Отстающих %", get: (r: WeeklyCohortRow) => `${r.behindPercent}%` },
    { key: "criticalRisks", label: "Крит. риски", get: (r: WeeklyCohortRow) => String(r.criticalRisks) },
    { key: "totalQuestions", label: "Вопросов", get: (r: WeeklyCohortRow) => String(r.totalQuestions) },
    { key: "avgResponseTimeHours", label: "Ср. время ответа (ч)", get: (r: WeeklyCohortRow) => String(r.avgResponseTimeHours) },
    { key: "submittedAssignments", label: "Сданных заданий", get: (r: WeeklyCohortRow) => String(r.submittedAssignments) },
    { key: "avgAssignmentScore", label: "Ср. оценка", get: (r: WeeklyCohortRow) => String(r.avgAssignmentScore) },
    { key: "currentModule", label: "Текущий модуль", get: (r: WeeklyCohortRow) => esc(r.currentModule) },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));
  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}

export function generateProductivityScoreCsv(rows: ProductivityScoreRow[], fields?: string[]): string {
  const lines: string[] = [];

  lines.push(...headerBlock("ОТЧЁТ ПО PRODUCTIVITY SCORE"));
  lines.push(`Всего слушателей: ${rows.length}`);
  const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.totalScore, 0) / rows.length) : 0;
  lines.push(`Средний балл: ${avg}`);
  lines.push(`Курсов: ${new Set(rows.map((r) => r.course)).size}`);
  lines.push("");

  const COLS = [
    { key: "studentName", label: "Слушатель", get: (r: ProductivityScoreRow) => esc(r.studentName) },
    { key: "email", label: "Email", get: (r: ProductivityScoreRow) => esc(r.email) },
    { key: "course", label: "Курс", get: (r: ProductivityScoreRow) => esc(r.course) },
    { key: "cohort", label: "Поток", get: (r: ProductivityScoreRow) => esc(r.cohort) },
    { key: "totalScore", label: "Общий балл", get: (r: ProductivityScoreRow) => String(r.totalScore) },
    { key: "level", label: "Уровень", get: (r: ProductivityScoreRow) => esc(r.level) },
    { key: "testsScore", label: "Тесты (0–100)", get: (r: ProductivityScoreRow) => String(r.testsScore) },
    { key: "assignmentsScore", label: "Задания (0–100)", get: (r: ProductivityScoreRow) => String(r.assignmentsScore) },
    { key: "finalProjectScore", label: "Фин. работа (0–100)", get: (r: ProductivityScoreRow) => String(r.finalProjectScore) },
    { key: "activityScore", label: "Активность (0–100)", get: (r: ProductivityScoreRow) => String(r.activityScore) },
    { key: "diagnosticsScore", label: "Диагностика (0–100)", get: (r: ProductivityScoreRow) => String(r.diagnosticsScore) },
  ];
  const activeCols = fields ? COLS.filter(c => fields!.includes(c.key)) : COLS;

  lines.push(activeCols.map(c => c.label).join(","));
  for (const r of rows) {
    lines.push(activeCols.map(c => c.get(r)).join(","));
  }

  return lines.join("\n");
}
