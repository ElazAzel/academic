"use client";

import type { CourseBuilderDetail, BuilderModuleDetail, BuilderLessonDetail } from "@/types/domain";

type SelectedNode =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "lesson"; moduleId: string; lessonId: string };

export function CourseSettingsPanel({
  selected,
  detail,
  module: mod,
  lesson,
}: {
  selected: SelectedNode;
  detail: CourseBuilderDetail;
  module?: BuilderModuleDetail;
  lesson?: BuilderLessonDetail;
  onChange?: () => void;
}) {
  if (selected.type === "course") {
    return (
      <div className="space-y-5">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Настройки курса</h3>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Режим прохождения</label>
          <p className="text-sm font-medium capitalize">{detail.traversalMode === "sequential" ? "Последовательный" : "Свободный"}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Порог завершения</label>
          <p className="text-sm font-medium">{detail.completionThreshold}%</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Статус</label>
          <p className="text-sm font-medium">{detail.status === "DRAFT" ? "Черновик" : detail.status === "PUBLISHED" ? "Опубликован" : "Архив"}</p>
        </div>
      </div>
    );
  }

  if (selected.type === "module" && mod) {
    return (
      <div className="space-y-5">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Настройки модуля</h3>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Статус</label>
          <p className="text-sm font-medium">{mod.status === "DRAFT" ? "Черновик" : mod.status === "PUBLISHED" ? "Опубликован" : "Архив"}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Рекомендуемых дней</label>
          <p className="text-sm font-medium">{mod.recommendedDays}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Уроков</label>
          <p className="text-sm font-medium">{mod.lessons.length}</p>
        </div>
      </div>
    );
  }

  if (selected.type === "lesson" && lesson) {
    return (
      <div className="space-y-5">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Настройки урока</h3>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Тип</label>
          <p className="text-sm font-medium">{lesson.type}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Длительность</label>
          <p className="text-sm font-medium">{lesson.durationMinutes} мин</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Обязательный</label>
          <p className="text-sm font-medium">{lesson.isRequired ? "Да" : "Нет"}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Тесты</label>
          <p className="text-sm font-medium">{lesson.quizzes.length}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Задания</label>
          <p className="text-sm font-medium">{lesson.assignments.length}</p>
        </div>
      </div>
    );
  }

  return null;
}
