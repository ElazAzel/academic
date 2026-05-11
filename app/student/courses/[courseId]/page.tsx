import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Clock, FileText, Lock, PlayCircle, Video } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Breadcrumbs } from "@/components/lms/breadcrumbs";
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

const LESSON_ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
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

function LessonRow({ lesson }: { lesson: LessonLearningSummary }) {
 const Icon = LESSON_ICONS[lesson.type] ?? BookOpen;

 const statusIcon = lesson.progressStatus === "COMPLETED"
  ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
  : lesson.progressStatus === "IN_PROGRESS"
  ? <PlayCircle className="h-4 w-4 text-primary shrink-0"/>
  : lesson.locked
  ? <Lock className="h-4 w-4 text-muted-foreground/50 shrink-0"/>
  : <Clock className="h-4 w-4 text-muted-foreground shrink-0"/>;

 if (lesson.locked) {
  return (
   <div className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-50">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
     <Icon className="h-4 w-4 text-muted-foreground"/>
    </span>
    <div className="min-w-0 flex-1">
     <p className="truncate font-medium">{lesson.title}</p>
     <p className="text-xs text-muted-foreground">{lesson.lockReason ?? `${lesson.durationMinutes} мин.`}</p>
    </div>
    {statusIcon}
   </div>
  );
 }

 return (
  <Link
   href={`/student/lessons/${lesson.id}`}
   className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted group"
  >
   <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
    <Icon className="h-4 w-4"/>
   </span>
   <div className="min-w-0 flex-1">
    <p className="truncate font-medium">{lesson.title}</p>
    <p className="text-xs text-muted-foreground">{lesson.durationMinutes} мин.</p>
   </div>
   <div className="flex shrink-0 items-center gap-2">
    {statusIcon}
    {lesson.progressStatus !== "COMPLETED" && <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"/>}
   </div>
  </Link>
 );
}

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
 const user = await requireRolePage(["student"]);
 const { courseId } = await params;

 let course;
 try {
  course = await getCourseForStudent(user.id, courseId);
 } catch (error) {
  if (error instanceof ApiError && error.code === "not_found") notFound();
  if (error instanceof ApiError && error.code === "forbidden") redirect("/403");
  throw error;
 }

 const completedLessons = course.modules
  .flatMap((m) => m.lessons)
  .filter((l) => l.progressStatus === "COMPLETED").length;

 return (
  <AppShell role="student">
   <Breadcrumbs items={[
    { href: "/student/my-courses", label: "Мои курсы" },
    { label: course.title },
   ]} />

   {/* Sticky progress summary */}
   <div className="sticky top-20 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-md border-b mb-6">
    <div className="flex items-center gap-4">
     <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between text-xs">
       <span className="text-muted-foreground">Прогресс</span>
       <span className="font-medium">{course.coursePercent}%</span>
      </div>
      <Progress value={course.coursePercent} className="h-1.5" />
     </div>
     <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
      <span>{completedLessons}/{course.lessonsCount} уроков</span>
      {course.instructors.map((i) => (
       <div key={i.id} className="flex items-center gap-1.5">
        <Avatar name={i.name} className="h-5 w-5 text-[8px]" />
        <span className="hidden md:inline">{i.name}</span>
       </div>
      ))}
     </div>
     {course.nextLessonId ? (
      <Button asChild size="sm" className="shrink-0">
       <Link href={`/student/lessons/${course.nextLessonId}`}>
        Продолжить <ArrowRight className="h-4 w-4" />
       </Link>
      </Button>
     ) : null}
    </div>
   </div>

   <div className="space-y-3">
    {course.modules.map((m) => (
     <Card key={m.id} className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
       <div className="flex items-center gap-3 min-w-0">
        <Badge className={
         m.progressPercent >= 100
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0"
          : "border-sky-200 bg-sky-50 text-sky-700 shrink-0"
        }>
         {m.progressPercent >= 100 ? "✓" : `${m.progressPercent}%`}
        </Badge>
        <div className="min-w-0">
         <p className="text-sm font-semibold truncate">{m.title}</p>
         {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
        </div>
       </div>
       <span className="text-xs text-muted-foreground shrink-0 ml-2">
        {m.deadlineDate ? `до ${m.deadlineDate.slice(0, 10)}` : `${m.recommendedDays} дн.`}
       </span>
      </div>
      <CardContent className="p-2 space-y-0.5">
       {m.lessons.map((lesson, idx) => (
        <div key={lesson.id}>
         {idx > 0 && <Separator className="mx-3 w-auto" />}
         <LessonRow lesson={lesson} />
        </div>
       ))}
      </CardContent>
     </Card>
    ))}
   </div>
  </AppShell>
 );
}
