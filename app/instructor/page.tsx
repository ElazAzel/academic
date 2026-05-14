import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid, CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getInstructorDashboard, getForwardedQuestions } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
 await requireRolePage(["instructor"]);
 const [data, forwardedQuestions] = await Promise.all([
   getInstructorDashboard(),
   getForwardedQuestions(),
 ]);
 const demoMode = isDemoModeEnabled();

 if (!data && !demoMode) {
  return (
   <AppShell role="instructor">
    <PageHeader title="Дашборд преподавателя" description="Ваши курсы, модули, уроки и аналитика."/>
    <DashboardUnavailable/>
   </AppShell>
  );
 }

 const metrics = data?.metrics ?? [];
 const myCourses = data?.courses ?? [];

 return (
  <AppShell role="instructor">
   <PageHeader title="Дашборд преподавателя" description="Ваши курсы, модули, уроки и аналитика."/>
   <div className="space-y-6">
    <MetricGrid metrics={metrics}/>
    <Tabs tabs={[
     { label: "Мои курсы", content: <CourseManageGrid courses={myCourses}/> },
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
            <span className="font-medium">{c.avgProgress ?? 0}%</span>
           </div>
           <Progress value={c.avgProgress ?? 0}/>
          </div>
         ))}
        </CardContent>
       </Card>
      ),
     },
      {
       label: `Вопросы от кураторов (${forwardedQuestions.length})`,
       content: forwardedQuestions.length > 0 ? (
        <div className="space-y-3">
         {forwardedQuestions.slice(0, 5).map((q) => (
          <Card key={q.id} className="rounded-2xl">
           <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
             <p className="text-sm font-medium">{q.studentName}</p>
             <span className="text-xs text-muted-foreground">от {q.curatorName}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{q.text}</p>
            <p className="text-xs text-muted-foreground mt-1">{q.courseTitle} → {q.lessonTitle}</p>
           </CardContent>
          </Card>
         ))}
         {forwardedQuestions.length > 5 && (
          <p className="text-center text-sm text-muted-foreground">
           + {forwardedQuestions.length - 5} ещё — <a href="/instructor/questions" className="text-primary underline">все вопросы</a>
          </p>
         )}
        </div>
       ) : (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Нет переданных вопросов от кураторов.</CardContent></Card>
       ),
      },
    ]}/>
   </div>
  </AppShell>
 );
}
