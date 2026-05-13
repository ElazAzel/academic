"use server";

import { safeQuery } from "./shared";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/page-guards";
import type { DashboardMetric } from "@/types/domain";

export async function getCustomerObserverDashboard() {
  const user = await requireRole(["customer_observer"]);
  const { getObserverScope, getScopedStudentIdsForObserver } = await import("@/server/modules/observer/scope");

  return safeQuery(async () => {
    const scope = await getObserverScope(user.id);
    const scopedStudentIds = await getScopedStudentIdsForObserver(user.id);

    const cohortFilter = scope.isUnrestricted ? {} : { id: { in: scope.cohortIds } };
    const projectFilter = scope.isUnrestricted ? {} : { id: { in: scope.projectIds } };
    const certFilter = scopedStudentIds === undefined ? {} : { userId: { in: scopedStudentIds } };
    const progressFilter = scopedStudentIds === undefined ? {} : { userId: { in: scopedStudentIds } };

    const [projects, cohorts, certCount, progressAgg] = await Promise.all([
      scope.isUnrestricted ? prisma.project.count() : prisma.project.count({ where: projectFilter }),
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
    ]);

    const avgProgress = Math.round(progressAgg._avg.percent ?? 0);
    const cohortSummaries = cohorts.map((c) => ({
      id: c.id,
      name: c.name,
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

    const metrics: DashboardMetric[] = [
      { label: "Проекты", value: projects, tone: "primary" },
      { label: "Потоки", value: cohorts.length, tone: "info" },
      { label: "Прогресс", value: `${avgProgress}%`, tone: avgProgress > 50 ? "success" : "warning" },
      { label: "Сертификаты", value: certCount, tone: "success" },
    ];

    return { metrics, cohorts: cohortSummaries };
  }, null);
}
