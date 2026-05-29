import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { ReportDesigner } from "@/components/lms/report-designer";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorReportData } from "@/server/actions/super-curator";
import { getDisplayReportsForRole } from "@/server/modules/reports/service";
import type { DashboardMetric } from "@/types/domain";

export const metadata = {
  title: "Отчёты — Супер-куратор",
  description: "Отчёты по работе кураторов.",
};


export const dynamic = "force-dynamic";

export default async function SuperCuratorReportsPage() {
  const user = await requireRolePage(["super_curator", "admin"]);
  const data = await getSuperCuratorReportData();

  const totalStudents = data.reduce((s, c) => s + c.totalStudents, 0);
  const totalCompleted = data.reduce((s, c) => s + c.completed, 0);
  const totalAtRisk = data.reduce((s, c) => s + (c.blocked + c.notStarted), 0);
  const avgProgress = data.length > 0 ? Math.round(data.reduce((s, c) => s + c.avgProgress, 0) / data.length) : 0;
  const activeCohorts = data.filter((c) => c.status === "active").length;
  const problemCohorts = data.filter((c) => c.blocked + c.notStarted > 5 || c.avgProgress < 40).length;
  const metrics = [
    {
      label: "Слушателей",
      value: totalStudents,
      tone: "primary",
      detail: `${activeCohorts} активных потоков`,
    },
    {
      label: "Завершили",
      value: totalCompleted,
      tone: "success",
      detail: totalStudents > 0 ? `${Math.round((totalCompleted / totalStudents) * 100)}% от базы` : "Нет зачислений",
    },
    {
      label: "Требуют внимания",
      value: totalAtRisk,
      tone: totalAtRisk > 0 ? "danger" : "success",
      detail: `${problemCohorts} проблемных потоков`,
      priority: totalAtRisk > 0 ? "elevated" : "normal",
      href: "/super-curator/reports?tab=risks",
    },
    {
      label: "Средний прогресс",
      value: `${avgProgress}%`,
      tone: avgProgress >= 70 ? "success" : avgProgress >= 40 ? "warning" : "danger",
      detail: "По потокам зоны",
      priority: avgProgress < 40 && totalStudents > 0 ? "elevated" : "normal",
    },
  ] satisfies DashboardMetric[];

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Отчёты"
        description="Просмотр и экспорт статистики по потокам в CSV, Excel или PDF."
      />

      <div className="mb-6">
        <MetricGrid metrics={metrics} />
      </div>

      {/* Report designer */}
      <div className="mb-6">
        <ReportDesigner userRoles={user.roles} defaultType="progress" />
      </div>

      <Tabs
        paramName="tab"
        tabs={[
          {
            label: "Прогресс по потокам",
            content: (
              <div className="space-y-6">
                {/* Chart — M3 */}
                <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по потокам</CardTitle>
                    <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент завершения курсов по потокам</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={data.map((c) => ({
                        label: c.cohortName,
                        value: c.avgProgress,
                        sublabel: c.courseTitle,
                        color: c.avgProgress > 75 ? "#16a34a" : c.avgProgress > 40 ? "#ca8a04" : "#dc2626",
                      }))}
                    />
                  </CardContent>
                </Card>

                {/* Status breakdown per cohort — M3 */}
                <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Статусы по потокам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.map((c) => {
                        const total = c.totalStudents || 1;
                        return (
                          <div key={c.cohortId} className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-label-md text-label-md text-m3-on-surface">{c.cohortName}</p>
                              <Badge variant={c.status === "active" ? "default" : "secondary"}>
                                {c.status === "active" ? "Активен" : "Архив"}
                              </Badge>
                            </div>
                            <p className="font-body-sm text-body-sm text-m3-on-surface-variant">{c.courseTitle}</p>
                            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-m3-surface-variant">
                              <div className="bg-m3-primary" style={{ width: `${(c.completed / total) * 100}%` }} title="Завершили" />
                              <div className="bg-m3-tertiary" style={{ width: `${(c.inProgress / total) * 100}%` }} title="В процессе" />
                              <div className="bg-m3-secondary" style={{ width: `${(c.notStarted / total) * 100}%` }} title="Не начали" />
                              <div className="bg-m3-error" style={{ width: `${(c.blocked / total) * 100}%` }} title="Заблокированы" />
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 font-body-sm text-body-sm text-m3-on-surface-variant">
                              <span><span className="inline-block w-2 h-2 rounded-full bg-m3-primary mr-1" />{c.completed} завершили</span>
                              <span><span className="inline-block w-2 h-2 rounded-full bg-m3-tertiary mr-1" />{c.inProgress} в процессе</span>
                              <span><span className="inline-block w-2 h-2 rounded-full bg-m3-secondary mr-1" />{c.notStarted} не начали</span>
                              <span><span className="inline-block w-2 h-2 rounded-full bg-m3-error mr-1" />{c.blocked} заблокированы</span>
                            </div>
                            <div className="flex items-center justify-between font-body-sm text-body-sm text-m3-on-surface-variant pt-1">
                              <span className="flex items-center gap-1"><Icon name="badge" className="text-[14px]" /> Кураторов: {c.curatorCount}</span>
                              <span>Средний: {c.avgProgress}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Download */}
                <DownloadReports reports={getDisplayReportsForRole(user.roles).filter((r) => ["progress", "curator_workload"].includes(r.id))} />
              </div>
            ),
          },
          {
            label: "Риски",
            content: (
              <div className="space-y-6">
                <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Риски по потокам</CardTitle>
                    <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Слушатели, требующие внимания кураторов</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={data.map((c) => ({
                        label: c.cohortName,
                        value: c.blocked + c.notStarted,
                        sublabel: `${c.completed} завершили / ${c.inProgress} в процессе`,
                        color: (c.blocked + c.notStarted) > 5 ? "#dc2626" : "#ca8a04",
                      }))}
                    />
                  </CardContent>
                </Card>

                <DownloadReports reports={getDisplayReportsForRole(user.roles).filter((r) => ["risk", "assignments"].includes(r.id))} />
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
