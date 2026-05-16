"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Menu } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VideoBlock } from "@/components/lms/video-block";
import { TextBlock } from "@/components/lms/text-block";
import { FileBlock } from "@/components/lms/file-block";
import { QuizBlock } from "@/components/lms/quiz-block";
import { AssignmentBlock } from "@/components/lms/assignment-block";
import { LessonRating } from "@/components/lms/lesson-rating";
import { LessonNavigation } from "@/components/lms/lesson-navigation";
import { ProtectedContentShell } from "@/components/lms/security/protected-content-shell";
import dynamic from "next/dynamic";
import type { StudentLessonPlayerDetail } from "@/types/domain";

const CourseContentsDrawer = dynamic(
  () => import("@/components/lms/course-contents-drawer").then((m) => ({ default: m.CourseContentsDrawer })),
  { ssr: false },
);

const ChatPanel = dynamic(
  () => import("@/components/lms/chat-panel").then((m) => ({ default: m.ChatPanel })),
  { ssr: false },
);

export function LessonPlayerShell({ detail, user }: { detail: StudentLessonPlayerDetail; user: { id: string; name?: string | null; email: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { lesson, blocks, courseTree, quizDetails, assignmentDetails, curatorId, curatorName } = detail;
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

  const handleVideoProgress = useCallback((percent: number) => {
    if (percent >= 100 && !isCompleted) {
      markCompleted();
    } else if (percent > progressPercent) {
      setProgressPercent(percent);
    }
  }, [progressPercent, isCompleted, markCompleted]);

  // Determine if we have a videoUrl at the lesson level (legacy) or as a block
  const legacyVideoUrl = lesson.videoUrl;
  const hasContentBlocks = blocks.length > 0;

  return (
    <ProtectedContentShell
      user={user}
      courseId={lesson.courseId}
      lessonId={lesson.id}
      protectionLevel="standard"
    >
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
                aria-label="Содержание курса"
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
            <Badge className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300">Урок {lesson.order}</Badge>
            <Badge className="border-primary/20 bg-primary/5 text-primary">{lesson.durationMinutes} мин.</Badge>
            {isCompleted && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Завершён</Badge>}
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl">{lesson.title}</h1>
          {lesson.summary && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{lesson.summary}</p>}
        </div>

        {/* Block content */}
        <div className="space-y-6">
          {/* Legacy video (if no blocks) */}
          {!hasContentBlocks && legacyVideoUrl && (
            <VideoBlock videoUrl={legacyVideoUrl} title={lesson.title} duration={lesson.durationMinutes} onProgress={handleVideoProgress} />
          )}

          {/* Render blocks from content.blocks */}
          {hasContentBlocks ? (
            blocks.map((block) => {
              switch (block.type) {
                case "video":
                  return <VideoBlock key={block.id} video={block.data.video} videoUrl={block.data.videoUrl || legacyVideoUrl || ""} title={block.data.title} onProgress={handleVideoProgress} />;
                case "text":
                  return <TextBlock key={block.id} html={block.data.html} />;
                case "file":
                  return <FileBlock key={block.id} url={block.data.url} filename={block.data.filename} fileType={block.data.fileType} lessonId={lesson.id} useSignedUrl />;
                case "quiz": {
                  const quiz = quizDetails.find((q) => q.id === block.data.quizId);
                  return quiz ? <QuizBlock key={block.id} quiz={quiz} /> : null;
                }
                case "assignment": {
                  const assignment = assignmentDetails.find((a) => a.id === block.data.assignmentId);
                  return assignment ? <AssignmentBlock key={block.id} assignment={assignment} /> : null;
                }
                case "rating":
                  return <LessonRating key={block.id} lessonId={block.data.lessonId} />;
                case "curator_question":
                  return session?.user?.id && curatorId ? (
                    <div key={block.id} className="space-y-3">
                      <h3 className="text-sm font-semibold">Чат с куратором {curatorName ? `(${curatorName})` : ""}</h3>
                      <ChatPanel studentId={session.user.id} curatorId={curatorId} lessonId={block.data.lessonId} />
                    </div>
                  ) : null;
                case "completion":
                  return (
                    <div key={block.id} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                      <p className="text-sm text-muted-foreground">{block.data.label ?? "Урок завершён"}</p>
                    </div>
                  );
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
                  <FileBlock key={item.id} url={item.url} filename={item.filename ?? undefined} fileType={item.type} lessonId={lesson.id} mediaId={item.id} useSignedUrl />
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <LessonRating lessonId={lesson.id} />

          {/* Chat with curator */}
          {session?.user?.id && curatorId && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Чат с куратором {curatorName ? `(${curatorName})` : ""}</h3>
              <ChatPanel studentId={session.user.id} curatorId={curatorId} lessonId={lesson.id} />
            </div>
          )}

          {/* Navigation */}
          <LessonNavigation prevLesson={lesson.prevLesson} nextLesson={lesson.nextLesson} />
        </div>
      </div>
    </ProtectedContentShell>
  );
}
