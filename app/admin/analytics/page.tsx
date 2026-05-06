import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { DashboardMetric } from "@/types/domain";

const ANALYTICS_METRICS: DashboardMetric[] = [
  { label: "Активных пользователей", value: 156, tone: "primary" },
  { label: "Средний прогресс", value: "62%", tone: "success" },
  { label: "Завершивших курс", value: 34, tone: "info" },
  { label: "Сертификатов выдано", value: 28, tone: "warning" },
];

const COURSE_STATS = [
  { title: "AI Strategy Fundamentals", enrolled: 85, completed: 20, avgProgress: 54 },
  { title: "Prompt Engineering for Leaders", enrolled: 45, completed: 12, avgProgress: 68 },
  { title: "Data Privacy & AI Governance", enrolled: 26, completed: 2, avgProgress: 22 },
];

export default function AdminAnalyticsPage() {
  return (
    <AppShell role="admin">
      <PageHeader title="Аналитика" description="Активность пользователей, завершения курсов, тесты и экспорт." badge="Администратор" />
      <div className="space-y-6">
        <MetricGrid metrics={ANALYTICS_METRICS} />
        <Tabs tabs={[
          {
            label: "По курсам",
            content: (
              <div className="space-y-3">
                {COURSE_STATS.map((c) => (
                  <Card key={c.title} className="transition-shadow hover:shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{c.title}</p>
                        <span className="text-xs text-muted-foreground">{c.enrolled} зачислено · {c.completed} завершено</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={c.avgProgress} className="flex-1" />
                        <span className="text-sm font-medium w-10 text-right">{c.avgProgress}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            label: "По пользователям",
            content: (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <p className="text-sm">Детальная аналитика по пользователям будет доступна в следующем обновлении.</p>
                </CardContent>
              </Card>
            ),
          },
        ]} />
      </div>
    </AppShell>
  );
}
