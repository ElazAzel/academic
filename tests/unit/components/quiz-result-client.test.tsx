// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { StudentQuizDetail } from "@/types/domain";

const mockRouterPush = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

const { QuizBlock } = await import("@/components/lms/quiz-block");
const { QuizView } = await import("@/app/student/quizzes/[quizId]/quiz-view");

const quiz: StudentQuizDetail = {
  id: "quiz-1",
  title: "Проверка знаний",
  passThreshold: 80,
  maxAttempts: 3,
  questionsCount: 1,
  courseId: "course-1",
  courseTitle: "Курс",
  lessonId: "lesson-1",
  questions: [
    {
      id: "question-1",
      type: "SINGLE_CHOICE",
      text: "Выберите правильный вариант",
      options: ["A", "B"],
    },
  ],
};

function quizAttemptResponse() {
  return new Response(
    JSON.stringify({
      data: {
        id: "attempt-1",
        score: 100,
        passed: true,
        grading: { score: 100, passed: true },
        xp: { earned: 30, xp: 130 },
      },
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(quizAttemptResponse())));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("quiz client result handling", () => {
  it("shows the passed inline quiz result from the standard API envelope", async () => {
    render(<QuizBlock quiz={quiz} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("radio", { name: "A" }));

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Вы заработали +30 XP! Всего: 130 XP");
  });

  it("opens the exact submitted attempt on the standalone quiz result page", async () => {
    render(<QuizView quiz={quiz} />);

    fireEvent.click(screen.getByRole("radio", { name: "A" }));
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/student/quizzes/quiz-1/result?attemptId=attempt-1");
    });
  });
});
