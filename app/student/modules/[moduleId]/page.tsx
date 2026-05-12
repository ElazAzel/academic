import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumbs } from "@/components/lms/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/http";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getModuleForStudent } from "@/server/modules/learning/service";
import type { LessonLearningSummary } from "@/types/domain";

export const dynamic = "force-dynamic";

function LessonRow({ lesson }: { lesson: LessonLearningSummary }) {
 const statusIcon = lesson.progressStatus === "COMPLETED"
  ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0"/>
  : lesson.progressStatus === "IN_PROGRESS"
  ? <PlayCircle className="h-4 w-4 text-primary shrink-0"/>
  : lesson.locked
  ? <Lock className="h-4 w-4 text-muted-foreground/50 shrink-0"/>
  : <Clock className="h-4 w-4 text-muted-foreground shrink-0"/>;

 if (lesson.locked) {
  return (
   <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-50 cursor-not-allowed">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
     <BookOpen className="h-4 w-4 text-muted-foreground"/>
    </span>
    <div className="flex-1 min-w-0">
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
    <BookOpen className="h-4 w-4"/>
   </span>
   <div className="flex-1 min-w-0">
    <p className="truncate font-medium">{lesson.title}</p>
    <p className="text-xs text-muted-foreground">{lesson.type} · {lesson.durationMinutes} мин.</p>
   </div>
   <div className="flex shrink-0 items-center gap-2">
    {statusIcon}
    {lesson.progressStatus !== "COMPLETED" && <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"/>}
   </div>
  </Link>
 );
}

export default async function StudentModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
 const user = await requireRolePage(["student"]);
 const { moduleId } = await params;

 let learningModule;
 try {
  learningModule = await getModuleForStudent(user.id, moduleId);
 } catch (error) {
  if (error instanceof ApiError && error.code === "not_found") notFound();
  if (error instanceof ApiError && error.code === "forbidden") redirect("/403");
  throw error;
 }

 return (
  <AppShell role="student">
   <Breadcrumbs items={[
    { href: "/student/my-courses", label: "Мои курсы" },
    { href: `/student/courses/${learningModule.courseId}`, label: learningModule.courseTitle ?? "" },
    { label: learningModule.title },
   ].filter(Boolean)} />

   <div className="flex items-center justify-between mb-6">
    <div>
     <h1 className="text-xl font-semibold sm:text-2xl">{learningModule.title}</h1>
     {learningModule.description && (
      <p className="text-sm text-muted-foreground mt-1">{learningModule.description}</p>
     )}
    </div>
    <div className="flex items-center gap-2 text-sm shrink-0">
     <span className="text-muted-foreground">{learningModule.progressPercent}%</span>
     <div className="w-20">
      <Progress value={learningModule.progressPercent} className="h-1.5" />
     </div>
    </div>
   </div>

   <Card>
    <CardContent className="p-2 space-y-0.5">
     {learningModule.lessons.map((lesson, idx) => (
      <div key={lesson.id}>
       {idx > 0 && <Separator className="mx-3 w-auto" />}
       <LessonRow lesson={lesson} />
      </div>
     ))}
    </CardContent>
   </Card>
  </AppShell>
 );
}
