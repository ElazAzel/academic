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

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-m3-outline-variant bg-m3-surface-container-lowest p-3 transition-all duration-200 ease-in-out shadow-m3-soft",
        isLocked ? "opacity-50" : "active:scale-[0.98] hover:shadow-m3-soft-hover hover:border-m3-outline"
      )}
    >
      {/* Icon */}
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        isLocked ? "bg-m3-surface-container-high text-m3-on-surface-variant" : "bg-m3-primary-container text-m3-primary"
      )}>
        <Icon name={iconName} size={16} />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-body-md font-body-md text-m3-on-surface line-clamp-1">{lesson.order}. {lesson.title}</p>
          <StatusBadge status={lesson.status as BadgeStatus} className="shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-label-sm font-label-sm text-m3-on-surface-variant">
          <span>{lesson.durationMinutes} мин.</span>
          {lesson.isRequired && <StatusBadge status="ACTIVE" label="Обязательный" className="shrink-0" />}
          {lesson.hasQuiz && <StatusBadge status="IN_REVIEW" label="Тест" className="shrink-0" />}
          {lesson.hasAssignment && <StatusBadge status="forwarded" label="Задание" className="shrink-0" />}
        </div>
        {isLocked && lesson.lockReason && (
          <p className="text-label-sm font-label-sm text-m3-on-surface-variant/60">{lesson.lockReason}</p>
        )}
      </div>

      {/* CTA */}
      {isLocked ? (
        <div className="shrink-0 self-center" title="Урок заблокирован">
          <Icon name="lock" size={16} className="text-m3-on-surface-variant/40" />
        </div>
      ) : (
        <Button asChild size="sm" className="shrink-0 self-center" variant={lesson.completionCta === "repeat" ? "secondary" : "primary"}>
          <Link href={`/student/lessons/${lesson.id}`}>
            {lesson.completionCta === "start" && <Icon name="play_circle" size={14} />}
            {lesson.completionCta === "repeat" && <Icon name="check_circle" size={14} />}
            {CTA_LABELS[lesson.completionCta]}
          </Link>
        </Button>
      )}
    </div>
  );
}
