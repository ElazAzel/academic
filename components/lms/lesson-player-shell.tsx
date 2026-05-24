"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
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

const LessonDiscussion = dynamic(
  () => import("@/components/lms/lesson-discussion").then((m) => ({ default: m.LessonDiscussion })),
  { ssr: false },
);

export function LessonPlayerShell({ detail, user }: { detail: StudentLessonPlayerDetail; user: { id: string; name?: string | null; email: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { lesson, blocks, courseTree, quizDetails, assignmentDetails, curatorId, curatorName } = detail;
  const [progressPercent, setProgressPercent] = useState(lesson.progressPercent);
  const [savingProgress, setSavingProgress] = useState(false);
  const isCompleted = progressPercent >= 100;
  const renderedQuizIds = new Set(
    blocks
      .filter((block) => block.type === "quiz")
      .map((block) => block.data.quizId)
      .filter(Boolean)
  );
  const renderedAssignmentIds = new Set(
    blocks
      .filter((block) => block.type === "assignment")
      .map((block) => block.data.assignmentId)
      .filter(Boolean)
  );
  const lessonQuizzes = quizDetails.filter((quiz) => !renderedQuizIds.has(quiz.id));
  const lessonAssignments = assignmentDetails.filter((assignment) => !renderedAssignmentIds.has(assignment.id));

  const markCompleted = useCallback(async () => {
    setSavingProgress(true);
    try {
      const res = await fetch("/api/v1/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, percent: 100 }),
      });
      if (res.ok) {
        const payload = await res.json().catch(() => null);
        const savedPercent = payload?.data?.lessonProgress?.percent;
        const nextPercent = typeof savedPercent === "number" ? savedPercent : 100;
        setProgressPercent(nextPercent);
        if (nextPercent < 100) {
          toast.info("Сначала завершите обязательный тест или задание урока");
        }
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

  const legacyVideoUrl = lesson.videoUrl;
  const hasContentBlocks = blocks.length > 0;

  return (
    <ProtectedContentShell
      user={user}
      courseId={lesson.courseId}
      lessonId={lesson.id}
      protectionLevel="standard"
    >
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-2 shadow-m3-soft sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/student/courses/${lesson.courseId}`}
              className="flex shrink-0 items-center gap-1 text-xs text-m3-on-surface-variant transition-colors hover:text-m3-primary"
            >
            <Icon name="arrow_back" size={14} className="text-m3-on-surface-variant" />
            Курс
            </Link>
            <span className="hidden text-xs text-m3-outline sm:inline">/</span>
            <span className="hidden truncate text-xs text-m3-on-surface-variant sm:block">{lesson.moduleTitle}</span>
            <span className="hidden text-xs text-m3-outline sm:inline">/</span>
            <span className="truncate text-xs font-medium text-m3-on-surface">{lesson.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <CourseContentsDrawer modules={courseTree} currentLessonId={lesson.id}>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container-high"
                title="Содержание курса"
                aria-label="Содержание курса"
              >
                <Icon name="menu" size={16} />
              </button>
            </CourseContentsDrawer>
            {lesson.prevLesson && (
              <Link
                href={`/student/lessons/${lesson.prevLesson.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container-high"
                title={lesson.prevLesson.title}
              >
                <Icon name="arrow_back" size={16} />
              </Link>
            )}
            {lesson.nextLesson && !lesson.nextLesson.locked && (
              <Link
                href={`/student/lessons/${lesson.nextLesson.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container-high"
                title={lesson.nextLesson.title}
              >
                <Icon name="arrow_forward" size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 py-6">
        {/* ── Progress bar ────────────────────────────── */}
        <div className="sticky top-16 z-10 -mx-4 border-b border-m3-outline-variant bg-m3-surface-container-low px-4 py-3 sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-label-md font-label-md text-m3-on-surface-variant">
                <span>Прогресс урока</span>
                <span className="font-semibold text-m3-primary">{progressPercent}%</span>
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
                <><Icon name="check_circle" size={16} /> Завершён</>
              ) : savingProgress ? (
                "Сохранение..."
              ) : (
                "Отметить пройденным"
              )}
            </Button>
          </div>
        </div>

        {/* ── Title ───────────────────────────────────── */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded bg-m3-primary-fixed px-2 py-0.5 text-label-md font-label-md text-m3-primary">Урок {lesson.order}</span>
            <span className="rounded border border-m3-outline-variant px-2 py-0.5 text-label-md font-label-md text-m3-on-surface-variant">{lesson.durationMinutes} мин.</span>
            {isCompleted && (
              <span className="rounded bg-m3-secondary-fixed px-2 py-0.5 text-label-md font-label-md text-m3-secondary">Завершён</span>
            )}
          </div>
          <h1 className="text-headline-md font-headline-md text-m3-on-surface">{lesson.title}</h1>
          {lesson.summary && <p className="mt-1 max-w-2xl text-body-md font-body-md text-m3-on-surface-variant">{lesson.summary}</p>}
        </div>

        {/* ── Content blocks ─────────────────────────── */}
        <div className="space-y-6">
          {!hasContentBlocks && legacyVideoUrl && (
            <VideoBlock videoUrl={legacyVideoUrl} title={lesson.title} duration={lesson.durationMinutes} onProgress={handleVideoProgress} />
          )}

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
                  return <LessonRating key={block.id} lessonId={block.data.lessonId || lesson.id} />;
                case "curator_question":
                  return session?.user?.id && curatorId ? (
                    <div key={block.id} className="space-y-3">
                      <h3 className="text-label-lg font-label-lg text-m3-on-surface">Чат с куратором {curatorName ? `(${curatorName})` : ""}</h3>
                      <ChatPanel studentId={session.user.id} curatorId={curatorId} lessonId={block.data.lessonId || lesson.id} />
                    </div>
                  ) : null;
                case "completion":
                  return (
                    <div key={block.id} className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-6 text-center shadow-m3-soft">
                      <p className="text-body-md font-body-md text-m3-on-surface-variant">{block.data.label ?? "Урок завершён"}</p>
                    </div>
                  );
                default:
                  return null;
              }
            })
          ) : (
            legacyVideoUrl ? null : (
              <div className="mx-auto max-w-[720px] text-body-md font-body-md text-m3-on-surface-variant">
                {lesson.summary || "Материалы урока пока не опубликованы."}
              </div>
            )
          )}

          {lessonQuizzes.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-label-lg font-label-lg text-m3-on-surface">Тест урока</h3>
              {lessonQuizzes.map((quiz) => (
                <QuizBlock key={quiz.id} quiz={quiz} />
              ))}
            </section>
          )}

          {lessonAssignments.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-label-lg font-label-lg text-m3-on-surface">Задание урока</h3>
              {lessonAssignments.map((assignment) => (
                <AssignmentBlock key={assignment.id} assignment={assignment} />
              ))}
            </section>
          )}

          {/* Materials */}
          {lesson.media.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-label-lg font-label-lg text-m3-on-surface">Материалы</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {lesson.media.map((item) => (
                  <FileBlock key={item.id} url={item.url} filename={item.filename ?? undefined} fileType={item.type} lessonId={lesson.id} mediaId={item.id} useSignedUrl />
                ))}
              </div>
            </div>
          )}

          <LessonRating lessonId={lesson.id} />

          {session?.user?.id && curatorId && (
            <div className="space-y-3">
              <h3 className="text-label-lg font-label-lg text-m3-on-surface">Чат с куратором {curatorName ? `(${curatorName})` : ""}</h3>
              <ChatPanel studentId={session.user.id} curatorId={curatorId} lessonId={lesson.id} />
            </div>
          )}

          {/* Lesson discussion (Phase 2.6) */}
          <div className="space-y-3">
            <LessonDiscussion lessonId={lesson.id} />
          </div>

          <LessonNavigation prevLesson={lesson.prevLesson} nextLesson={lesson.nextLesson} />
        </div>
      </div>
    </ProtectedContentShell>
  );
}
