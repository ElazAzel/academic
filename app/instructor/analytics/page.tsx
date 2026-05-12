import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { BarChart, DonutChart } from "@/components/lms/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { getInstructorAnalytics } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { isDemoModeEnabled } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export default async function InstructorAnalyticsPage() {
  await requireRolePage(["instructor"]);
  const data = await getInstructorAnalytics();
  const demoMode = isDemoModeEnabled();

  if (!data && !demoMode) {
    return (
      <AppShell role="instructor">
        <PageHeader title="Аналитика курса" description="Прогресс, тесты, задания и активность слушателей."/>
        <DashboardUnavailable/>
      </AppShell>
    );
  }

  const metrics = data?.metrics ?? [];
  const moduleAnalytics = data?.moduleAnalytics ?? [];
  const quizStats = data?.quizStats ?? [];

  return (
    <AppShell role="instructor">
      <PageHeader title="Аналитика курса" description="Прогресс, тесты, задания и активность слушателей."/>
      <div className="space-y-6">
        <MetricGrid metrics={metrics}/>
        <Tabs tabs={[
          {
            label: "По модулям",
            content: moduleAnalytics.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Прогресс по модулям</CardTitle>
                    <CardDescription>Средний процент прохождения</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={moduleAnalytics.map((m) => ({
                        label: m.title,
                        value: m.avgProgress,
                        sublabel: `${m.completedStudents} завершили`,
                      }))}
                    />
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Скачать отчёт:</span>
                  <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">CSV</a>
                  <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">Excel</a>
                  <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">PDF</a>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Общий прогресс</CardTitle>
                    <CardDescription>Среднее по всем модулям</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pt-4">
                    <DonutChart
                      value={moduleAnalytics.reduce((a, b) => a + b.avgProgress, 0) / Math.max(moduleAnalytics.length, 1)}
                      size={120}
                      strokeWidth={8}
                    />
                    <div className="space-y-1 text-center">
                      {moduleAnalytics.map((m) => (
                        <div key={m.title} className="flex items-center justify-between gap-4 text-xs">
                          <span className="text-muted-foreground truncate max-w-[100px]">{m.title}</span>
                          <span className="font-medium">{m.avgProgress}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground mr-1">Скачать отчёт:</span>
                  <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">CSV</a>
                  <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">Excel</a>
                  <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-primary/5 hover:border-primary/30">PDF</a>
                </div>
              </div>
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Данные по модулям отсутствуют.</CardContent></Card>
            ),
          },
          {
            label: "По тестам",
            content: quizStats.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Результаты тестов</CardTitle>
                    <CardDescription>Средний балл и количество попыток</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarChart
                      items={quizStats.map((q) => ({
                        label: q.title,
                        value: q.avgScore,
                        sublabel: `${q.passed}/${q.totalAttempts} сдано`,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Общая статистика</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="text-center">
                      <DonutChart
                        value={quizStats.reduce((a, b) => a + b.avgScore, 0) / Math.max(quizStats.length, 1)}
                        size={100}
                        strokeWidth={6}
                      />
                      <p className="text-xs text-muted-foreground mt-2">Средний балл</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {quizStats.map((q) => (
                        <div key={q.title} className="flex items-center justify-between">
                          <span className="text-muted-foreground truncate max-w-[140px]">{q.title}</span>
                          <span className="font-medium">{q.avgScore}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Нет данных по тестам.</CardContent></Card>
            ),
          },
        ]}/>
      </div>
    </AppShell>
  );
}
