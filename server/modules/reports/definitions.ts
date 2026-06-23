import { ApiError } from "@/lib/http";
import type { ReportFormat, ReportType } from "@/lib/reports/types";
import type { RoleKey as DomainRoleKey } from "@/types/domain";

// ── Constants ─────────────────────────────────────────────────────────────────

export const EXT: Record<ReportFormat, string> = {
  csv: ".csv",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

export const REPORT_TYPE_ALIASES: Record<string, ReportType> = {
  progress: "progress",
  curator_progress: "progress",
  risk: "risk",
  curator_risk: "risk",
  assignments: "assignments",
  assignment: "assignments",
  certificates: "certificates",
  curator_workload: "curator_workload",
  workload: "curator_workload",
  weekly_cohort: "weekly_cohort",
  weekly: "weekly_cohort",
  final_cohort: "final_cohort",
  final: "final_cohort",
};

export const ROLE_PRIORITY: DomainRoleKey[] = [
  "admin",
  "super_curator",
  "curator",
  "instructor",
  "customer_observer",
  "student",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportDefinition {
  type: ReportType;
  title: string;
  filenameBase: string;
  desc: string;
  icon: string;
  owner: string;
  decision: string;
  allowedRoles: DomainRoleKey[];
}

// ── Report definitions ────────────────────────────────────────────────────────

export const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  progress: {
    type: "progress",
    title: "Прогресс обучения",
    filenameBase: "progress_report",
    desc: "Прогресс слушателей по курсам",
    icon: "trending_up",
    owner: "Академические операции",
    decision: "Кто проходит курс, где есть отставание и какой поток требует внимания.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  },
  risk: {
    type: "risk",
    title: "Риски слушателей",
    filenameBase: "risk_report",
    desc: "Риски и проблемные зоны",
    icon: "warning",
    owner: "Кураторская служба",
    decision: "Какие риски нужно разобрать до потери темпа обучения.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  },
  assignments: {
    type: "assignments",
    title: "Задания",
    filenameBase: "assignments_report",
    desc: "Отправки, статусы проверки и баллы",
    icon: "checklist",
    owner: "Проверка заданий",
    decision: "Какие работы ждут проверки, где нужна доработка и кто проверяет.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator"],
  },
  certificates: {
    type: "certificates",
    title: "Сертификаты",
    filenameBase: "certificates_report",
    desc: "Выпущенные сертификаты",
    icon: "verified",
    owner: "Сертификация",
    decision: "Какие сертификаты выпущены в разрешенном scope.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  },
  curator_workload: {
    type: "curator_workload",
    title: "Нагрузка кураторов",
    filenameBase: "curator_workload_report",
    desc: "Очереди, риски и закрепленные слушатели",
    icon: "group",
    owner: "Операции супер-куратора",
    decision: "Где перегрузка кураторов и какие очереди нужно перераспределить.",
    allowedRoles: ["admin", "super_curator"],
  },
  productivity_score: {
    type: "productivity_score",
    title: "Productivity Score",
    filenameBase: "productivity_score_report",
    desc: "Комплексная оценка продуктивности слушателей",
    icon: "bar_chart",
    owner: "Академические операции",
    decision: "Какие слушатели показывают высокую/низкую продуктивность и где нужна интервенция.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  },
  weekly_cohort: {
    type: "weekly_cohort",
    title: "Еженедельный отчёт по потоку",
    filenameBase: "weekly_cohort_report",
    desc: "Сводка за неделю: активность, риски, вопросы, прогресс",
    icon: "calendar_month",
    owner: "Корпоративная отчётность",
    decision: "Какие потоки требуют внимания, где риски и какова динамика за неделю.",
    allowedRoles: ["admin", "super_curator", "curator", "customer_observer"],
  },
  final_cohort: {
    type: "final_cohort",
    title: "Итоговый отчёт по потоку",
    filenameBase: "final_cohort_report",
    desc: "Итоговые метрики, Score, сертификаты, риски",
    icon: "assignment_turned_in",
    owner: "Корпоративная отчётность",
    decision: "Какие результаты у потока, сколько завершили, какой Score и NPS.",
    allowedRoles: ["admin", "super_curator", "curator", "customer_observer"],
  },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

export function pickActorRole(roles: string[]): DomainRoleKey | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

export function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function normalizeReportType(type: string | null): ReportType {
  if (!type) throw new ApiError("bad_request", "Не указан тип отчёта", 400);
  const normalized = REPORT_TYPE_ALIASES[type];
  if (!normalized) throw new ApiError("bad_request", "Неизвестный тип отчёта", 400);
  return normalized;
}

export function parseReportFormat(format: string | null): ReportFormat {
  const normalized = format || "csv";
  if (normalized === "csv" || normalized === "xlsx" || normalized === "pdf") return normalized;
  throw new ApiError("bad_request", "Неподдерживаемый формат отчёта. Используйте csv, xlsx или pdf.", 400);
}

export function assertReportAllowed(definition: ReportDefinition, actorRole: DomainRoleKey) {
  if (!definition.allowedRoles.includes(actorRole)) {
    throw new ApiError("forbidden", "Этот отчет недоступен для текущей роли", 403);
  }
}
