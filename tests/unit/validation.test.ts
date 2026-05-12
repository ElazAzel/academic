import { describe, expect, it } from "vitest";
import { courseSchema, lessonSchema, enrollmentSchema, progressSchema } from "@/lib/validation";

describe("courseSchema", () => {
  it("accepts valid course input", () => {
    const result = courseSchema.safeParse({
      title: "AI Strategy",
      description: "Learn AI strategy fundamentals for leaders.",
      durationHours: 40,
    });
    expect(result.success).toBe(true);
  });

  it("rejects short title", () => {
    const result = courseSchema.safeParse({
      title: "AB",
      description: "Valid description here.",
      durationHours: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe("lessonSchema", () => {
  it("accepts valid lesson with defaults", () => {
    const result = lessonSchema.safeParse({
      title: "Introduction to AI",
      order: 1,
      type: "TEXT",
      durationMinutes: 15,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRequired).toBe(true);
      expect(result.data.content).toEqual({});
    }
  });
});

describe("enrollmentSchema", () => {
  it("accepts enrollment without cohort", () => {
    const result = enrollmentSchema.safeParse({
      userId: "user-1",
      courseId: "course-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("progressSchema", () => {
  it("accepts valid progress", () => {
    const result = progressSchema.safeParse({ lessonId: "lesson-1", percent: 50 });
    expect(result.success).toBe(true);
  });

  it("rejects negative percent", () => {
    const result = progressSchema.safeParse({ lessonId: "lesson-1", percent: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects percent above 100", () => {
    const result = progressSchema.safeParse({ lessonId: "lesson-1", percent: 101 });
    expect(result.success).toBe(false);
  });
});
