"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/page-guards";
import { getAnswerSuggestions, type Suggestion } from "@/server/modules/nlp/suggestions";
import { ApiError } from "@/lib/http";

const GetSuggestionsSchema = z.object({
  questionText: z
    .string()
    .trim()
    .min(3, "Текст вопроса должен содержать минимум 3 символа")
    .max(2000, "Текст вопроса слишком длинный"),
});

export async function getQuestionSuggestionsAction(questionText: string): Promise<Suggestion[]> {
  try {
    await requireRole(["curator", "super_curator", "admin"]);

    const parsed = GetSuggestionsSchema.safeParse({ questionText });
    if (!parsed.success) {
      throw new ApiError("bad_request", parsed.error.errors[0]?.message ?? "Некорректные данные", 400);
    }

    return await getAnswerSuggestions(parsed.data.questionText);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("[getQuestionSuggestionsAction]", error);
    throw new ApiError("internal_error", "Ошибка при получении подсказок", 500);
  }
}
