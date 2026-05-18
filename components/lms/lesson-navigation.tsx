import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function LessonNavigation({
  prevLesson,
  nextLesson,
}: {
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string; locked: boolean } | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {prevLesson ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={`/student/lessons/${prevLesson.id}`}>
            <Icon name="arrow_back" size={16} />
            <span className="max-w-[200px] truncate">{prevLesson.title}</span>
          </Link>
        </Button>
      ) : (
        <div />
      )}
      {nextLesson ? (
        nextLesson.locked ? (
          <Button size="sm" disabled title="Урок заблокирован">
            <span className="max-w-[200px] truncate">{nextLesson.title}</span>
            <Icon name="arrow_forward" size={16} />
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href={`/student/lessons/${nextLesson.id}`}>
              <span className="max-w-[200px] truncate">{nextLesson.title}</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </Button>
        )
      ) : null}
    </div>
  );
}
