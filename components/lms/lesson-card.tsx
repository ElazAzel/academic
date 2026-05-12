import Link from "next/link";
import { BookOpen, CheckCircle2, FileText, Lock, PlayCircle, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LessonPlayerCard as LessonCardType, LessonType } from "@/types/domain";

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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: "Завершён", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  IN_PROGRESS: { label: "В процессе", cls: "border-sky-200 bg-sky-50 text-sky-700" },
  BLOCKED: { label: "Заблокирован", cls: "border-gray-200 bg-gray-50 text-gray-500" },
  NOT_STARTED: { label: "Не начат", cls: "border-gray-200 bg-gray-50 text-gray-500" },
};

export function LessonCard({ lesson }: { lesson: LessonCardType }) {
  const Icon = LESSON_ICONS[lesson.type] ?? BookOpen;
  const isLocked = lesson.completionCta === "locked";
  const sb = STATUS_BADGE[lesson.status] ?? STATUS_BADGE.NOT_STARTED;

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
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{lesson.order}. {lesson.title}</p>
          <Badge className={sb.cls}>{sb.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{lesson.durationMinutes} мин.</span>
          {lesson.isRequired && <Badge className="border-primary/20 bg-primary/5 text-primary text-[10px]">Обязательный</Badge>}
          {lesson.hasQuiz && <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">Тест</Badge>}
          {lesson.hasAssignment && <Badge className="border-violet-200 bg-violet-50 text-violet-700 text-[10px]">Задание</Badge>}
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
