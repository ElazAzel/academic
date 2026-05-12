import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface ObserverScope {
  /** Observer has no project/cohort restrictions configured — sees all data. */
  isUnrestricted: boolean;
  /** Project IDs the observer is linked to (via ObserverProject). */
  projectIds: string[];
  /** Cohort IDs the observer can view (direct ObserverCohort + cohorts of linked projects). */
  cohortIds: string[];
}

/**
 * Resolve observer scope: which projects and cohorts they may view.
 *
 * Rules:
 *  - If the observer has neither `ObserverProject` nor `ObserverCohort` rows,
 *    they are treated as `isUnrestricted` (legacy behaviour for not-yet-onboarded
 *    accounts). This keeps existing demo data working while we roll out the model.
 *  - If they have one or more rows, scope is restricted to the union of:
 *      * cohorts directly linked via `ObserverCohort`
 *      * cohorts whose `projectId` matches an `ObserverProject` link
 */
export async function getObserverScope(observerId: string): Promise<ObserverScope> {
  const [projectLinks, cohortLinks] = await Promise.all([
    prisma.observerProject.findMany({
      where: { userId: observerId },
      select: { projectId: true },
    }),
    prisma.observerCohort.findMany({
      where: { userId: observerId },
      select: { cohortId: true },
    }),
  ]);

  const projectIds = projectLinks.map((p) => p.projectId).filter((v): v is string => v !== null);
  const directCohortIds = cohortLinks.map((c) => c.cohortId);

  if (projectIds.length === 0 && directCohortIds.length === 0) {
    return { isUnrestricted: true, projectIds: [], cohortIds: [] };
  }

  let projectCohortIds: string[] = [];
  if (projectIds.length > 0) {
    const cohorts = await prisma.cohort.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });
    projectCohortIds = cohorts.map((c) => c.id);
  }

  const cohortIds = Array.from(new Set([...directCohortIds, ...projectCohortIds]));

  return { isUnrestricted: false, projectIds, cohortIds };
}

/**
 * Return the list of student userIds an observer may see in reports/exports.
 * Returns `undefined` when scope is unrestricted (caller should treat as "all").
 * Returns `[]` when scope is restricted but resolves to no cohorts (no data visible).
 */
export async function getScopedStudentIdsForObserver(observerId: string): Promise<string[] | undefined> {
  const scope = await getObserverScope(observerId);
  if (scope.isUnrestricted) return undefined;
  if (scope.cohortIds.length === 0) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: { in: scope.cohortIds } },
    select: { userId: true },
  });
  return Array.from(new Set(enrollments.map((e) => e.userId)));
}
