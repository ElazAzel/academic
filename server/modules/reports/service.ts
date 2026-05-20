import { RoleKey } from "@prisma/client";
import { ApiError } from "@/lib/http";
import { reportCache } from "@/lib/cache";
import { getPrisma } from "@/lib/prisma";
import {
  fetchAssignmentData,
  fetchCertificateData,
  fetchCuratorWorkloadData,
  fetchProgressData,
  fetchRiskData,
} from "@/lib/reports/data";
import {
  generateAssignmentCsv,
  generateCertificateCsv,
  generateCuratorWorkloadCsv,
  generateProgressCsv,
  generateRiskCsv,
} from "@/lib/reports/csv-generator";
import {
  generateAssignmentXlsx,
  generateCertificateXlsx,
  generateCuratorWorkloadXlsx,
  generateProgressXlsx,
  generateRiskXlsx,
} from "@/lib/reports/xlsx-generator";
import {
  generateAssignmentPdf,
  generateCertificatePdf,
  generateCuratorWorkloadPdf,
  generateProgressPdf,
  generateRiskPdf,
} from "@/lib/reports/pdf-generator";
import { getObserverScope, getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";
import type {
  AssignmentRow,
  CertificateRow,
  CuratorWorkloadRow,
  ProgressRow,
  ReportDataScope,
  ReportFormat,
  ReportType,
  RiskRow,
} from "@/lib/reports/types";
import type { AppSessionUser, RoleKey as DomainRoleKey } from "@/types/domain";

const prisma = getPrisma();

const EXT: Record<ReportFormat, string> = {
  csv: ".csv",
  xlsx: ".xlsx",
  pdf: ".pdf",
};

const REPORT_TYPE_ALIASES: Record<string, ReportType> = {
  progress: "progress",
  curator_progress: "progress",
  risk: "risk",
  curator_risk: "risk",
  assignments: "assignments",
  assignment: "assignments",
  certificates: "certificates",
  curator_workload: "curator_workload",
  workload: "curator_workload",
};

const ROLE_PRIORITY: DomainRoleKey[] = [
  "admin",
  "super_curator",
  "curator",
  "instructor",
  "customer_observer",
  "student",
];

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

export const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  progress: {
    type: "progress",
    title: "Прогресс обучения",
    filenameBase: "progress_report",
    desc: "Прогресс слушателей по курсам",
    icon: "trending_up",
    owner: "Academic operations",
    decision: "Кто проходит курс, где есть отставание и какой поток требует внимания.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer", "student"],
  },
  risk: {
    type: "risk",
    title: "Риски слушателей",
    filenameBase: "risk_report",
    desc: "Риски и проблемные зоны",
    icon: "warning",
    owner: "Curator operations",
    decision: "Какие риски нужно разобрать до потери темпа обучения.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer"],
  },
  assignments: {
    type: "assignments",
    title: "Задания",
    filenameBase: "assignments_report",
    desc: "Отправки, статусы проверки и баллы",
    icon: "checklist",
    owner: "Review operations",
    decision: "Какие работы ждут проверки, где нужна доработка и кто проверяет.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "student"],
  },
  certificates: {
    type: "certificates",
    title: "Сертификаты",
    filenameBase: "certificates_report",
    desc: "Выпущенные сертификаты",
    icon: "verified",
    owner: "Certification",
    decision: "Какие сертификаты выпущены в разрешенном scope.",
    allowedRoles: ["admin", "instructor", "curator", "super_curator", "customer_observer", "student"],
  },
  curator_workload: {
    type: "curator_workload",
    title: "Нагрузка кураторов",
    filenameBase: "curator_workload_report",
    desc: "Очереди, риски и закрепленные слушатели",
    icon: "group",
    owner: "Super curator operations",
    decision: "Где перегрузка кураторов и какие очереди нужно перераспределить.",
    allowedRoles: ["admin", "super_curator"],
  },
};

export interface ReportAccessContext {
  actorRole: DomainRoleKey;
  scope: ReportDataScope;
  scopeLabel: string;
}

export interface ReportDownload {
  content: string | Buffer | Uint8Array;
  format: ReportFormat;
  filename: string;
  definition: ReportDefinition;
  access: ReportAccessContext;
  fallbackReason?: string;
}

interface RenderedReport {
  content: string | Buffer | Uint8Array;
  format: ReportFormat;
  fallbackReason?: string;
}

function normalizeRole(role: string): DomainRoleKey | null {
  return ROLE_PRIORITY.includes(role as DomainRoleKey) ? (role as DomainRoleKey) : null;
}

function pickActorRole(roles: string[]): DomainRoleKey | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeReportType(type: string | null): ReportType {
  if (!type) throw new ApiError("bad_request", "Report type is required", 400);
  const normalized = REPORT_TYPE_ALIASES[type];
  if (!normalized) throw new ApiError("bad_request", "Unknown report type", 400);
  return normalized;
}

