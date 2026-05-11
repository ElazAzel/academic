import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseProgressGrid, MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MessageCircle } from "lucide-react";
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
    title="Моё обучение"
    description="Продолжайте с того места, где остановились."
  />
   <div className="space-y-6">

    {continueLearning ? (
     <ContinueLearningCard data={continueLearning}/>
    ) : coursesProgress.length > 0 ? (
     <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <CardContent className="flex items-center justify-between py-5">
       <div>
        <p className="text-sm font-medium">Добро пожаловать!</p>
        <p className="text-xs text-muted-foreground mt-0.5">Выберите курс для начала обучения.</p>
       </div>
       <Button asChild size="sm">
        <Link href="/student/my-courses">
         К курсам <ArrowRight className="h-4 w-4" />
        </Link>
       </Button>
      </CardContent>
     </Card>
    ) : null}

    {metrics.length > 0 && (
     <MetricGrid metrics={metrics}/>
    )}

    {/* Блок: текущие курсы */}
    {coursesProgress.length > 0 && (
     <section>
      <div className="flex items-center justify-between mb-4">
       <h2 className="text-lg font-semibold">Мои курсы</h2>
       <Button asChild variant="ghost" size="sm">
        <Link href="/student/my-courses">Все курсы <ArrowRight className="h-4 w-4" /></Link>
       </Button>
      </div>
      <CourseProgressGrid courses={coursesProgress.slice(0, 3)}/>
     </section>
    )}

    {/* Блок: дедлайны + ответы куратора в 2 колонки */}
    <div className="grid gap-6 md:grid-cols-2">
     {/* Дедлайны */}
     <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
       <Clock className="h-4 w-4 text-muted-foreground" />
       Ближайшие дедлайны
      </h2>
      {data?.deadlines && data.deadlines.length > 0 ? (
       <div className="space-y-2">
        {data.deadlines.slice(0, 4).map((d) => {
         const daysLeft = d.daysLeft;
         const isOverdue = d.isOverdue;
         return (
          <Card key={d.moduleId} className="transition-shadow hover:shadow-sm">
           <CardContent className="flex items-center gap-3 py-3">
            <span className={cn(
             "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
             isOverdue ? "bg-red-100" : daysLeft <= 3 ? "bg-amber-100" : "bg-sky-100"
            )}>
             <Clock className={cn(
              "h-4 w-4",
              isOverdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-sky-600"
             )} />
            </span>
            <div className="flex-1 min-w-0">
             <p className="text-sm font-medium truncate">{d.moduleTitle}</p>
             <p className="text-xs text-muted-foreground truncate">{d.courseTitle}</p>
            </div>
            <Badge className={cn(
             "shrink-0 border-none",
             isOverdue ? "bg-red-50 text-red-700" : daysLeft <= 3 ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
            )}>
             {isOverdue ? "Просрочено" : `${daysLeft} дн.`}
            </Badge>
           </CardContent>
          </Card>
         );
        })}
       </div>
      ) : (
       <EmptyState icon={Clock} title="Нет дедлайнов" description="У вас пока нет активных дедлайнов." />
      )}
     </section>

     {/* Ответы куратора */}
     <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
       <MessageCircle className="h-4 w-4 text-muted-foreground" />
       Ответы куратора
      </h2>
      {answeredQuestions.length > 0 ? (
       <div className="space-y-2">
        {answeredQuestions.slice(0, 4).map((q) => (
         <Card key={q.id} className="transition-shadow hover:shadow-sm">
          <CardContent className="py-3">
           <p className="text-sm font-medium line-clamp-1">{q.text}</p>
           <p className="text-xs text-emerald-700 mt-1 line-clamp-2">{q.answer}</p>
           <p className="text-[10px] text-muted-foreground mt-1">{q.courseTitle} → {q.lessonTitle}</p>
          </CardContent>
         </Card>
        ))}
       </div>
      ) : (
       <EmptyState icon={MessageCircle} title="Нет ответов" description="Куратор пока не отвечал на ваши вопросы." />
      )}
     </section>
    </div>

   </div>
  </AppShell>
 );
}
