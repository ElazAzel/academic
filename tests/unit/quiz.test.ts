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
});

