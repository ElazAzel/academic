import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { ReportDesigner } from "@/components/lms/report-designer";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDisplayReportsForRole } from "@/server/modules/reports/service";
import { getInstructorReportsPageData } from "@/server/modules/page-data/service";
import type { DashboardMetric } from "@/types/domain";

export const metadata = {
  title: "Отчёты — Инструктор",
  description: "Отчёты по успеваемости.",
};


export const dynamic = "force-dynamic";

export default async function InstructorReportsPage() {
  await requireRolePage(["instructor", "admin"]);
  const user = await getCurrentUser();
  if (!user) return null;

  const {
    courses,
    totalStudents,
    completed,
    avgProgress,
    forwardedQuestions,
    reviewBacklog,
    passRate,
  } = await getInstructorReportsPageData(user.id);
  const metrics = [
    {
      label: "Курсов",
      value: courses.length,
      tone: courses.length > 0 ? "primary" : "neutral",
      detail: `${totalStudents} активных слушателей`,
    },
    {
      label: "Завершили",
      value: completed,
      tone: "success",
      detail: totalStudents > 0 ? `${Math.round((completed / totalStudents) * 100)}% завершений` : "Нет зачислений",
    },
    {
      label: "Средний прогресс",
      value: `${avgProgress}%`,
      tone: avgProgress >= 70 ? "success" : avgProgress >= 40 ? "warning" : "danger",
      detail: "По курсам преподавателя",
    },
    {
      label: "Forwarded-вопросы",
      value: forwardedQuestions,
      tone: forwardedQuestions > 0 ? "warning" : "success",
      detail: "Переданы от кураторов",
      priority: forwardedQuestions > 0 ? "elevated" : "normal",
      href: "/instructor/questions",
    },
    {
      label: "Работы на проверке",
      value: reviewBacklog,
      tone: reviewBacklog > 0 ? "warning" : "success",
      detail: `Quiz pass rate ${passRate}%`,
      priority: reviewBacklog > 10 ? "critical" : reviewBacklog > 0 ? "elevated" : "normal",
      href: "/instructor/assignments",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="instructor">
      <PageHeader title="Отчёты" description="Просмотр и экспорт статистики по вашим курсам." />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      {courses.length > 0 && (
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mb-6">
          <CardHeader>
            <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по курсам</CardTitle>
            <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              items={courses.map((c) => {
                const enrollments = c._count.enrollments || 1;
                const avg = Math.round(c.courseProgress.reduce((s, p) => s + p.percent, 0) / enrollments);
                const compl = c.courseProgress.filter((p) => p.status === "COMPLETED").length;
                return {
                  label: c.title,
                  value: avg,
                  sublabel: `${compl}/${c._count.enrollments} завершили`,
                  color: avg > 75 ? "#16a34a" : avg > 40 ? "#ca8a04" : "#dc2626",
                };
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* Report designer */}
      <div className="mb-6">
        <ReportDesigner userRoles={user.roles} defaultType="progress" />
      </div>

      {/* Download reports */}
      <DownloadReports reports={getDisplayReportsForRole(user.roles)} />
    </AppShell>
  );
}
