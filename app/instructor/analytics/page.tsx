import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { MetricGrid } from "@/components/lms/dashboard-widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

 return (
  <AppShell role="instructor">
   <PageHeader title="Аналитика курса" description="Прогресс, тесты, задания и активность слушателей."/>
   <div className="space-y-6">
    <MetricGrid metrics={metrics}/>
    <Tabs tabs={[
     {
      label: "По модулям",
      content: (
       <div className="space-y-3">
        {moduleAnalytics.length > 0 ? moduleAnalytics.map((m) => (
         <Card key={m.title} className="transition-shadow hover:shadow-sm">
          <CardContent className="py-4">
           <div className="flex items-center justify-between mb-2">
            <div>
             <p className="text-sm font-bold">{m.title}</p>
             <p className="text-xs text-muted-foreground">{m.courseTitle}</p>
            </div>
            <span className="text-xs text-muted-foreground">{m.completedStudents} завершили</span>
           </div>
           <div className="flex items-center gap-3">
            <Progress value={m.avgProgress} className="flex-1"/>
            <span className="text-sm font-medium w-10 text-right">{m.avgProgress}%</span>
           </div>
          </CardContent>
         </Card>
        )) : (
         <Card><CardContent className="py-10 text-center text-muted-foreground">Данные по модулям отсутствуют.</CardContent></Card>
        )}
       </div>
      ),
     },
     {
      label: "По тестам",
      content: <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Аналитика по тестам (распределение оценок) будет доступна в следующем обновлении.</CardContent></Card>,
     },
    ]}/>
   </div>
  </AppShell>
 );
}
