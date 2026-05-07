import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/lms/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ApiError } from "@/lib/http";
import { requireRolePage } from "@/lib/auth/page-guards";
import { getModuleForStudent } from "@/server/modules/learning/service";
import type { LessonLearningSummary } from "@/types/domain";

export const dynamic = "force-dynamic";

function LessonStatusIcon({ lesson }: { lesson: LessonLearningSummary }) {
  if (lesson.progressStatus === "COMPLETED") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (lesson.progressStatus === "IN_PROGRESS") {
    return <PlayCircle className="h-4 w-4 text-primary" />;
  }
  if (lesson.locked) {
    return <Lock className="h-4 w-4 text-muted-foreground/50" />;
  }
  return <BookOpen className="h-4 w-4 text-muted-foreground" />;
}

export default async function StudentModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const user = await requireRolePage(["student"]);
  const { moduleId } = await params;

  let learningModule;
  try {
    learningModule = await getModuleForStudent(user.id, moduleId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") {
      notFound();
    }
    if (error instanceof ApiError && error.code === "forbidden") {
      redirect("/403");
    }
    throw error;
  }

  return (
    <AppShell role="student">
      <PageHeader
        title={learningModule.title}
        description={learningModule.description ?? `${learningModule.lessonsCount} уроков, ${learningModule.recommendedDays} рекомендуемых дней.`}
        badge="Модуль"
      />
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс модуля</span>
              <span className="font-medium">{learningModule.progressPercent}%</span>
            </div>
            <Progress value={learningModule.progressPercent} />
          </CardContent>
        </Card>
        <div className="space-y-2">
          {learningModule.lessons.map((lesson) => (
            <Link key={lesson.id} href={lesson.locked ? "#" : `/student/lessons/${lesson.id}`} className={lesson.locked ? "block cursor-not-allowed opacity-50" : "block"}>
              <Card className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-4 py-3">
                  <span className="w-6 text-xs text-muted-foreground">{lesson.order}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">{lesson.type} · {lesson.durationMinutes} мин.</p>
                  </div>
                  <LessonStatusIcon lesson={lesson} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
