import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import type { DashboardMetric } from "@/types/domain";

const ANALYTICS: DashboardMetric[] = [
  { label: "Зачисленных", value: 85, tone: "primary" },
  { label: "Средний прогресс", value: "54%", tone: "success" },
  { label: "Завершивших", value: 20, tone: "info" },
  { label: "Средний балл тестов", value: "78%", tone: "warning" },
];

const MODULES = [
  { title: "Модуль 1: Стратегия AI", avgProgress: 82, completedStudents: 65 },
  { title: "Модуль 2: Практика", avgProgress: 45, completedStudents: 30 },
  { title: "Модуль 3: Финальный проект", avgProgress: 12, completedStudents: 5 },
];

export default function InstructorAnalyticsPage() {
  return (
    <AppShell role="instructor">
      <PageHeader title="Аналитика курса" description="Прогресс, тесты, задания и активность слушателей." badge="Преподаватель" />
      <div className="space-y-6">
        <MetricGrid metrics={ANALYTICS} />
        <Tabs tabs={[
          {
            label: "По модулям",
            content: (
              <div className="space-y-3">
                {MODULES.map((m) => (
                  <Card key={m.title} className="transition-shadow hover:shadow-sm">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{m.title}</p>
                        <span className="text-xs text-muted-foreground">{m.completedStudents} завершили</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={m.avgProgress} className="flex-1" />
                        <span className="text-sm font-medium w-10 text-right">{m.avgProgress}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            label: "По тестам",
            content: <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Аналитика по тестам будет доступна в следующем обновлении.</CardContent></Card>,
          },
        ]} />
      </div>
    </AppShell>
  );
}
