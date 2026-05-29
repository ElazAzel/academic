"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VideoBlock } from "@/components/lms/video-block";
import { TextBlock } from "@/components/lms/text-block";
import { FileBlock } from "@/components/lms/file-block";
import { QuizBlock } from "@/components/lms/quiz-block";
import { AssignmentBlock } from "@/components/lms/assignment-block";
import { LessonRating } from "@/components/lms/lesson-rating";
import { LessonNavigation } from "@/components/lms/lesson-navigation";
import { ScormPlayer } from "@/components/lms/scorm-player";
import { ProtectedContentShell } from "@/components/lms/security/protected-content-shell";
import type { ContentBlock, StudentLessonPlayerDetail } from "@/types/domain";

const CourseContentsDrawer = dynamic(
  () => import("@/components/lms/course-contents-drawer").then((m) => ({ default: m.CourseContentsDrawer })),
  { ssr: false },
);

const ChatPanel = dynamic(
  () => import("@/components/lms/chat-panel").then((m) => ({ default: m.ChatPanel })),
  { ssr: false },
);

const blockLabels: Record<ContentBlock["type"], { icon: string; label: string }> = {
  video: { icon: "play_circle", label: "Видео" },
  text: { icon: "notes", label: "Текст" },
  file: { icon: "description", label: "Файл" },
  quiz: { icon: "quiz", label: "Тест" },
  assignment: { icon: "assignment", label: "Задание" },
  rating: { icon: "star", label: "Оценка урока" },
  curator_question: { icon: "support_agent", label: "Вопрос куратору" },
  completion: { icon: "check_circle", label: "Завершение" },
  scorm: { icon: "deployed_code", label: "SCORM" },
};

function buildLessonChecklist({
  blocks,
  fallbackVideo,
  mediaCount,
  quizCount,
  assignmentCount,
  hasDefaultRating,
  hasDefaultCuratorChat,
}: {
  blocks: ContentBlock[];
  fallbackVideo: boolean;
  mediaCount: number;
  quizCount: number;
  assignmentCount: number;
  hasDefaultRating: boolean;
  hasDefaultCuratorChat: boolean;
}) {
  const items = blocks.map((block) => {
    const fallback = blockLabels[block.type];
    return {
      id: block.id,
      icon: fallback.icon,
      label: block.type === "quiz" && quizCount > 1 ? "Тест урока" : fallback.label,
    };
  });

  if (items.length === 0 && fallbackVideo) {
    items.push({ id: "legacy-video", icon: "play_circle", label: "Видео" });
  }

  if (mediaCount > 0) {
    items.push({ id: "media", icon: "attach_file", label: `Материалы: ${mediaCount}` });
  }

  if (quizCount > 0 && !blocks.some((block) => block.type === "quiz")) {
    items.push({ id: "quiz", icon: "quiz", label: quizCount === 1 ? "Тест урока" : `Тесты: ${quizCount}` });
  }

  if (assignmentCount > 0 && !blocks.some((block) => block.type === "assignment")) {
    items.push({ id: "assignment", icon: "assignment", label: assignmentCount === 1 ? "Задание урока" : `Задания: ${assignmentCount}` });
  }

  if (hasDefaultRating) {
    items.push({ id: "rating", icon: "star", label: "Оценка урока" });
  }

  if (hasDefaultCuratorChat) {
    items.push({ id: "curator", icon: "support_agent", label: "Вопрос куратору" });
  }

  return items;
}

