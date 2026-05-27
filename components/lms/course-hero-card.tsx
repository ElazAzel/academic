import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/lms/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StudentCoursePlayerDetail } from "@/types/domain";

export function CourseHeroCard({ detail }: { detail: StudentCoursePlayerDetail }) {
  const { course, progress, enrollment, curator, certificateEligible } = detail;
  const isPaused = enrollment === "PAUSED";
  const courseModeLabel = course.traversalMode === "sequential" ? "Последовательный курс" : "Открытый порядок";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-m3-outline-variant bg-m3-surface-container-low">
        {course.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={course.coverUrl} alt={course.title} width={640} height={360} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <Icon name="image" size={40} className="text-m3-on-surface-variant/40" aria-hidden="true" />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={isPaused ? "PAUSED" : "ACTIVE"} label={isPaused ? "Доступ приостановлен" : "Доступ активен"} />
              <span className="rounded-md border border-m3-outline-variant px-2 py-1 text-label-sm font-label-sm text-m3-on-surface-variant">
                {courseModeLabel}
              </span>
            </div>
            <h1 className="text-pretty text-headline-sm font-headline-sm text-m3-on-surface">{course.title}</h1>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-body-md font-body-md">
              <span className="text-m3-on-surface-variant">Прогресс</span>
              <span className="font-semibold text-m3-primary">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
            <p className="text-label-md font-label-md text-m3-on-surface-variant">
              Завершено {progress.completed} из {progress.total} уроков
            </p>
          </div>

          {certificateEligible ? (
            <Button asChild variant="primary" size="sm" className="w-full">
              <Link href="/student/certificates">
                <Icon name="award_star" size={16} aria-hidden="true" />
                Получить сертификат
              </Link>
            </Button>
          ) : (
            <div className="rounded-lg border border-dashed border-m3-outline-variant bg-m3-surface-container-low px-3 py-2 text-center">
              <p className="text-label-md font-label-md text-m3-on-surface-variant">
                Сертификат откроется после {detail.completionThreshold}% курса
              </p>
            </div>
          )}

          {curator && (
            <div className="space-y-2 rounded-lg bg-m3-surface-container-low p-3">
              <p className="text-label-sm font-label-sm text-m3-on-surface-variant">Куратор</p>
              <p className="break-words text-body-md font-body-md text-m3-on-surface">{curator.name}</p>
              {curator.unansweredCount > 0 && (
                <p className="flex items-center gap-1.5 text-label-md font-label-md text-m3-tertiary">
                  <Icon name="help" size={14} aria-hidden="true" />
                  {curator.unansweredCount} неотвеченных вопросов
                </p>
              )}
              {detail.nextLessonId ? (
                <Button asChild size="sm" variant="ghost" className="w-full">
                  <Link href={`/student/lessons/${detail.nextLessonId}`}>
                    <Icon name="help" size={16} aria-hidden="true" />
                    Открыть урок и задать вопрос
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="w-full" disabled>
                  <Icon name="help" size={16} aria-hidden="true" />
                  Задать вопрос
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
