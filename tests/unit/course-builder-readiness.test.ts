import { describe, expect, it } from "vitest";
import { getCourseBuilderPublishChecks, isCourseBuilderReadyToPublish } from "@/lib/course-builder-readiness";
import type { CourseBuilderDetail } from "@/types/domain";

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
    expect(getCourseBuilderPublishChecks(readyCourse).every((check) => check.status === "passed")).toBe(true);
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
    expect(checks.find((check) => check.id === "lesson-content")?.status).toBe("failed");
  });
});
