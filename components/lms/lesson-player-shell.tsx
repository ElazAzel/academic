"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Menu } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VideoBlock } from "@/components/lms/video-block";
import { TextBlock } from "@/components/lms/text-block";
import { FileBlock } from "@/components/lms/file-block";
import { LessonRating } from "@/components/lms/lesson-rating";
import { AskCuratorQuestion } from "@/components/lms/ask-curator-question";
import { LessonNavigation } from "@/components/lms/lesson-navigation";
import { CourseContentsDrawer } from "@/components/lms/course-contents-drawer";
import type { StudentLessonPlayerDetail } from "@/types/domain";

export function LessonPlayerShell({ detail }: { detail: StudentLessonPlayerDetail }) {
  const router = useRouter();
  const { lesson, blocks, courseTree } = detail;
  const [progressPercent, setProgressPercent] = useState(lesson.progressPercent);
  const [savingProgress, setSavingProgress] = useState(false);
  const isCompleted = progressPercent >= 100;

  const markCompleted = useCallback(async () => {
    setSavingProgress(true);
    try {
      const res = await fetch("/api/v1/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, percent: 100 }),
      });
      if (res.ok) {
        setProgressPercent(100);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || "Не удалось сохранить прогресс");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSavingProgress(false);
    }
  }, [lesson.id, router]);

  // Determine if we have a videoUrl at the lesson level (legacy) or as a block
  const legacyVideoUrl = lesson.videoUrl;
  const hasContentBlocks = blocks.length > 0;

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/student/courses/${lesson.courseId}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Курс
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:inline">/</span>
            <span className="text-xs text-muted-foreground hidden sm:block truncate">{lesson.moduleTitle}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">/</span>
            <span className="text-xs font-medium truncate">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CourseContentsDrawer modules={courseTree} currentLessonId={lesson.id}>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                title="Содержание курса"
              >
                <Menu className="h-4 w-4" />
              </button>
            </CourseContentsDrawer>
            {lesson.prevLesson && (
              <Link
                href={`/student/lessons/${lesson.prevLesson.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                title={lesson.prevLesson.title}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            {lesson.nextLesson && !lesson.nextLesson.locked && (
              <Link
                href={`/student/lessons/${lesson.nextLesson.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                title={lesson.nextLesson.title}
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 py-6">
        {/* Sticky progress bar */}
        <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-md border-b">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Прогресс урока</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
            <Button
              size="sm"
              variant={isCompleted ? "secondary" : "primary"}
              onClick={markCompleted}
              disabled={savingProgress || isCompleted}
              className="shrink-0"
            >
              {isCompleted ? (
                <><CheckCircle2 className="h-4 w-4" /> Завершён</>
              ) : savingProgress ? (
                "Сохранение..."
              ) : (
                "Отметить пройденным"
              )}
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">Урок {lesson.order}</Badge>
            <Badge className="border-primary/20 bg-primary/5 text-primary">{lesson.durationMinutes} мин.</Badge>
            {isCompleted && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Завершён</Badge>}
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl">{lesson.title}</h1>
          {lesson.summary && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{lesson.summary}</p>}
        </div>

        {/* Block content */}
        <div className="space-y-6">
          {/* Legacy video (if no blocks) */}
          {!hasContentBlocks && legacyVideoUrl && (
            <VideoBlock url={legacyVideoUrl} title={lesson.title} duration={lesson.durationMinutes} />
          )}

          {/* Render blocks from content.blocks */}
          {hasContentBlocks ? (
            blocks.map((block, i) => {
              switch (block.type) {
                case "video":
                  return <VideoBlock key={i} url={(block.data.videoUrl as string) || legacyVideoUrl || ""} title={block.data.title as string} duration={block.data.duration as number} />;
                case "text":
                  return <TextBlock key={i} html={(block.data.html as string) || ""} />;
                case "file":
                  return <FileBlock key={i} url={(block.data.url as string) || ""} filename={block.data.filename as string} fileType={block.data.fileType as string} />;
                default:
                  return null;
              }
            })
          ) : (
            /* Legacy: render text from lesson.content */
            legacyVideoUrl ? null : (
              <div className="mx-auto max-w-[720px] text-sm leading-relaxed text-muted-foreground">
                {lesson.summary || "Материалы урока пока не опубликованы."}
              </div>
            )
          )}

          {/* Materials section (legacy media files) */}
          {lesson.media.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Материалы</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {lesson.media.map((item) => (
                  <FileBlock key={item.id} url={item.url} filename={item.filename ?? undefined} fileType={item.type} />
                ))}
              </div>
            </div>
          )}

          {/* Quizzes (still link to separate pages — PR 4 will embed) */}
          {lesson.quizzes.length > 0 && (
            <div className="rounded-2xl border bg-card">
              <div className="px-5 py-4 font-semibold text-sm border-b">Тесты ({lesson.quizzes.length})</div>
              <div className="p-2 space-y-1">
                {lesson.quizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground">{quiz.questionsCount} вопр. · порог {quiz.passThreshold}%</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/student/quizzes/${quiz.id}`}>Пройти</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments (still link to separate pages — PR 4 will embed) */}
          {lesson.assignments.length > 0 && (
            <div className="rounded-2xl border bg-card">
              <div className="px-5 py-4 font-semibold text-sm border-b">Задания ({lesson.assignments.length})</div>
              <div className="p-2 space-y-1">
                {lesson.assignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {a.deadline && <Badge className="text-[10px]">Дедлайн: {a.deadline.slice(0, 10)}</Badge>}
                        <Badge className={a.submissionStatus ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"}>
                          {a.submissionStatus ?? "Не отправлено"}
                        </Badge>
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/student/assignments/${a.id}`}>Открыть</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <LessonRating lessonId={lesson.id} />

          {/* Ask curator question */}
          <AskCuratorQuestion lessonId={lesson.id} initialQuestions={lesson.myQuestions} />

          {/* Navigation */}
          <LessonNavigation prevLesson={lesson.prevLesson} nextLesson={lesson.nextLesson} />
        </div>
      </div>
    </>
  );
}
