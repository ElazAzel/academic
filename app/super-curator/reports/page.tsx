import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { BarChart } from "@/components/lms/bar-chart";
import { Download, FileSpreadsheet, FileText, TrendingUp, Users, AlertTriangle, Clock } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getSuperCuratorReportData } from "@/server/actions/super-curator";

const FORMATS = [
  { id: "csv" as const, label: "CSV", icon: FileText },
  { id: "xlsx" as const, label: "Excel", icon: FileSpreadsheet },
  { id: "pdf" as const, label: "PDF", icon: FileText },
];

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

      {/* Summary metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Users className="h-5 w-5 text-primary" /></span>
            <div><p className="text-2xl font-bold">{totalStudents}</p><p className="text-xs text-muted-foreground">Всего слушателей</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><TrendingUp className="h-5 w-5 text-emerald-600" /></span>
            <div><p className="text-2xl font-bold">{totalCompleted}</p><p className="text-xs text-muted-foreground">Завершили</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><AlertTriangle className="h-5 w-5 text-amber-600" /></span>
            <div><p className="text-2xl font-bold">{totalAtRisk}</p><p className="text-xs text-muted-foreground">Требуют внимания</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"><Clock className="h-5 w-5 text-blue-600" /></span>
            <div><p className="text-2xl font-bold">{avgProgress}%</p><p className="text-xs text-muted-foreground">Средний прогресс</p></div>
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
                {/* Chart */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Прогресс по потокам</CardTitle>
                    <CardDescription>Средний процент завершения курсов по потокам</CardDescription>
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

                {/* Status breakdown per cohort */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Статусы по потокам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.map((c) => {
                        const total = c.totalStudents || 1;
                        return (
                          <div key={c.cohortId} className="rounded-xl border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{c.cohortName}</p>
                              <Badge className={c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}>
                                {c.status === "active" ? "Активен" : "Архив"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.courseTitle}</p>
                            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                              <div className="bg-emerald-500" style={{ width: `${(c.completed / total) * 100}%` }} title="Завершили" />
                              <div className="bg-blue-500" style={{ width: `${(c.inProgress / total) * 100}%` }} title="В процессе" />
                              <div className="bg-amber-500" style={{ width: `${(c.notStarted / total) * 100}%` }} title="Не начали" />
                              <div className="bg-red-500" style={{ width: `${(c.blocked / total) * 100}%` }} title="Заблокированы" />
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                              <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{c.completed} завершили</span>
                              <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />{c.inProgress} в процессе</span>
                              <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />{c.notStarted} не начали</span>
                              <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />{c.blocked} заблокированы</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span>Кураторов: {c.curatorCount}</span>
                              <span>Средний: {c.avgProgress}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Download */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Экспорт</CardTitle>
                    <CardDescription>Скачать отчёт по прогрессу</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {FORMATS.map((fmt) => {
                        const FmtIcon = fmt.icon;
                        return (
                          <a
                            key={fmt.id}
                            href={`/api/v1/reports?type=progress&format=${fmt.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/5 hover:border-primary/30"
                          >
                            <FmtIcon className="h-4 w-4" />
                            {fmt.label}
                            <Download className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            label: "Риски",
            content: (
              <div className="space-y-6">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Риски по потокам</CardTitle>
                    <CardDescription>Слушатели, требующие внимания кураторов</CardDescription>
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

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Экспорт</CardTitle>
                    <CardDescription>Скачать отчёт по рискам</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {FORMATS.map((fmt) => {
                        const FmtIcon = fmt.icon;
                        return (
                          <a
                            key={fmt.id}
                            href={`/api/v1/reports?type=risk&format=${fmt.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/5 hover:border-primary/30"
                          >
                            <FmtIcon className="h-4 w-4" />
                            {fmt.label}
                            <Download className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                          </a>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
