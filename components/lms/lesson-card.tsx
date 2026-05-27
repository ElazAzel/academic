import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/lms/status-badge";
import { cn } from "@/lib/utils";
import type { LessonPlayerCard as LessonCardType, LessonType } from "@/types/domain";
import type { BadgeStatus } from "@/components/lms/status-badge";

const LESSON_ICONS: Record<LessonType, string> = {
  VIDEO: "videocam",
  VIDEO_DOCUMENT: "play_circle",
  QUIZ: "description",
  ASSIGNMENT: "description",
  TEXT: "menu_book",
  DOCUMENT: "description",
  LIVE: "videocam",
  RECORDING: "videocam",
  MIXED: "menu_book",
};

const CTA_LABELS: Record<string, string> = {
  start: "Начать",
  continue: "Продолжить",
  repeat: "Повторить",
  locked: "Заблокировано",
};

export function LessonCard({ lesson }: { lesson: LessonCardType }) {
  const iconName = LESSON_ICONS[lesson.type] ?? "menu_book";
  const isLocked = lesson.completionCta === "locked";
  const ctaLabel = CTA_LABELS[lesson.completionCta];

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-3 shadow-m3-soft transition-colors duration-200 ease-in-out sm:flex-row sm:items-start",
        isLocked ? "opacity-60" : "hover:border-m3-outline hover:bg-m3-surface-container-low"
      )}
      aria-label={`${lesson.order}. ${lesson.title}`}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <span className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          isLocked ? "bg-m3-surface-container-high text-m3-on-surface-variant" : "bg-m3-primary-container text-m3-primary"
        )}>
          <Icon name={iconName} size={16} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="min-w-0 break-words text-body-md font-body-md text-m3-on-surface">
              {lesson.order}. {lesson.title}
            </p>
            <StatusBadge status={lesson.status as BadgeStatus} className="shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-label-sm font-label-sm text-m3-on-surface-variant">
            <span>{lesson.durationMinutes} мин.</span>
            {lesson.isRequired && <StatusBadge status="ACTIVE" label="Обязательный" className="shrink-0" />}
            {lesson.hasQuiz && <StatusBadge status="IN_REVIEW" label="Тест" className="shrink-0" />}
            {lesson.hasAssignment && <StatusBadge status="forwarded" label="Задание" className="shrink-0" />}
          </div>
          {isLocked && lesson.lockReason && (
            <p className="break-words text-label-sm font-label-sm text-m3-on-surface-variant/70">{lesson.lockReason}</p>
          )}
        </div>
      </div>

      {isLocked ? (
        <div className="flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-m3-outline-variant text-label-md font-label-md text-m3-on-surface-variant sm:w-auto sm:px-3" title="Урок заблокирован">
          <Icon name="lock" size={16} className="text-m3-on-surface-variant/50" aria-hidden="true" />
          <span className="sm:hidden">Заблокировано</span>
        </div>
      ) : (
        <Button asChild size="sm" className="w-full shrink-0 whitespace-nowrap sm:w-auto sm:self-center" variant={lesson.completionCta === "repeat" ? "secondary" : "primary"}>
          <Link href={`/student/lessons/${lesson.id}`}>
            {lesson.completionCta === "start" && <Icon name="play_circle" size={14} aria-hidden="true" />}
            {lesson.completionCta === "repeat" && <Icon name="check_circle" size={14} aria-hidden="true" />}
            {ctaLabel}
          </Link>
        </Button>
      )}
    </article>
  );
}
