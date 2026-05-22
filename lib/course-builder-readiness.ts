import type { BuilderLessonDetail, CourseBuilderDetail } from "@/types/domain";

export type CourseBuilderPublishCheckStatus = "passed" | "failed";

export interface CourseBuilderPublishCheck {
  id: string;
  label: string;
  description: string;
  status: CourseBuilderPublishCheckStatus;
  passed: boolean;
  target?: {
    type: "course" | "module" | "block" | "lesson";
    moduleId?: string;
    blockId?: string;
    lessonId?: string;
  };
}

interface EnrichedBuilderLessonDetail extends BuilderLessonDetail {
  moduleId: string;
}

function getAllLessons(detail: CourseBuilderDetail): EnrichedBuilderLessonDetail[] {
  return (detail.modules ?? []).flatMap((mod) => [
    ...(mod.lessons ?? []).map((l) => ({ ...l, moduleId: mod.id })),
    ...(mod.blocks ?? []).flatMap((block) => (block.lessons ?? []).map((l) => ({ ...l, moduleId: mod.id }))),
  ]);
}

function hasLessonContent(lesson: BuilderLessonDetail) {
  const blocks = Array.isArray(lesson.content?.blocks) ? lesson.content.blocks : [];
  return Boolean(
    lesson.videoUrl ||
      blocks.length > 0 ||
      (lesson.quizzes?.length ?? 0) > 0 ||
      (lesson.assignments?.length ?? 0) > 0,
  );
}

export function getCourseBuilderPublishChecks(detail: CourseBuilderDetail): CourseBuilderPublishCheck[] {
  const lessons = getAllLessons(detail);
  const requiredLessons = lessons.filter((lesson) => lesson.isRequired);
  
  // Normalize modules list to avoid undefined properties
  const modules = detail.modules ?? [];
  const emptyModules = modules.filter(
    (mod) =>
      (mod.lessons ?? []).length +
        (mod.blocks ?? []).reduce((sum, block) => sum + (block.lessons ?? []).length, 0) ===
      0
  );
  
  const emptyLessons = lessons.filter((lesson) => !hasLessonContent(lesson));

  const checks: CourseBuilderPublishCheck[] = [
    {
      id: "course-basics",
      label: "Карточка курса заполнена",
      description: "Нужны название (мин. 3 символа), описание (мин. 10 символов), длительность (мин. 1 час) и порог завершения (1-100%).",
      status:
        (detail.title ?? "").trim().length >= 3 &&
        (detail.description ?? "").trim().length >= 10 &&
        (detail.durationHours ?? 0) >= 1 &&
        (detail.completionThreshold ?? 0) >= 1 &&
        (detail.completionThreshold ?? 0) <= 100
          ? "passed"
          : "failed",
      target: { type: "course" },
    },
    {
      id: "modules",
      label: "Есть структура курса",
      description: "В курсе должен быть хотя бы один модуль.",
      status: modules.length > 0 ? "passed" : "failed",
      target: { type: "course" },
    },
    {
      id: "module-content",
      label: "Модули содержат уроки",
      description: emptyModules.length > 0 
        ? `Без уроков: ${emptyModules.map((mod) => mod.title).join(", ")}` 
        : "Каждый модуль содержит уроки.",
      status: modules.length > 0 && emptyModules.length === 0 ? "passed" : "failed",
    },
    {
      id: "lessons",
      label: "Есть обязательные уроки",
      description: "Completion считается по обязательным урокам; если их нет, публикация будет неуправляемой.",
      status: requiredLessons.length > 0 ? "passed" : "failed",
    },
    {
      id: "lesson-content",
      label: "Уроки имеют содержимое",
      description: emptyLessons.length > 0 
        ? `Без материалов: ${emptyLessons.map((lesson) => lesson.title).join(", ")}` 
        : "У каждого урока есть материал, тест или задание.",
      status: lessons.length > 0 && emptyLessons.length === 0 ? "passed" : "failed",
    },
  ];

  // Append individual actionable items for empty modules to offer clickable targets
  if (emptyModules.length > 0) {
    emptyModules.forEach((mod) => {
      checks.push({
        id: `module-empty-${mod.id}`,
        label: `Модуль "${mod.title}" пуст`,
        description: "Кликните, чтобы перейти и добавить уроки или блоки в этот модуль.",
        status: "failed",
        target: { type: "module", moduleId: mod.id },
      });
    });
  }

  // Append individual actionable items for empty lessons to offer clickable targets
  if (emptyLessons.length > 0) {
    emptyLessons.forEach((lesson) => {
      checks.push({
        id: `lesson-empty-${lesson.id}`,
        label: `Урок "${lesson.title}" не содержит контента`,
        description: "Кликните, чтобы перейти и наполнить этот урок учебными материалами.",
        status: "failed",
        target: {
          type: "lesson",
          moduleId: lesson.moduleId,
          blockId: lesson.blockId ?? undefined,
          lessonId: lesson.id,
        },
      });
    });
  }

  return checks.map((c) => ({
    ...c,
    passed: c.status === "passed",
  }));
}

export function isCourseBuilderReadyToPublish(detail: CourseBuilderDetail) {
  return getCourseBuilderPublishChecks(detail).every((check) => check.status === "passed");
}

