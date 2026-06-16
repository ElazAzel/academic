"use server";

import { withQueryFallback } from "./shared";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/page-guards";
import type { DashboardMetric } from "@/types/domain";

export async function getCustomerObserverDashboard() {
  const user = await requireRole(["customer_observer"]);
  const { getObserverScope, getScopedStudentIdsForObserver } = await import("@/server/modules/observer/scope");

  return withQueryFallback(async () => {
    const scope = await getObserverScope(user.id);
    const scopedStudentIds = await getScopedStudentIdsForObserver(user.id);

    const cohortFilter = { id: { in: scope.cohortIds } };
    const projectFilter = { id: { in: scope.projectIds } };
    const certFilter = { userId: { in: scopedStudentIds ?? [] } };
    const progressFilter = { userId: { in: scopedStudentIds ?? [] } };

    const [projects, cohorts, certCount, progressAgg, openRisksCount, artifacts] = await Promise.all([
      prisma.project.count({ where: projectFilter }),
      prisma.cohort.findMany({
        where: cohortFilter,
        include: {
          course: { select: { title: true } },
          enrollments: {
            include: { courseProgress: { select: { percent: true } } },
          },
        },
      }),
      prisma.certificate.count({ where: certFilter }),
      prisma.courseProgress.aggregate({ _avg: { percent: true }, where: progressFilter }),
      prisma.riskFlag.count({ where: { userId: { in: scopedStudentIds ?? [] }, status: "open", resolvedAt: null } }),
      prisma.assignmentSubmission.findMany({
        where: {
          userId: { in: scopedStudentIds ?? [] },
          status: "ACCEPTED",
          metadata: { path: "$.showInReport", equals: true },
        } as any,
        include: {
          assignment: { select: { title: true, courseId: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 50,
      }),
    ]);

    const avgProgress = Math.round(progressAgg._avg.percent ?? 0);
    const cohortSummaries = cohorts.map((c) => ({
      id: c.id,
      name: c.name,
      courseId: c.courseId,
      courseTitle: c.course?.title ?? "",
      studentsCount: c.enrollments.length,
      avgProgress: c.enrollments.length > 0
        ? Math.round(
            c.enrollments.reduce((sum, e) => sum + (e.courseProgress[0]?.percent ?? 0), 0) /
              c.enrollments.length
          )
        : 0,
      status: c.status,
    }));

    const totalStudents = cohortSummaries.reduce((sum, cohort) => sum + cohort.studentsCount, 0);
    const stuckCohorts = cohortSummaries.filter((cohort) => cohort.avgProgress < 40 && cohort.studentsCount > 0).length;

    const metrics: DashboardMetric[] = [
      {
        label: "Проекты",
        value: projects,
        tone: "primary",
        detail: `${cohortSummaries.length} потоков в доступе`,
      },
      {
        label: "Слушатели",
        value: totalStudents,
        tone: totalStudents > 0 ? "info" : "neutral",
      },
      {
        label: "Прогресс",
        value: `${avgProgress}%`,
        tone: avgProgress >= 70 ? "success" : avgProgress >= 40 ? "warning" : "danger",
        detail: `${stuckCohorts} потоков ниже 40%`,
        priority: stuckCohorts > 0 ? "elevated" : "normal",
      },
      {
        label: "Открытые риски",
        value: openRisksCount,
        tone: openRisksCount > 0 ? "warning" : "success",
        priority: openRisksCount > 0 ? "elevated" : "normal",
      },
      {
        label: "Сертификаты",
        value: certCount,
        tone: "success",
      },
    ];

    return { metrics, cohorts: cohortSummaries, artifacts };
  }, null);
}
