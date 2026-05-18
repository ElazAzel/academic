import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
import { Icon } from "@/components/ui/icon";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorReportData } from "@/server/actions/super-curator";

export const dynamic = "force-dynamic";

export default async function SuperCuratorReportsPage() {
  await requireRolePage(["super_curator", "admin"]);
  const data = await getSuperCuratorReportData();

  const totalStudents = data.reduce((s, c) => s + c.totalStudents, 0);
  const totalCompleted = data.reduce((s, c) => s + c.completed, 0);
  const totalAtRisk = data.reduce((s, c) => s + (c.blocked + c.notStarted), 0);
  const avgProgress = data.length > 0 ? Math.round(data.reduce((s, c) => s + c.avgProgress, 0) / data.length) : 0;

  return (
    <AppShell role="super_curator">
      <PageHeader
        title="Отчёты"
        description="Просмотр и экспорт статистики по потокам в CSV, Excel или PDF."
      />

      {/* Summary metrics — M3 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20"><Icon name="group" className="text-[22px] text-m3-primary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{totalStudents}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Всего слушателей</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-primary-container/20"><Icon name="trending_up" className="text-[22px] text-m3-primary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{totalCompleted}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Завершили</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-error-container/20"><Icon name="warning" className="text-[22px] text-m3-error" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{totalAtRisk}</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Требуют внимания</p></div>
          </CardContent>
        </Card>
        <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 hover:shadow-m3-medium">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-m3-tertiary-container/20"><Icon name="schedule" className="text-[22px] text-m3-tertiary" /></span>
            <div><p className="font-display-lg text-m3-headline-large text-m3-on-surface">{avgProgress}%</p><p className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний прогресс</p></div>
          </CardContent>
        </Card>
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
                          <div key={c.cohortId} className="rounded-xl border border-m3-outline-variant bg-m3-surface-container-low p-4 space-y-2">
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
                <DownloadReports reports={[
                  {
                    id: "progress",
                    title: "Экспорт прогресса",
                    desc: "Скачать отчёт по прогрессу",
                    icon: "trending_up",
                    owner: "Super curator",
                    scope: "Только потоки, кураторы и слушатели в зоне ответственности",
                    decision: "Какие потоки проседают и где нужна операционная поддержка.",
                  },
                  {
                    id: "curator_workload",
                    title: "Нагрузка кураторов",
                    desc: "Очереди, риски и закрепления",
                    icon: "group",
                    owner: "Super curator",
                    scope: "Только кураторы и потоки в зоне ответственности",
                    decision: "Где перегрузка и кого нужно перераспределить.",
                  },
                ]} />
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

                <DownloadReports reports={[
                  {
                    id: "risk",
                    title: "Экспорт рисков",
                    desc: "Скачать отчёт по рискам",
                    icon: "warning",
                    owner: "Super curator",
                    scope: "Только потоки и слушатели в зоне ответственности",
                    decision: "Какие риски нужно эскалировать или перераспределить.",
                  },
                  {
                    id: "assignments",
                    title: "Задания",
                    desc: "Очередь проверки по зоне ответственности",
                    icon: "checklist",
                    owner: "Super curator",
                    scope: "Только потоки и слушатели в зоне ответственности",
                    decision: "Где копятся работы и какой куратор перегружен.",
                  },
                ]} />
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
