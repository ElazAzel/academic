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

  return (
    <div className="sticky top-24 space-y-4">
      {/* Cover image */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-m3-primary-container/30 to-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 ease-in-out">
        {course.coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={course.coverUrl} alt={course.title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <Icon name="image" size={40} className="text-m3-on-surface-variant/40" />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          {/* Title */}
          <h1 className="text-headline-sm font-headline-sm text-m3-on-surface">{course.title}</h1>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-body-md font-body-md">
              <span className="text-m3-on-surface-variant">Прогресс</span>
              <span className="font-semibold text-m3-primary">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
            <p className="text-label-md font-label-md text-m3-on-surface-variant">{progress.completed}/{progress.total} уроков</p>
          </div>

          {/* Certificate */}
          {certificateEligible ? (
            <Button asChild variant="primary" size="sm" className="w-full">
              <Link href="/student/certificates">
                <Icon name="award_star" size={16} />
                Получить сертификат
              </Link>
            </Button>
          ) : (
            <div className="rounded-xl border border-dashed border-m3-outline-variant bg-m3-surface-container-low px-3 py-2 text-center">
              <p className="text-label-md font-label-md text-m3-on-surface-variant">Сертификат после {detail.completionThreshold}%</p>
            </div>
          )}

          {/* Curator */}
          {curator && (
            <div className="space-y-2 rounded-xl bg-m3-surface-container-low p-3">
              <p className="text-label-sm font-label-sm text-m3-on-surface-variant">Куратор</p>
              <p className="text-body-md font-body-md text-m3-on-surface">{curator.name}</p>
              {curator.unansweredCount > 0 && (
                <p className="flex items-center gap-1.5 text-label-md font-label-md text-m3-tertiary">
                  <Icon name="help" size={14} />
                  {curator.unansweredCount} неотвеченных вопросов
                </p>
              )}
              {detail.nextLessonId ? (
                <Button asChild size="sm" variant="ghost" className="w-full">
                  <Link href={`/student/lessons/${detail.nextLessonId}`}>
                    <Icon name="help" size={16} />
                    Задать вопрос
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="w-full" disabled>
                  <Icon name="help" size={16} />
                  Задать вопрос
                </Button>
              )}
            </div>
          )}

          {/* Enrollment status */}
          {isPaused && (
            <StatusBadge status="PAUSED" className="w-full justify-center" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
