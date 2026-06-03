import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockGetAnswerSuggestions = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("@/server/modules/nlp/suggestions", () => ({
  getAnswerSuggestions: mockGetAnswerSuggestions,
}));

const { getQuestionSuggestionsAction } = await import("@/server/actions/assistant");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockRequireRole.mockResolvedValue({ id: "curator-1", roles: ["curator"] });
  mockGetAnswerSuggestions.mockResolvedValue([
    {
      id: "suggestion-1",
      question: "Как сдать финальное задание?",
      answer: "Откройте урок с финальным заданием и прикрепите файл в блоке задания.",
      category: "Задания",
      direction: "Операции",
      rank: 3,
    },
  ]);
});

describe("getQuestionSuggestionsAction", () => {
  it("checks curator role before reading assistant suggestions", async () => {
    mockRequireRole.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    await expect(getQuestionSuggestionsAction("финальное задание")).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });

    expect(mockRequireRole).toHaveBeenCalledWith(["curator", "super_curator", "admin"]);
    expect(mockGetAnswerSuggestions).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("validates question text before searching glossary suggestions", async () => {
    await expect(getQuestionSuggestionsAction("  а ")).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });

    expect(mockRequireRole).toHaveBeenCalledWith(["curator", "super_curator", "admin"]);
    expect(mockGetAnswerSuggestions).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("rejects oversized question text before searching glossary suggestions", async () => {
    await expect(getQuestionSuggestionsAction("x".repeat(2001))).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
      message: "Текст вопроса слишком длинный",
    });

    expect(mockRequireRole).toHaveBeenCalledWith(["curator", "super_curator", "admin"]);
    expect(mockGetAnswerSuggestions).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns glossary suggestions for allowed curator roles", async () => {
    const result = await getQuestionSuggestionsAction("Как сдать финальное задание?");

    expect(result).toEqual([
      expect.objectContaining({
        id: "suggestion-1",
        answer: "Откройте урок с финальным заданием и прикрепите файл в блоке задания.",
      }),
    ]);
    expect(mockGetAnswerSuggestions).toHaveBeenCalledWith("Как сдать финальное задание?");
  });

  it("wraps unexpected assistant failures without exposing raw backend details", async () => {
    mockGetAnswerSuggestions.mockRejectedValue(new Error("postgres://secret-assistant-error"));

    await expect(getQuestionSuggestionsAction("финальное задание")).rejects.toMatchObject({
      code: "internal_error",
      message: "Ошибка при получении подсказок",
      status: 500,
    });

    expect(JSON.stringify(mockGetAnswerSuggestions.mock.calls)).not.toContain("secret-assistant-error");
  });
});
