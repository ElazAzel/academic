import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseProgressGrid, MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { getStudentDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import { cn } from "@/lib/utils";
import { isDemoModeEnabled } from "@/lib/demo-mode";
import { DashboardUnavailable } from "@/components/lms/dashboard-unavailable";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
 await requireRolePage(["student"]);
 const data = await getStudentDashboard();
 const demoMode = isDemoModeEnabled();

 if (!data && !demoMode) {
  return (
   <AppShell role="student">
    <PageHeader
     title="Дашборд слушателя"
     description="Ваш прогресс, курсы, задания и уведомления."
   />
    <DashboardUnavailable/>
   </AppShell>
  );
 }
 
 const metrics = data?.metrics ?? [];
 const continueLearning = data?.continueLearning ?? null;
 const coursesProgress = data?.coursesProgress ?? [];
 const questions = data?.questions ?? [];

 const answeredQuestions = questions.filter((q) => q.status === "answered");

 return (
  <AppShell role="student">
   <PageHeader
    title="Дашборд слушателя"
    description="Ваш прогресс, курсы, задания и уведомления."
  />
   <div className="space-y-6">
    <MetricGrid metrics={metrics}/>

    {continueLearning && <ContinueLearningCard data={continueLearning}/>}

    <Tabs
     tabs={[
      {
       label: "Мои курсы",
       content: <CourseProgressGrid courses={coursesProgress}/>,
      },
      {
       label: "Ответы куратора",
       content: (
        <div className="space-y-4">
         {answeredQuestions.length > 0 ? (
          answeredQuestions.map((q) => (
           <Card key={q.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="py-4">
             <p className="text-sm font-medium">{q.text}</p>
             <div className="mt-2 rounded-lg bg-emerald-50 p-3">
              <p className="text-sm text-emerald-800">{q.answer}</p>
             </div>
             <p className="mt-2 text-xs text-muted-foreground">
              {q.courseTitle} → {q.lessonTitle}
             </p>
            </CardContent>
           </Card>
          ))
         ) : (
          <Card>
           <CardContent className="py-10 text-center text-muted-foreground">
            Пока нет ответов от куратора.
           </CardContent>
          </Card>
         )}
        </div>
       ),
      },
      {
       label: "Дедлайны",
       content: (
        <div className="space-y-3">
         {data?.deadlines && data.deadlines.length > 0 ? (
          data.deadlines.map((d) => {
           const daysLeft = d.daysLeft;
           const isOverdue = d.isOverdue;

           return (
            <Card key={d.moduleId} className="transition-shadow hover:shadow-sm">
             <CardContent className="flex items-center gap-4 py-4">
              <span className={cn(
               "flex h-10 w-10 items-center justify-center rounded-xl",
               isOverdue ? "bg-red-100" : daysLeft <= 3 ? "bg-amber-100" : "bg-sky-100"
              )}>
               <Clock className={cn(
                "h-5 w-5",
                isOverdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-sky-600"
               )} aria-hidden/>
              </span>
              <div className="flex-1">
               <p className="text-sm font-medium">{d.moduleTitle}</p>
               <p className="text-xs text-muted-foreground">
                {d.courseTitle} · до {new Date(d.dueAt).toLocaleDateString("ru-RU")}
               </p>
              </div>
              <Badge className={cn(
               "border-none",
               isOverdue ? "bg-red-50 text-red-700" : daysLeft <= 3 ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
              )}>
               {isOverdue ? "Просрочено" : `${daysLeft} дн.`}
              </Badge>
             </CardContent>
            </Card>
           );
          })
         ) : (
          <Card>
           <CardContent className="py-10 text-center text-muted-foreground">
            У вас пока нет установленных дедлайнов.
           </CardContent>
          </Card>
         )}
        </div>
       ),
      },
     ]}
   />
   </div>
  </AppShell>
 );
}
