import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricGrid, CourseManageGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { PageSkeleton } from "@/components/lms/page-skeleton";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getInstructorDashboard, getForwardedQuestions } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";
import { EmptyState } from "@/components/lms/empty-state";

export const metadata = {
  title: "Дашборд — Инструктор",
  description: "Панель управления инструктора.",
};


export const dynamic = "force-dynamic";

export default function InstructorDashboardPage() {
 return (
  <AppShell role="instructor">
   <PageHeader title="Дашборд преподавателя" description="Ваши курсы, модули, уроки и аналитика."/>
   <Suspense fallback={<PageSkeleton />}>
    <InstructorDashboardContent />
   </Suspense>
  </AppShell>
 );
}

async function InstructorDashboardContent() {
 await requireRolePage(["instructor"]);
 const [data, forwardedQuestions] = await Promise.all([
   getInstructorDashboard(),
   getForwardedQuestions(),
 ]);
 const demoMode = isDemoModeEnabled();

 if (!data && !demoMode) {
  return <DashboardUnavailable />;
 }

 const metrics = data?.metrics ?? [];
 const myCourses = data?.courses ?? [];

 return (
  <div className="space-y-6">
   <MetricGrid metrics={metrics}/>
    <Tabs paramName="tab" tabs={[
     { label: "Мои курсы", content: <CourseManageGrid courses={myCourses}/> },
     {
      label: "Аналитика",
      content: (
       <Card className="border-m3-outline-variant">
        <CardHeader>
         <CardTitle className="text-headline-sm text-m3-on-surface">Прогресс по курсам</CardTitle>
         <CardDescription className="text-body-md text-m3-on-surface-variant">Средний прогресс всех слушателей</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
         {myCourses.map((c) => (
          <div key={c.id} className="space-y-1.5 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low p-3 transition-colors hover:bg-m3-surface-container">
           <div className="flex items-center justify-between text-sm font-semibold text-m3-on-surface">
            <span>{c.title}</span>
            <span className="text-m3-primary font-bold">{c.avgProgress ?? 0}%</span>
           </div>
           <Progress value={c.avgProgress ?? 0} className="bg-m3-surface-container-high [&>div]:bg-m3-primary h-2" />
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
          <Card key={q.id} className="border-m3-outline-variant">
           <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
             <p className="text-sm font-semibold text-m3-on-surface">{q.studentName}</p>
             <span className="text-xs text-m3-on-surface-variant">от {q.curatorName}</span>
            </div>
            <p className="text-sm text-m3-on-surface-variant line-clamp-2">{q.text}</p>
            <p className="text-xs text-m3-on-surface-variant mt-2 font-medium">{q.courseTitle} → {q.lessonTitle}</p>
           </CardContent>
          </Card>
         ))}
         {forwardedQuestions.length > 5 && (
          <p className="text-center text-sm text-m3-on-surface-variant">
           + {forwardedQuestions.length - 5} ещё — <a href="/instructor/questions" className="text-m3-primary font-semibold hover:underline">все вопросы</a>
          </p>
         )}
        </div>
       ) : (
        <EmptyState icon="forum" title="Вопросов пока нет" description="Нет переданных вопросов от кураторов." />
       ),
      },
    ]}/>
  </div>
 );
}
