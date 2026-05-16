import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

export interface ObserverScope {
  /** Reserved for an explicit future all-data observer mode. Default production behavior is scoped-only. */
  isUnrestricted: boolean;
  /** Project IDs the observer is linked to via ObserverProject. */
  projectIds: string[];
  /** Cohort IDs the observer can view through direct ObserverCohort links and linked projects. */
  cohortIds: string[];
}

/**
 * Resolve which projects and cohorts a customer observer may view.
 *
 * Production privacy rule: no ObserverProject/ObserverCohort links means no
 * private student, certificate, or report data is visible.
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
    return { isUnrestricted: false, projectIds: [], cohortIds: [] };
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
 * Return the student userIds an observer may see in reports/exports.
 * Returns [] when no explicit scope is configured or scope resolves to no cohorts.
 */
export async function getScopedStudentIdsForObserver(observerId: string): Promise<string[] | undefined> {
  const scope = await getObserverScope(observerId);
  if (scope.cohortIds.length === 0) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: { cohortId: { in: scope.cohortIds } },
    select: { userId: true },
  });
  return Array.from(new Set(enrollments.map((e) => e.userId)));
}
