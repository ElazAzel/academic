import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCustomerObserverDashboard } from "@/server/actions/dashboard";

export const dynamic = "force-dynamic";

export default async function CustomerObserverReportsPage() {
  await requireRolePage(["customer_observer"]);
  const data = await getCustomerObserverDashboard();

  return (
    <AppShell role="customer_observer">
      <PageHeader title="Отчёты" description="Просмотр и экспорт статистики по доступным потокам." />

      {data && data.cohorts.length > 0 ? (
        <div className="space-y-6">
          {/* Metrics — M3 */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
              <CardContent className="p-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20">
                  <Icon name="group" className="text-[22px] text-m3-primary" />
                </span>
                <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{data.cohorts.length}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Потоков</p></div>
              </CardContent>
            </Card>
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
              <CardContent className="p-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20">
                  <Icon name="trending_up" className="text-[22px] text-m3-primary" />
                </span>
                <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{data.cohorts.reduce((s, c) => s + c.studentsCount, 0)}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Слушателей</p></div>
              </CardContent>
            </Card>
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
              <CardContent className="p-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-tertiary-container/20">
                  <Icon name="trending_up" className="text-[22px] text-m3-tertiary" />
                </span>
                <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{data.metrics.find((m) => m.label === "Прогресс")?.value ?? "—"}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний прогресс</p></div>
              </CardContent>
            </Card>
            <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
              <CardContent className="p-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-secondary-container/20">
                  <Icon name="verified" className="text-[22px] text-m3-secondary" />
                </span>
                <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{data.metrics.find((m) => m.label === "Сертификаты")?.value ?? 0}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Сертификатов</p></div>
              </CardContent>
            </Card>
          </div>

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
      <DownloadReports reports={[
        {
          id: "progress",
          title: "Прогресс по потокам",
          desc: "Зачисления и прогресс",
          icon: "group",
          owner: "Customer observer",
          scope: "Только разрешенные проекты и потоки",
          decision: "Как идет обучение в доступной клиентской зоне.",
        },
        {
          id: "risk",
          title: "Риски слушателей",
          desc: "Неактивные и отстающие",
          icon: "warning",
          owner: "Customer observer",
          scope: "Только разрешенные проекты и потоки",
          decision: "Где требуется управленческое внимание без права вмешательства.",
        },
        {
          id: "certificates",
          title: "Сертификаты",
          desc: "Все выпущенные",
          icon: "verified",
          owner: "Customer observer",
          scope: "Только разрешенные проекты и потоки",
          decision: "Какие участники подтвердили завершение обучения.",
        },
      ]} />
    </AppShell>
  );
}
