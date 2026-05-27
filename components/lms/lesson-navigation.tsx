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
    <nav className="flex flex-col gap-3 border-t border-m3-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Навигация по урокам">
      {prevLesson ? (
        <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
          <Link href={`/student/lessons/${prevLesson.id}`}>
            <Icon name="arrow_back" size={16} aria-hidden="true" />
            <span className="min-w-0 truncate">Предыдущий: {prevLesson.title}</span>
          </Link>
        </Button>
      ) : (
        <div className="hidden sm:block" />
      )}
      {nextLesson ? (
        nextLesson.locked ? (
          <Button size="sm" disabled title="Урок заблокирован" className="w-full sm:w-auto">
            <span className="min-w-0 truncate">Следующий: {nextLesson.title}</span>
            <Icon name="lock" size={16} aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href={`/student/lessons/${nextLesson.id}`}>
              <span className="min-w-0 truncate">Следующий: {nextLesson.title}</span>
              <Icon name="arrow_forward" size={16} aria-hidden="true" />
            </Link>
          </Button>
        )
      ) : null}
    </nav>
  );
}
