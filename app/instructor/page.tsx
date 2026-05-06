import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid, CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getInstructorMetrics, MOCK_COURSES } from "@/lib/mock-data";

export default function InstructorDashboardPage() {
  const metrics = getInstructorMetrics();
  const myCourses = MOCK_COURSES.filter((c) => c.instructors.some((i) => i.id === "u-instr1"));

  return (
    <AppShell role="instructor">
      <PageHeader title="Дашборд преподавателя" description="Ваши курсы, модули, уроки и аналитика." badge="Преподаватель" />
      <div className="space-y-6">
        <MetricGrid metrics={metrics} />
        <Tabs tabs={[
          { label: "Мои курсы", content: <CourseManageGrid courses={myCourses} /> },
          {
            label: "Аналитика",
            content: (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Прогресс по курсам</CardTitle>
                  <CardDescription>Средний прогресс всех слушателей</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myCourses.map((c) => (
                    <div key={c.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span>{c.title}</span>
                        <span className="font-medium">38%</span>
                      </div>
                      <Progress value={38} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ),
          },
          {
            label: "Вопросы от кураторов",
            content: (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Нет переданных вопросов от кураторов.</CardContent></Card>
            ),
          },
        ]} />
      </div>
    </AppShell>
  );
}
