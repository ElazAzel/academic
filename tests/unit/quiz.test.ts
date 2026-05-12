import { describe, expect, it } from "vitest";
import { gradeObjectiveQuiz } from "@/server/modules/quizzes/service";

describe("quiz grading", () => {
  it("autogrades objective questions", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } },
        { id: "q2", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: ["b", "c"] } }
      ],
      { q1: "a", q2: ["c", "b"] },
      80
    );
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("fails below threshold", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } }],
      { q1: "b" },
      80
    );
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("applies partial credit for mixed answers", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } },
        { id: "q2", type: "MULTIPLE_CHOICE", points: 2, correctAnswer: { values: ["b", "c"] } }
      ],
      { q1: "a", q2: ["x", "y"] },
      80
    );
    expect(result.earned).toBe(1);
    expect(result.total).toBe(3);
    expect(result.score).toBe(33);
    expect(result.passed).toBe(false);
  });

  it("returns 0 score when total points is zero", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 0, correctAnswer: { value: "a" } },
        { id: "q2", type: "SINGLE_CHOICE", points: 0, correctAnswer: { value: "b" } }
      ],
      { q1: "a", q2: "b" },
      50
    );
    expect(result.earned).toBe(0);
    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("handles legacy index-based correct answers", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { index: 0 }, options: ["a", "b", "c"] }],
      { q1: "a" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("passes when score exactly meets threshold", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 2, correctAnswer: { value: "a" } }],
      { q1: "a" },
      100
    );
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("fails when score is one below threshold", () => {
    const result = gradeObjectiveQuiz(
      [
        { id: "q1", type: "SINGLE_CHOICE", points: 2, correctAnswer: { value: "a" } },
        { id: "q2", type: "SINGLE_CHOICE", points: 2, correctAnswer: { value: "b" } }
      ],
      { q1: "a", q2: "x" },
      51
    );
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  it("handles empty answers gracefully", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } }],
      {},
      50
    );
    expect(result.earned).toBe(0);
    expect(result.total).toBe(1);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("ignores answers for non-existent questions", () => {
    const result = gradeObjectiveQuiz(
      [{ id: "q1", type: "SINGLE_CHOICE", points: 1, correctAnswer: { value: "a" } }],
      { q1: "a", ghost: "b" },
      50
    );
    expect(result.earned).toBe(1);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });
});

