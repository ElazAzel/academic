import type { CourseBuilderSelectedNode } from "@/components/lms/course-builder-shell";
import type { CourseBuilderDetail } from "@/types/domain";

export function resolveCourseBuilderSelection(
  detail: CourseBuilderDetail,
  searchParams?: {
    moduleId?: string | string[];
    blockId?: string | string[];
    lessonId?: string | string[];
  },
): CourseBuilderSelectedNode {
  const moduleId = typeof searchParams?.moduleId === "string" ? searchParams.moduleId : undefined;
  const blockId = typeof searchParams?.blockId === "string" ? searchParams.blockId : undefined;
  const lessonId = typeof searchParams?.lessonId === "string" ? searchParams.lessonId : undefined;

  if (lessonId) {
    for (const mod of detail.modules) {
      const rootLesson = mod.lessons.find((lesson) => lesson.id === lessonId);
      if (rootLesson) return { type: "lesson", moduleId: mod.id, lessonId };
      for (const block of mod.blocks) {
        if (block.lessons.some((lesson) => lesson.id === lessonId)) {
          return { type: "lesson", moduleId: mod.id, blockId: block.id, lessonId };
        }
      }
    }
  }

  if (blockId) {
    for (const mod of detail.modules) {
      if (mod.blocks.some((block) => block.id === blockId)) return { type: "block", moduleId: mod.id, blockId };
    }
  }

  if (moduleId && detail.modules.some((mod) => mod.id === moduleId)) {
    return { type: "module", moduleId };
  }

  return { type: "course" };
}
