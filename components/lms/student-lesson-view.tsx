"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StudentLessonLearningDetail } from "@/types/domain";

function normalizeVideoUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const vid = u.searchParams.get("v") || u.pathname.slice(1);
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
  } catch {}
  return url;
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold transition-colors hover:bg-muted/30"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function getContentBlocks(content: Record<string, unknown> | string | null | undefined) {
  if (typeof content === "string") return [{ type: "paragraph", text: content }];
  if (!content || typeof content !== "object") return [];
  if ("text" in content && typeof (content as { text: unknown }).text === "string") return [{ type: "paragraph", text: (content as { text: string }).text }];
  const blocks = content && "blocks" in content ? (content as { blocks: unknown }).blocks : null;
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block) => {
    if (!block || typeof block !== "object" || !("text" in block)) return [];
    const t = (block as { text?: unknown }).text;
    if (typeof t !== "string") return [];
    return [{ type: typeof (block as { type?: unknown }).type === "string" ? (block as { type: string }).type : "paragraph", text: t }];
  });
}

export function StudentLessonView({ lesson }: { lesson: StudentLessonLearningDetail }) {
  const router = useRouter();
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressPercent, setProgressPercent] = useState(lesson.progressPercent);
  const contentBlocks = getContentBlocks(lesson.content);
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

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <Link href="/student/my-courses" className="hover:text-foreground transition-colors">Мои курсы</Link>
        <span>/</span>
        <Link href={`/student/courses/${lesson.courseId}`} className="hover:text-foreground transition-colors">{lesson.courseTitle}</Link>
        <span>/</span>
        <span className="text-foreground">{lesson.moduleTitle}</span>
      </nav>

      {/* Sticky progress bar */}
      <div className="sticky top-20 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-md border-b mb-6">
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
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className="border-sky-200 bg-sky-50 text-sky-700">Урок {lesson.order}</Badge>
          <Badge className="border-primary/20 bg-primary/5 text-primary">{lesson.durationMinutes} мин.</Badge>
          {isCompleted && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Завершён</Badge>}
        </div>
        <h1 className="text-xl font-semibold sm:text-2xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{lesson.summary}</p>}
      </div>

      <div className="space-y-4">
        {/* Video */}
        {lesson.videoUrl && (
          <div className="overflow-hidden rounded-2xl">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={normalizeVideoUrl(lesson.videoUrl)}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Materials */}
        <CollapsibleSection title="Материалы урока" defaultOpen={true}>
          {contentBlocks.length > 0 ? (
            <div className="space-y-4">
              {contentBlocks.map((block, i) =>
                block.type === "heading" ? (
                  <h3 key={i} className="text-lg font-bold mt-2">{block.text}</h3>
                ) : (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>
                )
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Материалы урока пока не опубликованы.</p>
          )}

          {lesson.media.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 mt-4">
              {lesson.media.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium">{item.filename ?? "Файл"}</p>
                    <p className="text-[10px] text-muted-foreground">{item.type}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Quizzes */}
        {lesson.quizzes.length > 0 && (
          <CollapsibleSection title={`Тесты (${lesson.quizzes.length})`} defaultOpen={false}>
            <div className="space-y-2">
              {lesson.quizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
          </CollapsibleSection>
        )}

        {/* Assignments */}
        {lesson.assignments.length > 0 && (
          <CollapsibleSection title={`Задания (${lesson.assignments.length})`} defaultOpen={false}>
            <div className="space-y-2">
              {lesson.assignments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border p-3">
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
          </CollapsibleSection>
        )}

        {/* Support */}
        <CollapsibleSection title="Поддержка" defaultOpen={false}>
          <p className="text-sm text-muted-foreground">Для связи с куратором используйте чат в уроке.</p>
        </CollapsibleSection>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {lesson.prevLesson ? (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/student/lessons/${lesson.prevLesson.id}`}>
                <ArrowLeft className="h-4 w-4" />
                {lesson.prevLesson.title}
              </Link>
            </Button>
          ) : <div />}
          {lesson.nextLesson ? (
            lesson.nextLesson.locked ? (
              <Button size="sm" disabled title="Урок заблокирован">
                {lesson.nextLesson.title}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href={`/student/lessons/${lesson.nextLesson.id}`}>
                  {lesson.nextLesson.title}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
