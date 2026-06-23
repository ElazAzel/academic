import { ApiError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { pickActorRole, unique } from "@/server/modules/reports/definitions";
import { getObserverScope, getScopedStudentIdsForObserver } from "@/server/modules/observer/scope";
import { getSuperCuratorScope } from "@/server/modules/super-curator/scope";
import type { ReportDataScope } from "@/lib/reports/types";
import type { AppSessionUser, RoleKey as DomainRoleKey } from "@/types/domain";

const prisma = getPrisma();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportAccessContext {
  actorRole: DomainRoleKey;
  scope: ReportDataScope;
  scopeLabel: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCourseIdsForCohorts(cohortIds: string[]) {
  if (cohortIds.length === 0) return [];
  const cohorts = await prisma.cohort.findMany({
    where: { id: { in: cohortIds } },
    select: { courseId: true },
  });
  return unique(cohorts.map((cohort) => cohort.courseId).filter((id): id is string => Boolean(id)));
}

// ── Scope resolution ──────────────────────────────────────────────────────────

export async function resolveReportScope(user: Pick<AppSessionUser, "id" | "roles">): Promise<ReportAccessContext> {
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

// ── Cache keys ────────────────────────────────────────────────────────────────

export function scopeCacheKey(access: ReportAccessContext) {
  const { scope } = access;
  return [
    access.actorRole,
    scope.studentIds?.join(".") ?? "all-students",
    scope.courseIds?.join(".") ?? "all-courses",
    scope.cohortIds?.join(".") ?? "all-cohorts",
    scope.curatorIds?.join(".") ?? "all-curators",
  ].join(":");
}

export function fieldsCacheKey(fields?: string[]) {
  return fields && fields.length > 0 ? fields.join(".") : "all-fields";
}
