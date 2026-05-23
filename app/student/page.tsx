import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentCourseDashboardGrid } from "@/components/lms/student-course-dashboard-grid";
import { XpDisplay } from "@/components/lms/xp-display";
import { StudentAchievements } from "@/components/lms/student-achievements";
import { getUserXp } from "@/server/actions/xp";
import { getLevel } from "@/lib/xp-utils";
import { PageHeader } from "@/components/lms/page-header";
import { EmptyState } from "@/components/lms/empty-state";
import { StatusBadge } from "@/components/lms/status-badge";
import { PageSkeleton } from "@/components/lms/page-skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpenCheck, Clock, MessageCircle, School } from "lucide-react";
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
  return withAchievements();
}

async function withAchievements() {
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
  const learningPaths = data.learningPaths ?? [];

  const xp = await getUserXp(data.userId);
  const levelInfo = getLevel(xp);

  return (
   <div className="space-y-6">
   {continueLearning ? (
    <ContinueLearningCard data={continueLearning}/>
   ) : (
    <EmptyState
     icon={BookOpenCheck}
     title="Продолжить обучение"
     description="Активного следующего урока пока нет. Откройте назначенные курсы и выберите доступный урок."
     action={
      <Button asChild>
       <Link href="/student/my-courses">Открыть мои курсы</Link>
      </Button>
     }
    />
   )}

    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)]">
     <Suspense fallback={<div className="min-h-[6rem] animate-pulse rounded-xl bg-muted" />}>
      <XpDisplay userId={data.userId} />
     </Suspense>

     <StudentAchievements
       xp={xp}
       level={levelInfo.level}
       coursesProgress={coursesProgress.map(c => ({ percent: c.percent, title: c.courseTitle }))}
       questionsCount={questions.length}
     />
    </section>

   {metrics.length > 0 && (
    <MetricGrid metrics={metrics}/>
   )}

   {/* Блок: текущие курсы */}
   {coursesProgress.length > 0 && (
    <section>
     <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Мои курсы</h2>
      <Button asChild variant="ghost" size="sm">
        <Link href="/student/my-courses">
        Все курсы <ArrowRight className="ml-1 h-4 w-4"/>
       </Link>
      </Button>
     </div>
     <StudentCourseDashboardGrid courses={coursesProgress} />
    </section>
   )}

    {/* Блок: треки обучения (Learning Paths) */}
    {learningPaths.length > 0 && (
     <section>
      <div className="flex items-center justify-between mb-4">
       <h2 className="text-lg font-semibold">Мои треки обучения</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
       {learningPaths.map((lp) => (
        <Card key={lp.id} className="border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft">
         <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-m3-primary" />
            <CardTitle className="font-label-lg text-label-lg text-m3-on-surface">
             {lp.title}
            </CardTitle>
           </div>
           <Badge variant="secondary" className="text-[10px]">
            {lp.courseCount} курсов
           </Badge>
          </div>
          {lp.description && (
           <CardDescription className="font-body-sm text-body-sm text-m3-on-surface-variant mt-1">
            {lp.description.length > 100 ? lp.description.slice(0, 100) + "…" : lp.description}
           </CardDescription>
          )}
         </CardHeader>
         <CardContent>
          <div className="space-y-2">
           <div className="flex items-center justify-between font-body-sm text-body-sm text-m3-on-surface-variant">
            <span>Прогресс трека</span>
            <span className="font-label-md text-label-md text-m3-on-surface">{lp.progress}%</span>
           </div>
           <div className="h-2 rounded-full overflow-hidden bg-m3-surface-variant">
            <div
             className="h-full rounded-full transition-all bg-m3-primary"
             style={{ width: `${lp.progress}%` }}
            />
           </div>
           <p className="font-body-sm text-body-sm text-m3-on-surface-variant">
            {lp.completedCourses} из {lp.courseCount} курсов завершено
           </p>
          </div>
         </CardContent>
        </Card>
       ))}
      </div>
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
     <EmptyState
      icon={MessageCircle}
      title="У вас пока нет вопросов"
      description="Вы можете задать вопрос куратору прямо внутри любого урока."
     />
    )}
   </section>
  </div>
 );
}
