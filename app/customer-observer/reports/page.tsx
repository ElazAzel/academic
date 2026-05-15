import { TrendingUp, Users, Award } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/lms/bar-chart";
import { DownloadReports } from "@/components/lms/download-reports";
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
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div><p className="text-2xl font-bold">{data.cohorts.length}</p><p className="text-xs text-muted-foreground">Потоков</p></div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div><p className="text-2xl font-bold">{data.cohorts.reduce((s, c) => s + c.studentsCount, 0)}</p><p className="text-xs text-muted-foreground">Слушателей</p></div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div><p className="text-2xl font-bold">{data.metrics.find((m) => m.label === "Прогресс")?.value ?? "—"}</p><p className="text-xs text-muted-foreground">Средний прогресс</p></div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <Award className="h-5 w-5 text-amber-600" />
                <div><p className="text-2xl font-bold">{data.metrics.find((m) => m.label === "Сертификаты")?.value ?? 0}</p><p className="text-xs text-muted-foreground">Сертификатов</p></div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Прогресс по потокам</CardTitle>
              <CardDescription>Средний процент прохождения</CardDescription>
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
        <Card className="rounded-2xl mb-6">
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-sm">Нет данных для отображения.</p>
          </CardContent>
        </Card>
      )}

      {/* Download reports */}
      <DownloadReports reports={[
        { id: "progress", title: "Прогресс по потокам", desc: "Зачисления и прогресс", icon: Users },
        { id: "risk", title: "Риски слушателей", desc: "Неактивные и отстающие", icon: TrendingUp },
        { id: "certificates", title: "Сертификаты", desc: "Все выпущенные", icon: Award },
      ]} />
    </AppShell>
  );
}