export function parseReportFormat(format: string | null): ReportFormat {
  const normalized = format || "csv";
  if (normalized === "csv" || normalized === "xlsx" || normalized === "pdf") return normalized;
  throw new ApiError("bad_request", "Unsupported format. Use csv, xlsx, or pdf.", 400);
}

async function getCourseIdsForCohorts(cohortIds: string[]) {
  if (cohortIds.length === 0) return [];
  const cohorts = await prisma.cohort.findMany({
    where: { id: { in: cohortIds } },
    select: { courseId: true },
  });
  return unique(cohorts.map((cohort) => cohort.courseId).filter((id): id is string => Boolean(id)));
}

async function resolveReportScope(user: Pick<AppSessionUser, "id" | "roles">): Promise<ReportAccessContext> {
  const actorRole = pickActorRole(user.roles);
  if (!actorRole) {
    throw new ApiError("forbidden", "Недостаточно прав для отчетов", 403);
  }

  if (actorRole === "student") {
    return {
      actorRole,
      scope: { studentIds: [user.id] },
      scopeLabel: "Только мои данные",
    };
  }

  if (actorRole === "admin") {
    return {
      actorRole,
      scope: {},
      scopeLabel: "Вся академия",
    };
  }

  if (actorRole === "super_curator") {
    const scope = await getSuperCuratorScope(user);
    const courseIds = await getCourseIdsForCohorts(scope.cohortIds);
    return {
      actorRole,
      scope: {
        studentIds: scope.studentIds,
        curatorIds: scope.curatorIds,
        cohortIds: scope.cohortIds,
        courseIds,
      },
      scopeLabel: `Операционная зона супер-куратора: ${scope.cohortIds.length} потоков, ${scope.studentIds.length} слушателей`,
    };
  }

  if (actorRole === "curator") {
    const assignments = await prisma.curatorAssignment.findMany({
      where: { curatorId: user.id, active: true },
      select: { studentId: true, cohortId: true, cohort: { select: { courseId: true } } },
    });
    const studentIds = unique(assignments.map((assignment) => assignment.studentId));
    const cohortIds = unique(assignments.map((assignment) => assignment.cohortId));
    const courseIds = unique(assignments.map((assignment) => assignment.cohort.courseId).filter((id): id is string => Boolean(id)));
    return {
      actorRole,
      scope: { studentIds, cohortIds, courseIds, curatorIds: [user.id] },
      scopeLabel: `Назначенные слушатели куратора: ${studentIds.length}`,
    };
  }

  if (actorRole === "instructor") {
    const courses = await prisma.course.findMany({
      where: { instructors: { some: { userId: user.id } } },
      select: { id: true },
    });
    const courseIds = courses.map((course) => course.id);
    return {
      actorRole,
      scope: { courseIds },
      scopeLabel: `Курсы преподавателя: ${courseIds.length}`,
    };
  }

  if (actorRole === "customer_observer") {
    const [observerScope, scopedStudentIds] = await Promise.all([
      getObserverScope(user.id),
      getScopedStudentIdsForObserver(user.id),
    ]);
    const cohortIds = observerScope.cohortIds;
    const courseIds = await getCourseIdsForCohorts(cohortIds);
    const studentIds = scopedStudentIds ?? [];
    return {
      actorRole,
      scope: { studentIds, cohortIds, courseIds },
      scopeLabel: `Разрешенный scope заказчика: ${cohortIds.length} потоков, ${studentIds.length} слушателей`,
    };
  }

  throw new ApiError("forbidden", "Недостаточно прав для отчетов", 403);
}

function assertReportAllowed(definition: ReportDefinition, actorRole: DomainRoleKey) {
  if (!definition.allowedRoles.includes(actorRole)) {
    throw new ApiError("forbidden", "Этот отчет недоступен для текущей роли", 403);
  }
}

function scopeCacheKey(access: ReportAccessContext) {
  const { scope } = access;
  return [
    access.actorRole,
    scope.studentIds?.join(".") ?? "all-students",
    scope.courseIds?.join(".") ?? "all-courses",
    scope.cohortIds?.join(".") ?? "all-cohorts",
    scope.curatorIds?.join(".") ?? "all-curators",
  ].join(":");
}

async function fetchRows(type: ReportType, scope: ReportDataScope) {
  switch (type) {
    case "progress":
      return fetchProgressData(scope);
    case "risk":
      return fetchRiskData(scope);
    case "assignments":
      return fetchAssignmentData(scope);
    case "certificates":
      return fetchCertificateData(scope);
    case "curator_workload":
      return fetchCuratorWorkloadData(scope);
  }
}

