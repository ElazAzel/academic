import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ContinueLearningCard, MetricGrid } from "@/components/lms/dashboard-widgets";
import { StudentCourseDashboardGrid } from "@/components/lms/student-course-dashboard-grid";
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
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessageSquareReply,
  School,
} from "lucide-react";
import { getStudentDashboard } from "@/server/actions/dashboard";
import { requireRolePage } from "@/lib/auth/page-guards";
import type { BadgeStatus } from "@/components/lms/status-badge";
import type { CohortDeadline, ContinueLearning, QuestionFromStudent } from "@/types/domain";

export const metadata = {
  title: "Дашборд — Студент",
  description: "Панель управления студента.",
};


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
  const deadlines = data.deadlines ?? [];

  const xp = await getUserXp(data.userId);
  const levelInfo = getLevel(xp);

  return (
   <div className="space-y-6">
    <section
     aria-labelledby="student-next-step-title"
     className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
    >
     <div className="min-w-0">
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
     </div>
     <StudentNextActionsPanel
      continueLearning={continueLearning}
      coursesCount={coursesProgress.length}
      deadlines={deadlines}
      questions={questions}
     />
    </section>

    <StudentAchievements
      xp={xp}
      levelInfo={levelInfo}
      coursesProgress={coursesProgress.map(c => ({ percent: c.percent, title: c.courseTitle }))}
      questionsCount={questions.length}
    />

   {metrics.length > 0 && (
    <MetricGrid metrics={metrics}/>
   )}

   {/* Блок: текущие курсы */}
   {coursesProgress.length > 0 && (
    <section aria-labelledby="student-courses-title">
     <div className="flex items-center justify-between mb-4">
      <h2 id="student-courses-title" className="text-lg font-semibold text-balance">Мои курсы</h2>
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
     <section aria-labelledby="student-learning-paths-title">
      <div className="flex items-center justify-between mb-4">
       <h2 id="student-learning-paths-title" className="text-lg font-semibold text-balance">Мои треки обучения</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
       {learningPaths.map((lp) => (
        <Card key={lp.id} className="border-m3-outline-variant bg-m3-surface-container-lowest">
         <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
           <div className="flex min-w-0 items-center gap-2">
            <School className="h-5 w-5 shrink-0 text-m3-primary" aria-hidden />
            <CardTitle className="line-clamp-2 font-label-lg text-label-lg text-m3-on-surface">
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
   <section aria-labelledby="student-questions-title">
    <div className="flex items-center justify-between mb-4">
     <h2 id="student-questions-title" className="text-lg font-semibold text-balance">Мои вопросы</h2>
    </div>
    {questions.length > 0 ? (
     <div className="space-y-3">
      {questions.slice(0, 5).map((q) => (
       <Card key={q.id}>
        <CardContent className="flex items-start gap-4 py-4">
         <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
         </span>
         <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
           <span className="min-w-0 truncate text-sm font-medium">{q.lessonTitle}</span>
           <StatusBadge status={q.status as BadgeStatus} />
          </div>
          <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{q.text}</p>
          {q.answer && (
           <div className="mt-3 border-l-2 border-m3-primary/40 pl-3">
            <p className="line-clamp-3 break-words text-sm text-muted-foreground">{q.answer}</p>
            {q.lessonId && (
             <Button asChild variant="ghost" size="sm" className="mt-2 px-0 text-m3-primary hover:bg-transparent">
              <Link href={`/student/lessons/${q.lessonId}`}>
               Открыть урок <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
             </Button>
            )}
           </div>
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

function StudentNextActionsPanel({
  continueLearning,
  coursesCount,
  deadlines,
  questions,
}: {
  continueLearning: ContinueLearning | null;
  coursesCount: number;
  deadlines: CohortDeadline[];
  questions: QuestionFromStudent[];
}) {
  const nearestDeadlines = [...deadlines]
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
      return left.daysLeft - right.daysLeft;
    })
    .slice(0, 2);
  const openQuestions = questions.filter((question) => question.status === "open").length;
  const latestAnswer = questions.find((question) => question.answer);

  return (
    <Card className="h-full border-m3-outline-variant bg-m3-surface-container-lowest">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed/40">
            <CheckCircle2 className="h-5 w-5 text-m3-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle id="student-next-step-title" className="text-label-lg font-label-lg text-m3-on-surface">
              Ближайшие действия
            </CardTitle>
            <CardDescription className="text-body-sm font-body-sm text-m3-on-surface-variant">
              Учёба, дедлайны и поддержка
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <StudentActionRow
          icon={BookOpenCheck}
          title={continueLearning ? "Следующий урок готов" : "Проверьте назначенные курсы"}
          description={
            continueLearning
              ? `${continueLearning.moduleTitle} · ${continueLearning.lessonTitle}`
              : `${coursesCount} ${pluralizeRu(coursesCount, "курс", "курса", "курсов")} в личном плане`
          }
          href={continueLearning ? `/student/lessons/${continueLearning.lessonId}` : "/student/my-courses"}
          statusLabel={continueLearning ? "Открыть" : "Курсы"}
        />

        {nearestDeadlines.length > 0 ? (
          nearestDeadlines.map((deadline) => (
            <StudentActionRow
              key={`${deadline.moduleId}-${deadline.dueAt}`}
              icon={CalendarClock}
              title={deadline.isOverdue ? "Просроченный дедлайн" : "Ближайший дедлайн"}
              description={`${deadline.courseTitle ? `${deadline.courseTitle} · ` : ""}${deadline.moduleTitle} · ${formatShortDate(deadline.dueAt)}`}
              status={deadline.isOverdue ? "overdue" : "upcoming"}
              statusLabel={formatDeadlineLabel(deadline)}
            />
          ))
        ) : (
          <StudentActionRow
            icon={CalendarClock}
            title="Срочных дедлайнов нет"
            description="Новые дедлайны появятся здесь после назначения потока."
            statusLabel="План"
          />
        )}

        {latestAnswer ? (
          <StudentActionRow
            icon={MessageSquareReply}
            title="Есть ответ куратора"
            description={`${latestAnswer.lessonTitle}: ${latestAnswer.answer}`}
            href={latestAnswer.lessonId ? `/student/lessons/${latestAnswer.lessonId}` : undefined}
            status="answered"
            statusLabel="Ответ"
          />
        ) : (
          <StudentActionRow
            icon={MessageCircle}
            title={openQuestions > 0 ? "Куратор готовит ответ" : "Вопросов куратору нет"}
            description={
              openQuestions > 0
                ? `${openQuestions} ${pluralizeRu(openQuestions, "вопрос", "вопроса", "вопросов")} ожидает ответа`
                : "Задайте вопрос из урока, когда потребуется помощь."
            }
            status={openQuestions > 0 ? "open" : undefined}
            statusLabel={openQuestions > 0 ? "Ожидает" : "Поддержка"}
          />
        )}
      </CardContent>
    </Card>
  );
}

function StudentActionRow({
  icon: IconComponent,
  title,
  description,
  href,
  status,
  statusLabel,
}: {
  icon: typeof BookOpenCheck;
  title: string;
  description: string;
  href?: string;
  status?: BadgeStatus;
  statusLabel: string;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-m3-surface-container-high">
        <IconComponent className="h-5 w-5 text-m3-on-surface-variant" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-m3-on-surface">{title}</span>
        <span className="mt-0.5 line-clamp-2 break-words text-sm text-m3-on-surface-variant">{description}</span>
      </span>
      {status ? (
        <StatusBadge status={status} label={statusLabel} className="shrink-0" />
      ) : (
        <Badge variant="secondary" className="shrink-0">
          {statusLabel}
        </Badge>
      )}
    </>
  );

  const className =
    "flex items-start gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-low px-3 py-3 transition-colors hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatDeadlineLabel(deadline: CohortDeadline) {
  if (deadline.isOverdue) {
    const overdueDays = Math.abs(deadline.daysLeft);
    return `${overdueDays} ${pluralizeRu(overdueDays, "день", "дня", "дней")} назад`;
  }

  if (deadline.daysLeft === 0) return "Сегодня";
  if (deadline.daysLeft === 1) return "Завтра";
  return `${deadline.daysLeft} ${pluralizeRu(deadline.daysLeft, "день", "дня", "дней")}`;
}

function pluralizeRu(value: number, one: string, few: string, many: string) {
  const abs = Math.abs(value);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
