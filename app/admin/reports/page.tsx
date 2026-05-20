import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { ReportDesigner } from "@/components/lms/report-designer";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getPrisma } from "@/lib/prisma";
import { QUERY_LIMITS } from "@/lib/query-limits";
import { CourseStatus, ProgressStatus, SubmissionStatus } from "@prisma/client";
import type { DashboardMetric } from "@/types/domain";

const prisma = getPrisma();

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRolePage(["admin"]);

  const [
    totalUsers,
    totalEnrollments,
    completedCourses,
    certsCount,
    courseStats,
    progressByCourse,
    completedByCourse,
    publishedCourses,
    draftCourses,
    openRisks,
    pendingReviews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.courseProgress.count({ where: { status: ProgressStatus.COMPLETED } }),
    prisma.certificate.count(),
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { title: "asc" },
      take: QUERY_LIMITS.reportSummaryCourses,
    }),
    prisma.courseProgress.groupBy({
      by: ["courseId"],
      _avg: { percent: true },
    }),
    prisma.courseProgress.groupBy({
      by: ["courseId"],
      where: { status: ProgressStatus.COMPLETED },
      _count: { _all: true },
    }),
    prisma.course.count({ where: { status: CourseStatus.PUBLISHED } }),
    prisma.course.count({ where: { status: CourseStatus.DRAFT } }),
    prisma.riskFlag.count({ where: { status: "open", resolvedAt: null } }),
    prisma.assignmentSubmission.count({
      where: { status: { in: [SubmissionStatus.SUBMITTED, SubmissionStatus.IN_REVIEW] } },
    }),
  ]);

  const avgProgressByCourse = new Map(progressByCourse.map((row) => [row.courseId, Math.round(row._avg.percent ?? 0)]));
  const completedCountByCourse = new Map(completedByCourse.map((row) => [row.courseId, row._count._all]));

  const coursesChart = courseStats.map((c) => {
    const completed = completedCountByCourse.get(c.id) ?? 0;
    const avgProgress = avgProgressByCourse.get(c.id) ?? 0;
    return { label: c.title, value: avgProgress, sublabel: `${completed}/${c._count.enrollments} завершили`, color: avgProgress > 75 ? "#16a34a" : avgProgress > 40 ? "#ca8a04" : "#dc2626" };
  });
  const metrics = [
    {
      label: "Пользователей",
      value: totalUsers,
      tone: "primary",
      detail: `${totalEnrollments} активных зачислений`,
      href: "/admin/users",
    },
    {
      label: "Курсы",
      value: publishedCourses,
      tone: publishedCourses > 0 ? "success" : "neutral",
      detail: `${draftCourses} черновиков`,
      href: "/admin/courses",
    },
    {
      label: "Завершили курс",
      value: completedCourses,
      tone: "info",
      detail: `${certsCount} сертификатов`,
    },
    {
      label: "Открытые риски",
      value: openRisks,
      tone: openRisks > 0 ? "danger" : "success",
      detail: "По всей академии",
      priority: openRisks > 10 ? "critical" : openRisks > 0 ? "elevated" : "normal",
      href: "/super-curator/risks",
    },
    {
      label: "Очередь проверок",
      value: pendingReviews,
      tone: pendingReviews > 0 ? "warning" : "success",
      detail: "Работы на контроле",
      priority: pendingReviews > 20 ? "critical" : pendingReviews > 0 ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="admin">
      <PageHeader title="Отчёты" description="Просмотр и экспорт статистики платформы." />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      {/* Progress chart — M3 */}
      <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mb-6">
        <CardHeader>
          <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по курсам</CardTitle>
          <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart items={coursesChart} />
        </CardContent>
      </Card>

      {/* Report designer */}
      <div className="mb-6">
        <ReportDesigner />
      </div>

      {/* Quick download */}
      <DownloadReports reports={[
        {
          id: "progress",
          title: "Прогресс по курсам",
          desc: "Все зачисления и прогресс слушателей",
          icon: "group",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Где отстает обучение и какие курсы требуют внимания.",
        },
        {
          id: "risk",
          title: "Риски слушателей",
          desc: "Неактивные, просроченные, отстающие",
          icon: "warning",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Какие риски нужно разобрать по потокам и курсам.",
        },
        {
          id: "assignments",
          title: "Задания",
          desc: "Отправки, статусы проверки и баллы",
          icon: "checklist",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Где накапливается очередь проверки.",
        },
        {
          id: "certificates",
          title: "Сертификаты",
          desc: "Все выпущенные сертификаты",
          icon: "verified",
          owner: "Admin",
          scope: "Вся академия",
          decision: "Какие сертификаты выпущены и по каким курсам.",
        },
        {
          id: "curator_workload",
          title: "Нагрузка кураторов",
          desc: "Очереди, риски и закрепленные слушатели",
          icon: "trending_up",
          owner: "Super curator operations",
          scope: "Вся академия",
          decision: "Где перегрузка и кого нужно перераспределить.",
        },
      ]} />
    </AppShell>
  );
}
