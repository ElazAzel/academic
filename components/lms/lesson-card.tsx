import Link from "next/link";
import { BookOpen, CheckCircle2, FileText, Lock, PlayCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/lms/status-badge";
import { cn } from "@/lib/utils";
import type { LessonPlayerCard as LessonCardType, LessonType } from "@/types/domain";
import type { BadgeStatus } from "@/components/lms/status-badge";

const LESSON_ICONS: Record<LessonType, React.ComponentType<{ className?: string }>> = {
  VIDEO: Video,
  VIDEO_DOCUMENT: PlayCircle,
  QUIZ: FileText,
  ASSIGNMENT: FileText,
  TEXT: BookOpen,
  DOCUMENT: FileText,
  LIVE: Video,
  RECORDING: Video,
  MIXED: BookOpen,
};

const CTA_LABELS: Record<string, string> = {
  start: "Начать",
  continue: "Продолжить",
  repeat: "Повторить",
  locked: "Заблокировано",
};

export function LessonCard({ lesson }: { lesson: LessonCardType }) {
  const Icon = LESSON_ICONS[lesson.type] ?? BookOpen;
  const isLocked = lesson.completionCta === "locked";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-all",
        isLocked ? "opacity-50" : "hover:border-primary/20 hover:bg-primary/[0.02]"
      )}
    >
      {/* Icon */}
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        isLocked ? "bg-muted/60 text-muted-foreground" : "bg-primary/10 text-primary"
      )}>
        <Icon className="h-4 w-4" />
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium line-clamp-1">{lesson.order}. {lesson.title}</p>
          <StatusBadge status={lesson.status as BadgeStatus} className="shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{lesson.durationMinutes} мин.</span>
          {lesson.isRequired && <StatusBadge status="ACTIVE" label="Обязательный" className="shrink-0 text-[10px]" />}
          {lesson.hasQuiz && <StatusBadge status="IN_REVIEW" label="Тест" className="shrink-0 text-[10px]" />}
          {lesson.hasAssignment && <StatusBadge status="forwarded" label="Задание" className="shrink-0 text-[10px]" />}
        </div>
        {isLocked && lesson.lockReason && (
          <p className="text-xs text-muted-foreground/60">{lesson.lockReason}</p>
        )}
      </div>

      {/* CTA */}
      {isLocked ? (
        <div className="shrink-0 self-center" title="Урок заблокирован">
          <Lock className="h-4 w-4 text-muted-foreground/40" />
        </div>
      ) : (
        <Button asChild size="sm" className="shrink-0 self-center" variant={lesson.completionCta === "repeat" ? "secondary" : "primary"}>
          <Link href={`/student/lessons/${lesson.id}`}>
            {lesson.completionCta === "start" && <PlayCircle className="h-3.5 w-3.5" />}
            {lesson.completionCta === "repeat" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {CTA_LABELS[lesson.completionCta]}
          </Link>
        </Button>
      )}
    </div>
  );
}
