import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getCustomerObserverDashboard } from "@/server/actions/dashboard";
import { getDisplayReportsForRole } from "@/server/modules/reports/service";

export const dynamic = "force-dynamic";

export default async function CustomerObserverReportsPage() {
  const user = await requireRolePage(["customer_observer"]);
  const data = await getCustomerObserverDashboard();

  return (
    <AppShell role="customer_observer">
      <PageHeader title="Отчёты" description="Просмотр и экспорт статистики по доступным потокам." />

      {data && data.cohorts.length > 0 ? (
        <div className="space-y-6">
          <MetricGrid metrics={data.metrics} />

          {/* Chart — M3 */}
          <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
            <CardHeader>
              <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по потокам</CardTitle>
              <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                items={data.cohorts.map((c) => ({
                  label: c.name,
                  value: c.avgProgress,
                  sublabel: `${c.studentsCount} слушателей`,
                  color: c.avgProgress > 75 ? "#16a34a" : c.avgProgress > 40 ? "#ca8a04" : "#dc2626",
                }))}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft mb-6">
          <CardContent className="py-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <Icon name="bar_chart" className="text-[40px] text-m3-on-surface-variant/40" />
              <p className="font-body-md text-body-md text-m3-on-surface-variant">Нет данных для отображения.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Download reports */}
      <DownloadReports reports={getDisplayReportsForRole(user.roles)} />
    </AppShell>
  );
}