async function renderReport(type: ReportType, format: ReportFormat, rows: Awaited<ReturnType<typeof fetchRows>>): Promise<RenderedReport> {
  if (format === "csv") {
    switch (type) {
      case "progress":
        return { content: generateProgressCsv(rows as ProgressRow[]), format };
      case "risk":
        return { content: generateRiskCsv(rows as RiskRow[]), format };
      case "assignments":
        return { content: generateAssignmentCsv(rows as AssignmentRow[]), format };
      case "certificates":
        return { content: generateCertificateCsv(rows as CertificateRow[]), format };
      case "curator_workload":
        return { content: generateCuratorWorkloadCsv(rows as CuratorWorkloadRow[]), format };
    }
  }

  try {
    if (format === "xlsx") {
      switch (type) {
        case "progress":
          return { content: await generateProgressXlsx(rows as ProgressRow[]), format };
        case "risk":
          return { content: await generateRiskXlsx(rows as RiskRow[]), format };
        case "assignments":
          return { content: await generateAssignmentXlsx(rows as AssignmentRow[]), format };
        case "certificates":
          return { content: await generateCertificateXlsx(rows as CertificateRow[]), format };
        case "curator_workload":
          return { content: await generateCuratorWorkloadXlsx(rows as CuratorWorkloadRow[]), format };
      }
    }

    switch (type) {
      case "progress":
        return { content: await generateProgressPdf(rows as ProgressRow[]), format };
      case "risk":
        return { content: await generateRiskPdf(rows as RiskRow[]), format };
      case "assignments":
        return { content: await generateAssignmentPdf(rows as AssignmentRow[]), format };
      case "certificates":
        return { content: await generateCertificatePdf(rows as CertificateRow[]), format };
      case "curator_workload":
        return { content: await generateCuratorWorkloadPdf(rows as CuratorWorkloadRow[]), format };
    }
  } catch (error) {
    console.warn(`[Reports] ${format} generation failed, falling back to CSV:`, error);
    const fallback: RenderedReport = await renderReport(type, "csv", rows);
    return {
      ...fallback,
      fallbackReason: `${format} generation failed, CSV provided instead`,
    };
  }
}

export function getAvailableReportsForRoles(roles: string[]) {
  const actorRole = pickActorRole(roles);
  if (!actorRole) return [];
  return Object.values(REPORT_DEFINITIONS).filter((definition) => definition.allowedRoles.includes(actorRole));
}

// ── Display config for DownloadReports component ──────────────────────

const REPORT_ROLE_META: Record<DomainRoleKey, { owner: string; scope: string }> = {
  admin: { owner: "Admin", scope: "Вся академия" },
  super_curator: { owner: "Super curator", scope: "Зона ответственности" },
  curator: { owner: "Curator", scope: "Только закрепленные слушатели" },
  instructor: { owner: "Instructor", scope: "Только курсы преподавателя" },
  customer_observer: { owner: "Customer observer", scope: "Только разрешенные проекты" },
  student: { owner: "Student", scope: "Только мои данные" },
};

function getReportTypeAlias(role: DomainRoleKey, type: ReportType): string | undefined {
  if (role === "curator") {
    if (type === "progress") return "curator_progress";
    if (type === "risk") return "curator_risk";
  }
  return undefined;
}

export interface DisplayReportItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  typeId?: string;
  formats?: ("csv" | "xlsx" | "pdf")[];
  owner: string;
  scope: string;
  decision: string;
}

/** Build display-ready report list for DownloadReports component */
export function getDisplayReportsForRole(roles: string[]): DisplayReportItem[] {
  const actorRole = pickActorRole(roles);
  if (!actorRole) return [];

  const available = getAvailableReportsForRoles(roles);
  const meta = REPORT_ROLE_META[actorRole];

  return available.map((def) => ({
    id: def.type,
    title: def.title,
    desc: def.desc,
    icon: def.icon,
    typeId: getReportTypeAlias(actorRole, def.type),
    owner: meta.owner,
    scope: meta.scope,
    decision: def.decision,
  }));
}

export async function generateReportDownload(input: {
  user: Pick<AppSessionUser, "id" | "roles">;
  type: string | null;
  format: ReportFormat;
}): Promise<ReportDownload> {
  const type = normalizeReportType(input.type);
  const definition = REPORT_DEFINITIONS[type];
  const access = await resolveReportScope(input.user);
  assertReportAllowed(definition, access.actorRole);

  const cacheKey = `report:${type}:${input.format}:${input.user.id}:${scopeCacheKey(access)}`;
  const cached = reportCache.get<ReportDownload>(cacheKey);
  if (cached) return cached;

  const rows = await fetchRows(type, access.scope);
  const rendered = await renderReport(type, input.format, rows);
  const filename = `${definition.filenameBase}${EXT[rendered.format]}`;

  const download: ReportDownload = {
    content: rendered.content,
    format: rendered.format,
    filename,
    definition,
    access,
    fallbackReason: rendered.fallbackReason,
  };

  reportCache.set(cacheKey, download);
  return download;
}

export async function getReportUser(userId: string): Promise<Pick<AppSessionUser, "id" | "roles"> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roles: { include: { role: { select: { key: true } } } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    roles: user.roles.map((entry) => entry.role.key as RoleKey) as DomainRoleKey[],
  };
}
