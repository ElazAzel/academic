import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCuratorReportData } from "@/server/actions/curator-enhanced";

const FORMATS = [
  { id: "csv" as const, label: "CSV", icon: FileText },
  { id: "xlsx" as const, label: "Excel", icon: FileSpreadsheet },
  { id: "pdf" as const, label: "PDF", icon: FileText },
];

export const dynamic = "force-dynamic";

export default async function CuratorReportsPage() {
  await requireRolePage(["curator"]);
  const data = await getCuratorReportData();

  return (
    <AppShell role="curator">
      <PageHeader
        title="Отчёты"
        description="Просмотр и экспорт статистики по вашим слушателям."
      />

      {data && data.total > 0 ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-2xl font-bold">{data.total}</p>
                <p className="text-xs text-muted-foreground">Слушателей</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-emerald-600">{data.completed}</p>
                <p className="text-xs text-muted-foreground">Завершили</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-blue-600">{data.inProgress}</p>
                <p className="text-xs text-muted-foreground">В процессе</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-2xl font-bold text-amber-600">{data.withRisks}</p>
                <p className="text-xs text-muted-foreground">С рисками</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-2xl font-bold">{data.avgProgress}%</p>
                <p className="text-xs text-muted-foreground">Средний прогресс</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress overview */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Общий прогресс</CardTitle>
              <CardDescription>Распределение слушателей по статусам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted mb-4">
                <div className="bg-emerald-500 transition-all" style={{ width: `${(data.completed / data.total) * 100}%` }} />
                <div className="bg-blue-500 transition-all" style={{ width: `${(data.inProgress / data.total) * 100}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${(data.notStarted / data.total) * 100}%` }} />
                <div className="bg-red-500 transition-all" style={{ width: `${(data.blocked / data.total) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" />{data.completed} завершили</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1" />{data.inProgress} в процессе</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" />{data.notStarted} не начали</span>
                <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1" />{data.blocked} заблокированы</span>
              </div>
            </CardContent>
          </Card>

          {/* By course */}
          {data.courseBreakdown.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Прогресс по курсам</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  items={data.courseBreakdown.map((c) => ({
                    label: c.course.length > 30 ? c.course.slice(0, 30) + "…" : c.course,
                    value: c.avg,
                    sublabel: `${c.completed}/${c.total} завершили`,
                    color: c.avg > 75 ? "#16a34a" : c.avg > 40 ? "#ca8a04" : "#dc2626",
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Download */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Экспорт</CardTitle>
              <CardDescription>Скачать отчёты в CSV, Excel или PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Прогресс слушателей</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((fmt) => {
                    const FmtIcon = fmt.icon;
                    return (
                      <a key={fmt.id} href={`/api/v1/reports?type=curator_progress&format=${fmt.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">
                        <FmtIcon className="h-4 w-4" />{fmt.label}<Download className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Риски слушателей</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((fmt) => {
                    const FmtIcon = fmt.icon;
                    return (
                      <a key={fmt.id} href={`/api/v1/reports?type=curator_risk&format=${fmt.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">
                        <FmtIcon className="h-4 w-4" />{fmt.label}<Download className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          <p className="text-sm">Нет данных для отображения.</p>
        </div>
      )}
    </AppShell>
  );
}
