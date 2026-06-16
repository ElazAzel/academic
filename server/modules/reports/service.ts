import { RoleKey } from "@prisma/client";
import { ApiError, getSafeErrorMetadata } from "@/lib/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import {
  fetchAssignmentData,
  fetchCertificateData,
  fetchCuratorWorkloadData,
  fetchProductivityScoreData,
  fetchProgressData,
  fetchRiskData,
} from "@/lib/reports/data";
import {
  generateAssignmentCsv,
  generateCertificateCsv,
  generateCuratorWorkloadCsv,
  generateProductivityScoreCsv,
  generateProgressCsv,
  generateRiskCsv,
} from "@/lib/reports/csv-generator";
import {
  generateAssignmentXlsx,
  generateCertificateXlsx,
  generateCuratorWorkloadXlsx,
  generateProductivityScoreXlsx,
  generateProgressXlsx,
  generateRiskXlsx,
} from "@/lib/reports/xlsx-generator";
import {
  generateAssignmentPdf,
  generateCertificatePdf,
  generateCuratorWorkloadPdf,
  generateProductivityScorePdf,
  generateProgressPdf,
  generateRiskPdf,
} from "@/lib/reports/pdf-generator";
import { getObserverScope, getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";
import type {
  ReportDataScope,
  ReportFormat,
  ReportType,
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

function pickActorRole(roles: string[]): DomainRoleKey | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeReportType(type: string | null): ReportType {
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

function fieldsCacheKey(fields?: string[]) {
  return fields && fields.length > 0 ? fields.join(".") : "all-fields";
}

async function countRows(type: ReportType, scope: ReportDataScope): Promise<number> {
  const rows = await (async () => {
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
      case "productivity_score":
        return fetchProductivityScoreData(scope);
    }
  })();
  return (rows as unknown[]).length;
}

async function renderReport(type: ReportType, format: ReportFormat, scope: ReportDataScope, fields?: string[]): Promise<RenderedReport> {
  if (format === "csv") {
    switch (type) {
      case "progress": {
        const rows = await fetchProgressData(scope);
        return { content: generateProgressCsv(rows, fields), format };
      }
      case "risk": {
        const rows = await fetchRiskData(scope);
        return { content: generateRiskCsv(rows, fields), format };
      }
      case "assignments": {
        const rows = await fetchAssignmentData(scope);
        return { content: generateAssignmentCsv(rows, fields), format };
      }
      case "certificates": {
        const rows = await fetchCertificateData(scope);
        return { content: generateCertificateCsv(rows, fields), format };
      }
      case "curator_workload": {
        const rows = await fetchCuratorWorkloadData(scope);
        return { content: generateCuratorWorkloadCsv(rows, fields), format };
      }
      case "productivity_score": {
        const rows = await fetchProductivityScoreData(scope);
        return { content: generateProductivityScoreCsv(rows, fields), format };
      }
    }
  }

  // Row-count guardrails: fail early instead of silent OOM/timeout.
  if (format === "pdf") {
    const rowCount = await countRows(type, scope);
    if (rowCount > 2000) {
      console.warn(`[Reports] PDF limit exceeded: ${rowCount} rows, falling back to CSV`);
      const fallback: RenderedReport = await renderReport(type, "csv", scope, fields);
      return { ...fallback, fallbackReason: `PDF поддерживает до 2000 строк. CSV сгенерирован (${rowCount} строк)` };
    }
  }
  if (format === "xlsx") {
    const rowCount = await countRows(type, scope);
    if (rowCount > 50000) {
      console.warn(`[Reports] XLSX limit exceeded: ${rowCount} rows, falling back to CSV`);
      const fallback: RenderedReport = await renderReport(type, "csv", scope, fields);
      return { ...fallback, fallbackReason: `XLSX поддерживает до 50 000 строк. CSV сгенерирован (${rowCount} строк)` };
    }
  }

  try {
    if (format === "xlsx") {
      switch (type) {
        case "progress": {
          const rows = await fetchProgressData(scope);
          return { content: await generateProgressXlsx(rows, fields), format };
        }
        case "risk": {
          const rows = await fetchRiskData(scope);
          return { content: await generateRiskXlsx(rows, fields), format };
        }
        case "assignments": {
          const rows = await fetchAssignmentData(scope);
          return { content: await generateAssignmentXlsx(rows, fields), format };
        }
        case "certificates": {
          const rows = await fetchCertificateData(scope);
          return { content: await generateCertificateXlsx(rows, fields), format };
        }
        case "curator_workload": {
          const rows = await fetchCuratorWorkloadData(scope);
          return { content: await generateCuratorWorkloadXlsx(rows, fields), format };
        }
        case "productivity_score": {
          const rows = await fetchProductivityScoreData(scope);
          return { content: await generateProductivityScoreXlsx(rows, fields), format };
        }
      }
    }

    switch (type) {
      case "progress": {
        const rows = await fetchProgressData(scope);
        return { content: await generateProgressPdf(rows, fields), format };
      }
      case "risk": {
        const rows = await fetchRiskData(scope);
        return { content: await generateRiskPdf(rows, fields), format };
      }
      case "assignments": {
        const rows = await fetchAssignmentData(scope);
        return { content: await generateAssignmentPdf(rows, fields), format };
      }
      case "certificates": {
        const rows = await fetchCertificateData(scope);
        return { content: await generateCertificatePdf(rows, fields), format };
      }
      case "curator_workload": {
        const rows = await fetchCuratorWorkloadData(scope);
        return { content: await generateCuratorWorkloadPdf(rows, fields), format };
      }
      case "productivity_score": {
        const rows = await fetchProductivityScoreData(scope);
        return { content: await generateProductivityScorePdf(rows, fields), format };
      }
    }
  } catch (error) {
    console.warn("[Reports] Report generation failed, falling back to CSV", {
      format,
      ...getSafeErrorMetadata(error),
    });
    const fallback: RenderedReport = await renderReport(type, "csv", scope, fields);
    return {
      ...fallback,
      fallbackReason: `${format.toUpperCase()} не удалось сформировать. Вместо него выдан CSV.`,
    };
  }

  // Unreachable — all types/formats handled above
  throw new Error(`Unhandled report type/format: ${type}/${format}`);
}

export function getAvailableReportsForRoles(roles: string[]) {
  const actorRole = pickActorRole(roles);
  if (!actorRole) return [];
  return Object.values(REPORT_DEFINITIONS).filter((definition) => definition.allowedRoles.includes(actorRole));
}

// ── Display config for DownloadReports component ──────────────────────

const REPORT_ROLE_META: Record<DomainRoleKey, { owner: string; scope: string }> = {
  admin: { owner: "Администратор", scope: "Вся академия" },
  super_curator: { owner: "Супер-куратор", scope: "Зона ответственности" },
  curator: { owner: "Куратор", scope: "Только закрепленные слушатели" },
  instructor: { owner: "Преподаватель", scope: "Только курсы преподавателя" },
  customer_observer: { owner: "Наблюдатель", scope: "Только разрешенные проекты" },
  student: { owner: "Слушатель", scope: "Только мои данные" },
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
  fields?: string[];
}): Promise<ReportDownload> {
  const type = normalizeReportType(input.type);
  const definition = REPORT_DEFINITIONS[type];
  const access = await resolveReportScope(input.user);
  assertReportAllowed(definition, access.actorRole);

  const cacheKey = `report:${type}:${input.format}:${input.user.id}:${scopeCacheKey(access)}:${fieldsCacheKey(input.fields)}`;
  const cached = await cacheGet<ReportDownload>(cacheKey);
  if (cached) return cached;

  const rendered = await renderReport(type, input.format, access.scope, input.fields);
  const filename = `${definition.filenameBase}${EXT[rendered.format]}`;

  const download: ReportDownload = {
    content: rendered.content,
    format: rendered.format,
    filename,
    definition,
    access,
    fallbackReason: rendered.fallbackReason,
  };

  await cacheSet(cacheKey, download, 300);
  return download;
}

export async function generateReportPreview(input: {
  user: Pick<AppSessionUser, "id" | "roles">;
  type: string | null;
}) {
  const type = normalizeReportType(input.type);
  const definition = REPORT_DEFINITIONS[type];
  const access = await resolveReportScope(input.user);
  assertReportAllowed(definition, access.actorRole);

  const rows = await (async () => {
    switch (type) {
      case "progress":
        return fetchProgressData(access.scope);
      case "risk":
        return fetchRiskData(access.scope);
      case "assignments":
        return fetchAssignmentData(access.scope);
      case "certificates":
        return fetchCertificateData(access.scope);
      case "curator_workload":
        return fetchCuratorWorkloadData(access.scope);
      case "productivity_score":
        return fetchProductivityScoreData(access.scope);
    }
  })();

  return {
    type,
    definition,
    totalRowsCount: rows.length,
    isTruncated: rows.length >= QUERY_LIMITS.reportRows,
    rowLimit: QUERY_LIMITS.reportRows,
    previewRows: rows.slice(0, 5),
  };
}

export async function getReportUser(userId: string): Promise<Pick<AppSessionUser, "id" | "roles"> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, roles: { include: { role: { select: { key: true } } } } },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    roles: user.roles.map((entry) => entry.role.key as RoleKey) as DomainRoleKey[],
  };
}

export async function getStudentReportsDashboardData(studentId: string) {
  const [enrollments, certificatesCount, quizAttempts, assignmentsSubmitted] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: studentId, status: "ACTIVE" },
      include: {
        course: { select: { id: true, title: true } },
        courseProgress: { select: { percent: true, status: true } },
        cohort: { select: { name: true } },
      },
    }),
    prisma.certificate.count({ where: { userId: studentId } }),
    prisma.quizAttempt.count({ where: { userId: studentId } }),
    prisma.assignmentSubmission.count({ where: { userId: studentId } }),
  ]);

  return {
    enrollments,
    certificatesCount,
    quizAttempts,
    assignmentsSubmitted,
  };
}