export function LessonPlayerShell({
  detail,
  user,
}: {
  detail: StudentLessonPlayerDetail;
  user: { id: string; name?: string | null; email: string };
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { lesson, blocks, courseTree, quizDetails, assignmentDetails, curatorId, curatorName } = detail;
  const [progressPercent, setProgressPercent] = useState(lesson.progressPercent);
  const [savingProgress, setSavingProgress] = useState(false);
  const isCompleted = progressPercent >= 100;
  const hasContentBlocks = blocks.length > 0;
  const legacyVideoUrl = lesson.videoUrl;
  const hasRatingBlock = blocks.some((block) => block.type === "rating");
  const hasCuratorQuestionBlock = blocks.some((block) => block.type === "curator_question");

  const renderedQuizIds = new Set(
    blocks
      .filter((block) => block.type === "quiz")
      .map((block) => block.data.quizId)
      .filter(Boolean),
  );
  const renderedAssignmentIds = new Set(
    blocks
      .filter((block) => block.type === "assignment")
      .map((block) => block.data.assignmentId)
      .filter(Boolean),
  );
  const lessonQuizzes = quizDetails.filter((quiz) => !renderedQuizIds.has(quiz.id));
  const lessonAssignments = assignmentDetails.filter((assignment) => !renderedAssignmentIds.has(assignment.id));
  const showDefaultRating = !hasRatingBlock;
  const showDefaultCuratorChat = !hasCuratorQuestionBlock && Boolean(session?.user?.id && curatorId);
  const checklist = buildLessonChecklist({
    blocks,
    fallbackVideo: !hasContentBlocks && Boolean(legacyVideoUrl),
    mediaCount: lesson.media.length,
    quizCount: lessonQuizzes.length,
    assignmentCount: lessonAssignments.length,
    hasDefaultRating: showDefaultRating,
    hasDefaultCuratorChat: showDefaultCuratorChat,
  });

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
        } else {
          const xp = payload?.data?.xp;
          if (xp && xp.earned > 0) {
            toast.success(`Вы заработали +${xp.earned} XP за завершение урока! Всего: ${xp.xp} XP`);
          } else {
            toast.success("Урок успешно завершён!");
          }
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

  function renderCuratorChat(key: string, lessonId: string) {
    if (!session?.user?.id || !curatorId) return null;

    return (
      <section key={key} className="space-y-3" aria-labelledby={`${key}-heading`}>
        <h2 id={`${key}-heading`} className="text-title-sm font-title-sm text-m3-on-surface">
          Чат с куратором{curatorName ? ` (${curatorName})` : ""}
        </h2>
        <ChatPanel studentId={session.user.id} curatorId={curatorId} lessonId={lessonId} />
      </section>
    );
  }

  function renderBlock(block: ContentBlock) {
    switch (block.type) {
      case "video":
        return (
          <VideoBlock
            key={block.id}
            video={block.data.video}
            videoUrl={block.data.videoUrl || legacyVideoUrl || ""}
            title={block.data.title}
            onProgress={handleVideoProgress}
          />
        );
      case "text":
        return <TextBlock key={block.id} html={block.data.html} />;
      case "file":
        return (
          <FileBlock
            key={block.id}
            url={block.data.url}
            filename={block.data.filename}
            fileType={block.data.fileType}
            lessonId={lesson.id}
            useSignedUrl
          />
        );
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
        return renderCuratorChat(block.id, block.data.lessonId || lesson.id);
      case "completion":
        return (
          <div key={block.id} className="rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-5 text-center shadow-m3-soft">
            <p className="text-body-md font-body-md text-m3-on-surface-variant">{block.data.label ?? "Урок завершён"}</p>
          </div>
        );
      case "scorm":
        return (
          <ScormPlayer
            key={block.id}
            entryUrl={`/api/v1/scorm/serve/${block.data.packageId}/index.html`}
            lessonId={lesson.id}
            title="SCORM-пакет"
          />
        );
      default:
        return null;
    }
  }

  return (
    <ProtectedContentShell
      user={user}
      courseId={lesson.courseId}
      lessonId={lesson.id}
      protectionLevel="standard"
    >
      <div className="sticky top-0 z-20 -mx-4 border-b border-m3-outline-variant bg-m3-surface-container-lowest px-4 py-3 shadow-m3-soft sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={`/student/courses/${lesson.courseId}`}
                className="flex shrink-0 items-center gap-1 text-label-md font-label-md text-m3-on-surface-variant transition-colors hover:text-m3-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
              >
                <Icon name="arrow_back" size={14} aria-hidden="true" />
                Курс
              </Link>
              <span className="hidden text-m3-outline sm:inline">/</span>
              <span className="hidden min-w-0 truncate text-label-md font-label-md text-m3-on-surface-variant md:block">{lesson.moduleTitle}</span>
              <span className="hidden text-m3-outline md:inline">/</span>
              <span className="min-w-0 truncate text-label-md font-label-md text-m3-on-surface">{lesson.title}</span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <CourseContentsDrawer modules={courseTree} currentLessonId={lesson.id}>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
                  title="Содержание курса"
                  aria-label="Содержание курса"
                >
                  <Icon name="menu" size={17} aria-hidden="true" />
                </button>
              </CourseContentsDrawer>
              {lesson.prevLesson && (
                <Link
                  href={`/student/lessons/${lesson.prevLesson.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
                  title={lesson.prevLesson.title}
                  aria-label={`Предыдущий урок: ${lesson.prevLesson.title}`}
                >
                  <Icon name="arrow_back" size={17} aria-hidden="true" />
                </Link>
              )}
              {lesson.nextLesson ? (
                lesson.nextLesson.locked ? (
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant/50"
                    title="Следующий урок заблокирован"
                    aria-label="Следующий урок заблокирован"
                    disabled
                  >
                    <Icon name="lock" size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <Link
                    href={`/student/lessons/${lesson.nextLesson.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
                    title={lesson.nextLesson.title}
                    aria-label={`Следующий урок: ${lesson.nextLesson.title}`}
                  >
                    <Icon name="arrow_forward" size={17} aria-hidden="true" />
                  </Link>
                )
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
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
              className="w-full shrink-0 whitespace-nowrap sm:w-auto"
            >
              {isCompleted ? (
                <>
                  <Icon name="check_circle" size={16} aria-hidden="true" />
                  Завершён
                </>
              ) : savingProgress ? (
                "Сохранение…"
              ) : (
                "Отметить пройденным"
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="student-lesson-player-grid mx-auto grid max-w-6xl gap-6 py-6">
        <main className="student-lesson-player-main min-w-0 space-y-6">
          <section className="space-y-3" aria-labelledby="lesson-title">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-m3-primary-fixed px-2 py-1 text-label-md font-label-md text-m3-primary">Урок {lesson.order}</span>
              <span className="rounded-md border border-m3-outline-variant px-2 py-1 text-label-md font-label-md text-m3-on-surface-variant">{lesson.durationMinutes} мин.</span>
              <span className="rounded-md border border-m3-outline-variant px-2 py-1 text-label-md font-label-md text-m3-on-surface-variant">
                {lesson.isRequired ? "Обязательный" : "Дополнительный"}
              </span>
              {isCompleted && (
                <span className="rounded-md bg-m3-secondary-fixed px-2 py-1 text-label-md font-label-md text-m3-secondary">Завершён</span>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-label-md font-label-md text-m3-on-surface-variant">{lesson.courseTitle} / {lesson.moduleTitle}</p>
              <h1 id="lesson-title" className="text-pretty text-headline-md font-headline-md text-m3-on-surface">{lesson.title}</h1>
              {lesson.summary && <p className="max-w-3xl text-body-md font-body-md text-m3-on-surface-variant">{lesson.summary}</p>}
            </div>
          </section>

          <div className="space-y-6">
            {!hasContentBlocks && legacyVideoUrl && (
              <VideoBlock videoUrl={legacyVideoUrl} title={lesson.title} duration={lesson.durationMinutes} onProgress={handleVideoProgress} />
            )}

            {hasContentBlocks ? (
              blocks.map((block) => renderBlock(block))
            ) : (
              legacyVideoUrl ? null : (
                <div className="rounded-lg border border-dashed border-m3-outline-variant bg-m3-surface-container-lowest px-5 py-8 text-center shadow-m3-soft">
                  <p className="text-body-md font-body-md text-m3-on-surface-variant">
                    {lesson.summary || "Материалы урока пока не опубликованы."}
                  </p>
                </div>
              )
            )}

            {lessonQuizzes.length > 0 && (
              <section className="space-y-3" aria-labelledby="lesson-quizzes-heading">
                <h2 id="lesson-quizzes-heading" className="text-title-sm font-title-sm text-m3-on-surface">Тест урока</h2>
                {lessonQuizzes.map((quiz) => (
                  <QuizBlock key={quiz.id} quiz={quiz} />
                ))}
              </section>
            )}

            {lessonAssignments.length > 0 && (
              <section className="space-y-3" aria-labelledby="lesson-assignments-heading">
                <h2 id="lesson-assignments-heading" className="text-title-sm font-title-sm text-m3-on-surface">Задание урока</h2>
                {lessonAssignments.map((assignment) => (
                  <AssignmentBlock key={assignment.id} assignment={assignment} />
                ))}
              </section>
            )}

            {lesson.media.length > 0 && (
              <section className="space-y-3" aria-labelledby="lesson-materials-heading">
                <h2 id="lesson-materials-heading" className="text-title-sm font-title-sm text-m3-on-surface">Материалы</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {lesson.media.map((item) => (
                    <FileBlock key={item.id} url={item.url} filename={item.filename ?? undefined} fileType={item.type} lessonId={lesson.id} mediaId={item.id} useSignedUrl />
                  ))}
                </div>
              </section>
            )}

            {showDefaultRating && <LessonRating lessonId={lesson.id} />}
            {showDefaultCuratorChat && renderCuratorChat("lesson-curator-chat", lesson.id)}

            <LessonNavigation prevLesson={lesson.prevLesson} nextLesson={lesson.nextLesson} />
          </div>
        </main>

        <aside className="student-lesson-player-aside hidden">
          <div className="sticky top-32 space-y-4 rounded-lg border border-m3-outline-variant bg-m3-surface-container-lowest p-4 shadow-m3-soft">
            <div>
              <h2 className="text-title-sm font-title-sm text-m3-on-surface">В этом уроке</h2>
            </div>
            <div className="space-y-2">
              {checklist.length > 0 ? (
                checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-m3-surface-container-low px-3 py-2 text-label-md font-label-md text-m3-on-surface-variant">
                    <Icon name={item.icon} size={15} className="text-m3-primary" aria-hidden="true" />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-m3-outline-variant px-3 py-4 text-center text-label-md font-label-md text-m3-on-surface-variant">
                  Состав урока появится после публикации материалов.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </ProtectedContentShell>
  );
}
