import type { ComponentType } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Clock, FileText, Lock, PlayCircle, Video } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/http";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getCourseForStudent } from "@/server/modules/learning/service";
import type { LessonLearningSummary, LessonType } from "@/types/domain";

export const dynamic = "force-dynamic";

const LESSON_ICONS: Record<LessonType, ComponentType<{ className?: string }>> = {
 VIDEO: Video,
 VIDEO_DOCUMENT: PlayCircle,
 QUIZ: FileText,
 ASSIGNMENT: FileText,
 TEXT: BookOpen,
 DOCUMENT: FileText,
 LIVE: Video,
 RECORDING: Video,
 MIXED: BookOpen
};

function LessonStatusIcon({ lesson }: { lesson: LessonLearningSummary }) {
 if (lesson.progressStatus === "COMPLETED") {
  return <CheckCircle2 className="h-4 w-4 text-emerald-600"/>;
 }

 if (lesson.progressStatus === "IN_PROGRESS") {
  return <PlayCircle className="h-4 w-4 text-primary"/>;
 }

 if (lesson.locked) {
  return <Lock className="h-4 w-4 text-muted-foreground/50"/>;
 }

 return <Clock className="h-4 w-4 text-muted-foreground"/>;
}

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
 const user = await requireRolePage(["student"]);
 const { courseId } = await params;

 let course;

 try {
  course = await getCourseForStudent(user.id, courseId);
 } catch (error) {
  if (error instanceof ApiError && error.code === "not_found") {
   notFound();
  }

  if (error instanceof ApiError && error.code === "forbidden") {
   redirect("/403");
  }

  throw error;
 }

 const completedLessons = course.modules
  .flatMap((module) => module.lessons)
  .filter((lesson) => lesson.progressStatus === "COMPLETED").length;

 return (
  <AppShell role="student">
   <PageHeader title={course.title} description={course.description}/>

   <div className="space-y-6">
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
     <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-2">
       <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Общий прогресс</span>
        <span className="font-medium">{course.coursePercent}%</span>
       </div>
       <Progress value={course.coursePercent}/>
       <p className="text-xs text-muted-foreground">
        {completedLessons} из {course.lessonsCount} уроков · {course.durationHours} ч. · {course.modulesCount} модулей
       </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
       {course.instructors.map((instructor) => (
        <div key={instructor.id} className="flex items-center gap-2">
         <Avatar name={instructor.name} className="h-7 w-7 text-[10px]"/>
         <span className="hidden text-xs text-muted-foreground sm:inline">{instructor.name}</span>
        </div>
       ))}
      </div>
     </CardContent>
    </Card>

    <Card>
     <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
       {course.goal ? (
        <p className="text-sm">
         <span className="font-medium text-primary">Цель:</span> {course.goal}
        </p>
       ) : null}
       <p className="mt-1 text-xs text-muted-foreground">
        Порог сертификации: {course.completionThreshold}% · Режим:{" "}
        {course.traversalMode === "sequential" ? "последовательный" : "свободный"}
        {course.cohortName ? ` · Поток: ${course.cohortName}` : ""}
       </p>
      </div>
      {course.nextLessonId ? (
       <Button asChild>
        <Link href={`/student/lessons/${course.nextLessonId}`}>
         Продолжить
         <ArrowRight className="h-4 w-4" aria-hidden/>
        </Link>
       </Button>
      ) : null}
     </CardContent>
    </Card>

    <div className="space-y-4">
     {course.modules.map((courseModule) => (
      <Card key={courseModule.id} className="rounded-2xl transition-shadow hover:shadow-panel">
       <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
         <Badge
          className={
           courseModule.progressPercent >= 100
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-sky-200 bg-sky-50 text-sky-700"
          }
         >
          {courseModule.progressPercent >= 100 ? "Завершен" : `${courseModule.progressPercent}%`}
         </Badge>
         <span className="text-xs text-muted-foreground">
          {courseModule.deadlineDate ? `до ${courseModule.deadlineDate.slice(0, 10)}` : `${courseModule.recommendedDays} дн.`}
         </span>
        </div>
        <CardTitle className="text-lg">{courseModule.title}</CardTitle>
        {courseModule.description ? <CardDescription>{courseModule.description}</CardDescription> : null}
       </CardHeader>
       <CardContent className="space-y-1">
        {courseModule.lessons.map((lesson) => {
         const Icon = LESSON_ICONS[lesson.type] ?? BookOpen;

         return (
          <div key={lesson.id}>
           {lesson.order > 1 ? <Separator className="my-1"/> : null}
           {lesson.locked ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-50">
             <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
              <Icon className="h-4 w-4 text-muted-foreground"/>
             </span>
             <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{lesson.title}</p>
              <p className="text-xs text-muted-foreground">{lesson.lockReason ?? `${lesson.durationMinutes} мин.`}</p>
             </div>
             <LessonStatusIcon lesson={lesson}/>
            </div>
           ) : (
            <Link
             href={`/student/lessons/${lesson.id}`}
             className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted"
            >
             <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
              <Icon className="h-4 w-4 text-muted-foreground"/>
             </span>
             <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{lesson.title}</p>
              <p className="text-xs text-muted-foreground">{lesson.durationMinutes} мин.</p>
             </div>
             <div className="flex shrink-0 items-center gap-2">
              <LessonStatusIcon lesson={lesson}/>
              {lesson.progressStatus !== "COMPLETED" ? <ArrowRight className="h-4 w-4 text-muted-foreground"/> : null}
             </div>
            </Link>
           )}
          </div>
         );
        })}
       </CardContent>
      </Card>
     ))}
    </div>
   </div>
  </AppShell>
 );
}
