"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { CourseBuilderPublishCheck } from "@/lib/course-builder-readiness";
import type { CourseBuilderDetail, BuilderModuleDetail, BuilderLessonDetail } from "@/types/domain";

type SelectedNode =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "block"; moduleId: string; blockId: string }
  | { type: "lesson"; moduleId: string; lessonId: string; blockId?: string };

export function CourseSettingsPanel({
  selected,
  detail,
  module: mod,
  lesson,
  publishChecks = [],
}: {
  selected: SelectedNode;
  detail: CourseBuilderDetail;
  module?: BuilderModuleDetail;
  lesson?: BuilderLessonDetail;
  publishChecks?: CourseBuilderPublishCheck[];
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
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Модулей</label>
          <p className="text-sm font-medium">{detail.modules.length}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Всего уроков</label>
          <p className="text-sm font-medium">
            {detail.modules.reduce((sum, mod) => {
              const rootLessons = mod.lessons?.length ?? 0;
              const blockLessons = (mod.blocks ?? []).reduce((bs, block) => bs + (block.lessons?.length ?? 0), 0);
              return sum + rootLessons + blockLessons;
            }, 0)}
          </p>
        </div>
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Готовность к публикации</h4>
          {publishChecks.map((check) => {
            const Icon = check.status === "passed" ? CheckCircle2 : XCircle;
            return (
              <div key={check.id} className="flex gap-2">
                <Icon className={check.status === "passed" ? "mt-0.5 h-4 w-4 shrink-0 text-emerald-600" : "mt-0.5 h-4 w-4 shrink-0 text-amber-600"} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{check.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        {detail.coverUrl && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Обложка</label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={detail.coverUrl} alt="" className="w-full rounded-lg object-cover h-24" />
          </div>
        )}
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
          <p className="text-sm font-medium">{(mod.lessons?.length ?? 0) + (mod.blocks ?? []).reduce((sum, block) => sum + (block.lessons?.length ?? 0), 0)}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Описание</label>
          <p className="text-sm text-muted-foreground">{mod.description ?? "—"}</p>
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
          <p className="text-sm font-medium capitalize">{lesson.type === "MIXED" ? "Смешанный" : lesson.type}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Длительность</label>
          <p className="text-sm font-medium">{lesson.durationMinutes} мин</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Обязательный</label>
          <p className="text-sm font-medium">{lesson.isRequired ? "Да" : "Нет"}</p>
        </div>
        {lesson.summary && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Описание</label>
            <p className="text-sm text-muted-foreground">{lesson.summary}</p>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Тестов</label>
          <p className="text-sm font-medium">{lesson.quizzes?.length ?? 0}</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Заданий</label>
          <p className="text-sm font-medium">{lesson.assignments?.length ?? 0}</p>
        </div>
        {lesson.quizzes && lesson.quizzes.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Тесты</label>
            {lesson.quizzes.map((q) => (
              <p key={q.id} className="text-xs text-muted-foreground">• {q.title}</p>
            ))}
          </div>
        )}
        {lesson.assignments && lesson.assignments.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Задания</label>
            {lesson.assignments.map((a) => (
              <p key={a.id} className="text-xs text-muted-foreground">• {a.title}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
