import { describe, expect, it } from "vitest";
import { getCourseBuilderPublishChecks, isCourseBuilderReadyToPublish } from "@/lib/course-builder-readiness";
import type { CourseBuilderDetail, BuilderModuleDetail } from "@/types/domain";

/** Возвращает курс, у которого у одного модуля отсутствуют поля blocks/lessons. */
function corruptModuleCourse(): CourseBuilderDetail {
  const mod = {
    id: "m1",
    order: 0,
    title: "Module 1",
    description: null,
    recommendedDays: 7,
    status: "DRAFT" as const,
  } as BuilderModuleDetail;
  // mod.blocks и mod.lesson — undefined

  return {
    id: "c1",
    slug: "course",
    title: "AI Strategy",
    description: "Long enough course description",
    goal: null,
    coverUrl: null,
    durationHours: 12,
    status: "DRAFT",
    traversalMode: "sequential",
    completionThreshold: 85,
    modules: [mod],
  };
}

const readyCourse: CourseBuilderDetail = {
  id: "c1",
  slug: "course",
  title: "AI Strategy",
  description: "Long enough course description",
  goal: null,
  coverUrl: null,
  durationHours: 12,
  status: "DRAFT",
  traversalMode: "sequential",
  completionThreshold: 85,
  modules: [
    {
      id: "m1",
      order: 0,
      title: "Module 1",
      description: null,
      recommendedDays: 7,
      status: "DRAFT",
      blocks: [],
      lessons: [
        {
          id: "l1",
          order: 0,
          title: "Lesson 1",
          type: "MIXED",
          summary: null,
          durationMinutes: 30,
          isRequired: true,
          blockId: null,
          content: { blocks: [{ id: "text-1", type: "text", data: { html: "Material" } }] },
          videoUrl: null,
          quizzes: [],
          assignments: [],
        },
      ],
    },
  ],
};

describe("course builder readiness", () => {
  it("passes when course has basics, structure, required lesson, and content", () => {
    expect(isCourseBuilderReadyToPublish(readyCourse)).toBe(true);
    expect(getCourseBuilderPublishChecks(readyCourse).every((check) => check.passed)).toBe(true);
  });

  it("fails when lessons have no content", () => {
    const course: CourseBuilderDetail = {
      ...readyCourse,
      modules: [
        {
          ...readyCourse.modules[0],
          lessons: [{ ...readyCourse.modules[0].lessons[0], content: {}, quizzes: [], assignments: [], videoUrl: null }],
        },
      ],
    };

    const checks = getCourseBuilderPublishChecks(course);

    expect(isCourseBuilderReadyToPublish(course)).toBe(false);
    expect(checks.find((check) => check.id === "lesson-content")?.passed).toBe(false);
  });

  it("returns targets for failed checks", () => {
    const course: CourseBuilderDetail = {
      ...readyCourse,
      modules: [
        {
          ...readyCourse.modules[0],
          lessons: [{ ...readyCourse.modules[0].lessons[0], content: {}, quizzes: [], assignments: [], videoUrl: null }],
        },
      ],
    };

    const checks = getCourseBuilderPublishChecks(course);
    const emptyLessonCheck = checks.find((check) => check.id.startsWith("lesson-empty-"));
    expect(emptyLessonCheck).toBeDefined();
    expect(emptyLessonCheck?.passed).toBe(false);
    expect(emptyLessonCheck?.target?.type).toBe("lesson");
    expect(emptyLessonCheck?.target?.lessonId).toBe("l1");
    expect(emptyLessonCheck?.target?.moduleId).toBe("m1");
  });

  it("handles modules with missing blocks/lessons arrays gracefully", () => {
    const course = corruptModuleCourse();
    expect(() => getCourseBuilderPublishChecks(course)).not.toThrow();
    expect(() => isCourseBuilderReadyToPublish(course)).not.toThrow();
  });

  it("handles modules with blocks but missing lesson arrays gracefully", () => {
    const course = corruptModuleCourse();
    course.modules[0] = {
      ...course.modules[0],
       
      blocks: [{ id: "b1", order: 0, title: "Block 1", description: null }] as any,
    };
    // После as any — block.lessons undefined
    expect(() => getCourseBuilderPublishChecks(course)).not.toThrow();
    expect(() => isCourseBuilderReadyToPublish(course)).not.toThrow();
  });
});

