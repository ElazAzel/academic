import { describe, expect, it } from "vitest";
import { courseSchema, lessonSchema, enrollmentSchema, progressSchema, fromFormData, answerForwardedQuestionSchema, enrollStudentSchema, assignCuratorSchema } from "@/lib/validation";
import { z } from "zod";

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

describe("fromFormData", () => {
  it("converts null to empty string before validation", () => {
    const schema = z.object({ name: fromFormData(z.string().min(1, "Обязательно")) });
    const result = schema.safeParse({ name: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Обязательно");
  });

  it("passes valid string through unchanged", () => {
    const schema = z.object({ name: fromFormData(z.string().min(1)) });
    const result = schema.safeParse({ name: "hello" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("hello");
  });

  it("returns default string schema when none provided", () => {
    const result = fromFormData().safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("");
  });
});

describe("answerForwardedQuestionSchema", () => {
  it("rejects empty answer", () => {
    const result = answerForwardedQuestionSchema.safeParse({ questionId: "q1", answer: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid question and answer", () => {
    const result = answerForwardedQuestionSchema.safeParse({ questionId: "q1", answer: "Valid answer" });
    expect(result.success).toBe(true);
  });
});

describe("enrollStudentSchema", () => {
  it("requires userId and courseId", () => {
    const result = enrollStudentSchema.safeParse({ userId: "", courseId: "" });
    expect(result.success).toBe(false);
  });

  it("allows optional cohortId and curatorId to be undefined", () => {
    const result = enrollStudentSchema.safeParse({ userId: "u1", courseId: "c1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cohortId).toBeUndefined();
      expect(result.data.curatorId).toBeUndefined();
    }
  });
});

describe("assignCuratorSchema", () => {
  it("rejects empty fields", () => {
    const result = assignCuratorSchema.safeParse({ studentId: "", curatorId: "", cohortId: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid assignment data", () => {
    const result = assignCuratorSchema.safeParse({ studentId: "s1", curatorId: "c1", cohortId: "coh1" });
    expect(result.success).toBe(true);
  });
});
