import type { BuilderLessonDetail, CourseBuilderDetail } from "@/types/domain";

export type CourseBuilderPublishCheckStatus = "passed" | "failed";

export interface CourseBuilderPublishCheck {
  id: string;
  label: string;
  description: string;
  status: CourseBuilderPublishCheckStatus;
}

function getAllLessons(detail: CourseBuilderDetail): BuilderLessonDetail[] {
  return detail.modules.flatMap((mod) => [
    ...mod.lessons,
    ...mod.blocks.flatMap((block) => block.lessons),
  ]);
}

function hasLessonContent(lesson: BuilderLessonDetail) {
  const blocks = Array.isArray(lesson.content?.blocks) ? lesson.content.blocks : [];
  return Boolean(
    lesson.videoUrl ||
      blocks.length > 0 ||
      lesson.quizzes.length > 0 ||
      lesson.assignments.length > 0,
  );
}

export function getCourseBuilderPublishChecks(detail: CourseBuilderDetail): CourseBuilderPublishCheck[] {
  const lessons = getAllLessons(detail);
  const requiredLessons = lessons.filter((lesson) => lesson.isRequired);
  const emptyModules = detail.modules.filter((mod) => mod.lessons.length + mod.blocks.flatMap((block) => block.lessons).length === 0);
  const emptyLessons = lessons.filter((lesson) => !hasLessonContent(lesson));

  return [
    {
      id: "course-basics",
      label: "Карточка курса заполнена",
      description: "Нужны название, описание, длительность и порог завершения.",
      status:
        detail.title.trim().length >= 3 &&
        detail.description.trim().length >= 10 &&
        detail.durationHours >= 1 &&
        detail.completionThreshold >= 1 &&
        detail.completionThreshold <= 100
          ? "passed"
          : "failed",
    },
    {
      id: "modules",
      label: "Есть структура курса",
      description: "В курсе должен быть хотя бы один модуль.",
      status: detail.modules.length > 0 ? "passed" : "failed",
    },
    {
      id: "module-content",
      label: "Модули содержат уроки",
      description: emptyModules.length > 0 ? `Без уроков: ${emptyModules.map((mod) => mod.title).join(", ")}` : "Каждый модуль содержит уроки.",
      status: detail.modules.length > 0 && emptyModules.length === 0 ? "passed" : "failed",
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
      description: emptyLessons.length > 0 ? `Без материалов: ${emptyLessons.map((lesson) => lesson.title).join(", ")}` : "У каждого урока есть материал, тест или задание.",
      status: lessons.length > 0 && emptyLessons.length === 0 ? "passed" : "failed",
    },
  ];
}

export function isCourseBuilderReadyToPublish(detail: CourseBuilderDetail) {
  return getCourseBuilderPublishChecks(detail).every((check) => check.status === "passed");
}
