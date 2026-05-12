import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
            <ArrowLeft className="h-4 w-4" />
            {prevLesson.title}
          </Link>
        </Button>
      ) : (
        <div />
      )}
      {nextLesson ? (
        nextLesson.locked ? (
          <Button size="sm" disabled title="Урок заблокирован">
            {nextLesson.title}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href={`/student/lessons/${nextLesson.id}`}>
              {nextLesson.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )
      ) : null}
    </div>
  );
}
