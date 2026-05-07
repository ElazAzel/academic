import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid, CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getInstructorDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  await requireRolePage(["instructor"]);
  const data = await getInstructorDashboard();
  const demoMode = isDemoModeEnabled();

  if (!data && !demoMode) {
    return (
      <AppShell role="instructor">
        <PageHeader title="Дашборд преподавателя" description="Ваши курсы, модули, уроки и аналитика." badge="Преподаватель" />
        <DashboardUnavailable />
      </AppShell>
    );
  }

  const metrics = data?.metrics ?? [];
  const myCourses = data?.courses ?? [];

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
