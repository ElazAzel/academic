"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LessonBlockEditor } from "@/components/lms/lesson-block-editor";
import { QuizCreator } from "@/components/lms/quiz-creator";
import { AssignmentCreator } from "@/components/lms/assignment-creator";
import type { AssignmentSummary, BuilderLessonDetail, QuizSummary } from "@/types/domain";

export function LessonEditor({
  lesson,
  onChange,
  courseId,
  onQuizCreated,
  onAssignmentCreated,
}: {
  lesson: BuilderLessonDetail;
  onChange: (updates: Partial<BuilderLessonDetail>) => void;
  courseId?: string;
  onQuizCreated?: (quiz: QuizSummary) => void;
  onAssignmentCreated?: (assignment: AssignmentSummary) => void;
}) {
  const [showBlockEditor, setShowBlockEditor] = useState(true);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Название урока</label>
        <input
          className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={lesson.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Краткое описание</label>
        <textarea
          className="w-full min-h-[80px] rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={lesson.summary ?? ""}
          onChange={(e) => onChange({ summary: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Тип</label>
          <select
            className="w-full h-10 rounded-xl border bg-background px-3 text-sm"
            value={lesson.type}
            onChange={(e) => onChange({ type: e.target.value as BuilderLessonDetail["type"] })}
          >
            <option value="MIXED">Смешанный</option>
            <option value="VIDEO">Видео</option>
            <option value="TEXT">Текст</option>
            <option value="DOCUMENT">Документ</option>
            <option value="QUIZ">Тест</option>
            <option value="ASSIGNMENT">Задание</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Длительность (мин)</label>
          <input
            type="number"
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={lesson.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Обязательный</label>
          <select
            className="w-full h-10 rounded-xl border bg-background px-3 text-sm"
            value={lesson.isRequired ? "true" : "false"}
            onChange={(e) => onChange({ isRequired: e.target.value === "true" })}
          >
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">URL видео (если применимо)</label>
        <input
          className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={lesson.videoUrl ?? ""}
          onChange={(e) => onChange({ videoUrl: e.target.value || null })}
          placeholder="https://youtube.com/embed/..."
        />
      </div>

      {/* Quiz / Assignment toolbar */}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {(lesson.quizzes?.length ?? 0) > 0 && (
          <div className="w-full mb-2">
            <p className="text-xs text-muted-foreground mb-1">Тесты в уроке: {(lesson.quizzes ?? []).map((q) => q.title).join(", ")}</p>
          </div>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowQuizCreator(!showQuizCreator)}>
          {showQuizCreator ? "Закрыть" : "Добавить тест"}
        </Button>
        {(lesson.assignments?.length ?? 0) > 0 && (
          <div className="w-full mb-2">
            <p className="text-xs text-muted-foreground mb-1">Задания в уроке: {(lesson.assignments ?? []).map((a) => a.title).join(", ")}</p>
          </div>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowAssignmentCreator(!showAssignmentCreator)}>
          {showAssignmentCreator ? "Закрыть" : "Добавить задание"}
        </Button>
      </div>

      {showQuizCreator && courseId && (
        <QuizCreator
          lessonId={lesson.id}
          courseId={courseId}
          onCreated={(quiz) => {
            onQuizCreated?.(quiz);
            setShowQuizCreator(false);
          }}
          onCancel={() => setShowQuizCreator(false)}
        />
      )}

      {showAssignmentCreator && courseId && (
        <AssignmentCreator
          lessonId={lesson.id}
          courseId={courseId}
          onCreated={(assignment) => {
            onAssignmentCreated?.(assignment);
            setShowAssignmentCreator(false);
          }}
          onCancel={() => setShowAssignmentCreator(false)}
        />
      )}

      {/* Block editor */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Блоки контента</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowBlockEditor(!showBlockEditor)}>
            {showBlockEditor ? "Скрыть" : "Показать"}
          </Button>
        </div>
        {showBlockEditor && (
          <LessonBlockEditor
            lessonId={lesson.id}
            content={lesson.content}
            quizzes={lesson.quizzes}
            assignments={lesson.assignments}
          />
        )}
      </div>
    </div>
  );
}
