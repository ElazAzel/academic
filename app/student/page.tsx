import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, CourseProgressGrid, MetricGrid } from "@/components/lms/dashboard-widgets";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { StatusBadge } from "@/components/lms/status-badge";
import { PageSkeleton } from "@/components/lms/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MessageCircle } from "lucide-react";
import { getStudentDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import type { BadgeStatus } from "@/components/lms/status-badge";

export const dynamic = "force-dynamic";

export default function StudentDashboardPage() {
 return (
  <AppShell role="student">
   <PageHeader
    title="Моё обучение"
    description="Продолжайте с того места, где остановились."
   />
   <Suspense fallback={<PageSkeleton />}>
    <StudentDashboardContent />
   </Suspense>
  </AppShell>
 );
}

async function StudentDashboardContent() {
 await requireRolePage(["student"]);
 const data = await getStudentDashboard();

 if (!data) {
  return (
   <div className="space-y-6">
    <EmptyState icon={Clock} title="Не удалось загрузить данные" description="Попробуйте обновить страницу позже." />
   </div>
  );
 }
 
 const coursesProgress = data.coursesProgress ?? [];
 const metrics = data.metrics ?? [];
 const continueLearning = data.continueLearning ?? null;
 const questions = data.questions ?? [];

 return (
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
       <Link href="/student/courses">
        Все курсы <ArrowRight className="ml-1 h-4 w-4"/>
       </Link>
      </Button>
     </div>
     <CourseProgressGrid courses={coursesProgress} />
    </section>
   )}

   {/* Блок: вопросы */}
   <section>
    <div className="flex items-center justify-between mb-4">
     <h2 className="text-lg font-semibold">Мои вопросы</h2>
    </div>
    {questions.length > 0 ? (
     <div className="space-y-3">
      {questions.slice(0, 5).map((q) => (
       <Card key={q.id} className="rounded-2xl">
        <CardContent className="flex items-start gap-4 py-4">
         <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
         </span>
         <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
           <span className="text-sm font-medium">{q.lessonTitle}</span>
           <StatusBadge status={q.status as BadgeStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{q.text}</p>
          {q.answer && (
           <p className="mt-2 text-sm text-muted-foreground border-l-2 pl-3 italic">
            {q.answer}
           </p>
          )}
         </div>
        </CardContent>
       </Card>
      ))}
     </div>
    ) : (
     <Card className="rounded-2xl">
      <CardContent className="py-10 text-center text-muted-foreground">
       <MessageCircle className="mx-auto h-8 w-8 mb-2 opacity-40" />
       У вас пока нет вопросов.
      </CardContent>
     </Card>
    )}
   </section>
  </div>
 );
}
