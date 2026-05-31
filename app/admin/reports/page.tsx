import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { ReportDesigner } from "@/components/lms/report-designer";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getDisplayReportsForRole } from "@/server/modules/reports/service";
import { getAdminReportsPageData } from "@/server/modules/page-data/service";
import type { DashboardMetric } from "@/types/domain";

export const metadata = {
  title: "Отчёты — Администрирование",
  description: "Генерация и просмотр отчётов.",
};


export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await requireRolePage(["admin"]);

  const {
    totalUsers,
    totalEnrollments,
    completedCourses,
    certsCount,
    publishedCourses,
    draftCourses,
    openRisks,
    pendingReviews,
    coursesChart,
  } = await getAdminReportsPageData();
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
        <ReportDesigner userRoles={user.roles} />
      </div>

      {/* Quick download */}
      <DownloadReports reports={getDisplayReportsForRole(user.roles)} />
    </AppShell>
  );
}
