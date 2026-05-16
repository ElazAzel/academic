import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseProgressGrid, MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { StatusBadge } from "@/components/lms/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MessageCircle } from "lucide-react";
import { getStudentDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
 await requireRolePage(["student"]);
 const data = await getStudentDashboard();

 if (!data) {
  return (
   <AppShell role="student">
    <PageHeader
     title="Моё обучение"
     description="Продолжайте с того места, где остановились."
   />
    <div className="space-y-6">
     <EmptyState icon={Clock} title="Не удалось загрузить данные" description="Попробуйте обновить страницу позже." />
    </div>
   </AppShell>
  );
 }
 
 const coursesProgress = data.coursesProgress ?? [];
 const metrics = data.metrics ?? [];
 const continueLearning = data.continueLearning ?? null;
 const questions = data.questions ?? [];
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
      {data.deadlines && data.deadlines.length > 0 ? (
       <div className="space-y-2">
        {data.deadlines.slice(0, 4).map((d) => {
         return (
          <Card key={d.moduleId} className="transition-shadow hover:shadow-sm">
           <CardContent className="flex items-center gap-3 py-3">
            <div className="flex-1 min-w-0">
             <p className="text-sm font-medium truncate">{d.moduleTitle}</p>
             <p className="text-xs text-muted-foreground truncate">{d.courseTitle}</p>
            </div>
            <StatusBadge status={d.isOverdue ? "overdue" : "upcoming"} label={d.isOverdue ? "Просрочено" : `${d.daysLeft} дн.`} className="shrink-0" />
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
