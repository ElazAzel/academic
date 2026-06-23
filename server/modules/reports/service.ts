import { cacheGet, cacheSet } from "@/lib/cache";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import {
  fetchAssignmentData,
  fetchCertificateData,
  fetchCuratorWorkloadData,
  fetchFinalCohortData,
  fetchProductivityScoreData,
  fetchProgressData,
  fetchRiskData,
  fetchWeeklyCohortData,
} from "@/lib/reports/data";
import {
  REPORT_DEFINITIONS,
  assertReportAllowed,
  EXT,
  normalizeReportType,
  parseReportFormat,
  pickActorRole,
  ReportDefinition,
} from "@/server/modules/reports/definitions";
import { renderReport, RenderedReport } from "@/server/modules/reports/renderer";
import { fieldsCacheKey, scopeCacheKey, resolveReportScope, ReportAccessContext } from "@/server/modules/reports/scope";
import type { ReportDataScope, ReportFormat, ReportType } from "@/lib/reports/types";
import type { AppSessionUser, RoleKey as DomainRoleKey } from "@/types/domain";
import { RoleKey } from "@prisma/client";

const prisma = getPrisma();

// ── Public types ──────────────────────────────────────────────────────────────

export { parseReportFormat };

export interface ReportDownload {
  content: string | Buffer | Uint8Array;
  format: ReportFormat;
  filename: string;
  definition: ReportDefinition;
  access: ReportAccessContext;
  fallbackReason?: string;
}

// ── Display config for DownloadReports component ──────────────────────────────

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

export function getAvailableReportsForRoles(roles: string[]) {
  const actorRole = pickActorRole(roles);
  if (!actorRole) return [];
  return Object.values(REPORT_DEFINITIONS).filter((definition) => definition.allowedRoles.includes(actorRole));
}

// ── Download ──────────────────────────────────────────────────────────────────

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

// ── Preview ───────────────────────────────────────────────────────────────────

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
      case "final_cohort":
        return fetchFinalCohortData(access.scope);
      case "weekly_cohort":
        return fetchWeeklyCohortData(access.scope);
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

// ── User helpers ──────────────────────────────────────────────────────────────

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

// ── Dashboard ─────────────────────────────────────────────────────────────────

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
