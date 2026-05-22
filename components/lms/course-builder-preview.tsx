"use client";

import { FileText, HelpCircle, MessageSquare, PlayCircle, Star, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BuilderLessonDetail, CourseBuilderDetail, ContentBlock } from "@/types/domain";

function getBlocks(lesson?: BuilderLessonDetail): ContentBlock[] {
  if (!lesson) return [];
  return Array.isArray(lesson.content?.blocks) ? (lesson.content.blocks as ContentBlock[]) : [];
}

function renderBlockLabel(block: ContentBlock) {
  switch (block.type) {
    case "video":
      return "Видео";
    case "text":
      return "Текстовый материал";
    case "file":
      return "Файл";
    case "quiz":
      return "Тест";
    case "assignment":
      return "Задание";
    case "rating":
      return "Оценка урока";
    case "curator_question":
      return "Вопрос куратору";
    case "completion":
      return "Завершение";
  }
}

function blockIcon(block: ContentBlock) {
  if (block.type === "video") return PlayCircle;
  if (block.type === "quiz") return HelpCircle;
  if (block.type === "assignment") return CheckCircle2;
  if (block.type === "rating") return Star;
  if (block.type === "curator_question") return MessageSquare;
  return FileText;
}

export function CourseBuilderPreview({
  detail,
  lesson,
}: {
  detail: CourseBuilderDetail;
  lesson?: BuilderLessonDetail;
}) {
  const blocks = getBlocks(lesson);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Badge variant="outline">{detail.status === "PUBLISHED" ? "Опубликован" : "Черновик"}</Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal text-foreground">{detail.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{detail.description}</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2 text-sm">
              {detail.durationHours} ч · {detail.completionThreshold}%
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-lg font-semibold tracking-normal">
                {lesson ? lesson.title : "Выберите урок для предпросмотра"}
              </h3>
              {lesson?.summary && <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>}
            </div>
            {lesson && (
              <Badge variant={lesson.isRequired ? "default" : "outline"}>
                {lesson.isRequired ? "Обязательный" : "Дополнительный"}
              </Badge>
            )}
          </div>

          {!lesson ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Предпросмотр показывает, как выбранный урок будет выглядеть внутри учебного контекста.
            </p>
          ) : (
            <div className="space-y-3 pt-4">
              {lesson.videoUrl && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    Видео
                  </div>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{lesson.videoUrl}</p>
                </div>
              )}
              {blocks.length === 0 && (lesson.quizzes?.length ?? 0) === 0 && (lesson.assignments?.length ?? 0) === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  В уроке пока нет материалов, тестов или заданий.
                </p>
              ) : (
                blocks.map((block) => {
                  const Icon = blockIcon(block);
                  return (
                    <div key={block.id} className="rounded-xl border bg-background p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-primary" />
                        {renderBlockLabel(block)}
                      </div>
                      {block.type === "text" && (
                        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
                          {block.data.html || "Текст пока не заполнен"}
                        </p>
                      )}
                      {block.type === "quiz" && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {lesson.quizzes.find((quiz) => quiz.id === block.data.quizId)?.title ?? "Тест не выбран"}
                        </p>
                      )}
                      {block.type === "assignment" && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {lesson.assignments.find((assignment) => assignment.id === block.data.assignmentId)?.title ?? "Задание не выбрано"}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-3 rounded-2xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Структура курса</h3>
        {detail.modules.map((mod) => (
          <div key={mod.id} className="rounded-xl bg-muted/40 p-3">
            <p className="text-sm font-medium">{mod.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(mod.blocks?.length ?? 0)} блоков · {(mod.lessons?.length ?? 0) + (mod.blocks ?? []).reduce((sum, block) => sum + (block.lessons?.length ?? 0), 0)} уроков
            </p>
          </div>
        ))}
      </aside>
    </div>
  );
}
