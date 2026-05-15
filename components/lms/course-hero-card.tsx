import Link from "next/link";
import { Award, HelpCircle, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StudentCoursePlayerDetail } from "@/types/domain";

export function CourseHeroCard({ detail }: { detail: StudentCoursePlayerDetail }) {
  const { course, progress, enrollment, curator, certificateEligible } = detail;
  const isPaused = enrollment === "PAUSED";

  return (
    <div className="sticky top-24 space-y-4">
      {/* Cover image */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
        {course.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={course.coverUrl} alt={course.title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          {/* Title */}
          <h1 className="text-lg font-semibold leading-tight">{course.title}</h1>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress.completed}/{progress.total} уроков</p>
          </div>

          {/* Certificate */}
          {certificateEligible ? (
            <Button asChild variant="primary" size="sm" className="w-full">
              <Link href="/student/certificates">
                <Award className="h-4 w-4" />
                Получить сертификат
              </Link>
            </Button>
          ) : (
            <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/20 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Сертификат после {detail.completionThreshold}%</p>
            </div>
          )}

          {/* Curator */}
          {curator && (
            <div className="space-y-2 rounded-xl bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Куратор</p>
              <p className="text-sm font-medium">{curator.name}</p>
              {curator.unansweredCount > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600">
                  <HelpCircle className="h-3.5 w-3.5" />
                  {curator.unansweredCount} неотвеченных вопросов
                </p>
              )}
              {detail.nextLessonId ? (
                <Button asChild size="sm" variant="ghost" className="w-full">
                  <Link href={`/student/lessons/${detail.nextLessonId}`}>
                    <HelpCircle className="h-4 w-4" />
                    Задать вопрос
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="w-full" disabled>
                  <HelpCircle className="h-4 w-4" />
                  Задать вопрос
                </Button>
              )}
            </div>
          )}

          {/* Enrollment status */}
          {isPaused && (
            <Badge className="w-full justify-center border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 text-xs">
              Обучение приостановлено
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
