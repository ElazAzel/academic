import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { BarChart, DonutChart } from "@/components/lms/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { getInstructorAnalytics } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { isDemoModeEnabled } from "@/lib/demo-mode";

export const metadata = {
  title: "Аналитика — Инструктор",
  description: "Аналитика по курсам и студентам.",
};


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
                <Card className="md:col-span-2 border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Прогресс по модулям</CardTitle>
                    <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний процент прохождения</CardDescription>
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
                  <span className="font-body-sm text-body-sm text-m3-on-surface-variant mr-1">Скачать отчёт:</span>
                  <a href="/api/v1/reports?type=progress&format=csv" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
                    <Icon name="download" className="text-[16px]" /> CSV
                  </a>
                  <a href="/api/v1/reports?type=progress&format=xlsx" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
                    <Icon name="download" className="text-[16px]" /> Excel
                  </a>
                  <a href="/api/v1/reports?type=progress&format=pdf" className="inline-flex items-center gap-1 rounded-lg border border-m3-outline-variant px-3 py-1.5 font-body-sm text-body-sm text-m3-on-surface transition-colors hover:bg-m3-surface-container-high hover:border-m3-primary/30">
                    <Icon name="download" className="text-[16px]" /> PDF
                  </a>
                </div>
                <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-md text-label-md text-m3-on-surface">Общий прогресс</CardTitle>
                    <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Среднее по всем модулям</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pt-4">
                    <DonutChart
                      value={moduleAnalytics.reduce((a, b) => a + b.avgProgress, 0) / Math.max(moduleAnalytics.length, 1)}
                      size={120}
                      strokeWidth={8}
                    />
                    <div className="space-y-1 text-center">
                      {moduleAnalytics.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-4 font-body-sm text-body-sm">
                          <span className="text-m3-on-surface-variant truncate max-w-[100px]">{m.title}</span>
                          <span className="font-label-md text-label-md text-m3-on-surface">{m.avgProgress}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-m3-outline-variant bg-m3-surface-container-lowest"><CardContent className="py-10 text-center font-body-md text-body-md text-m3-on-surface-variant">Данные по модулям отсутствуют.</CardContent></Card>
            ),
          },
          {
            label: "По тестам",
            content: quizStats.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">Результаты тестов</CardTitle>
                    <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant">Средний балл и количество попыток</CardDescription>
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
                <Card className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
                  <CardHeader>
                    <CardTitle className="font-label-md text-label-md text-m3-on-surface">Общая статистика</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="text-center">
                      <DonutChart
                        value={quizStats.reduce((a, b) => a + b.avgScore, 0) / Math.max(quizStats.length, 1)}
                        size={100}
                        strokeWidth={6}
                      />
                      <p className="font-body-sm text-body-sm text-m3-on-surface-variant mt-2">Средний балл</p>
                    </div>
                    <div className="space-y-2 font-body-sm text-body-sm">
                      {quizStats.map((q) => (
                        <div key={q.id} className="flex items-center justify-between">
                          <span className="text-m3-on-surface-variant truncate max-w-[140px]">{q.title}</span>
                          <span className="font-label-md text-label-md text-m3-on-surface">{q.avgScore}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-m3-outline-variant bg-m3-surface-container-lowest"><CardContent className="py-10 text-center font-body-sm text-body-sm text-m3-on-surface-variant">Нет данных по тестам.</CardContent></Card>
            ),
          },
        ]}/>
      </div>
    </AppShell>
  );
}
