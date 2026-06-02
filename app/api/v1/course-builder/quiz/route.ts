import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { errorResponse, parseJson } from "@/lib/http";
import { createQuizInline } from "@/server/modules/course-builder/service";

const inlineQuizQuestionSchema = z.object({
  type: z.string().trim().min(1, "Тип вопроса обязателен"),
  prompt: z.string().trim().min(1, "Текст вопроса обязателен"),
  options: z.array(z.string()).default([]),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  points: z.coerce.number().int().min(0, "Баллы не могут быть отрицательными"),
});

const inlineQuizSchema = z.object({
  lessonId: z.string().trim().min(1, "ID урока обязателен"),
  courseId: z.string().trim().min(1, "ID курса обязателен"),
  title: z.string().trim().min(1, "Название теста обязательно"),
  description: z.string().trim().optional(),
  passThreshold: z.coerce.number().int().min(0).max(100),
  maxAttempts: z.coerce.number().int().min(1),
  questions: z.array(inlineQuizQuestionSchema).default([]),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:write");
    const input = await parseJson(request, inlineQuizSchema);
    const body = {
      ...input,
      questions: (input.questions ?? []).map((question) => ({
        ...question,
        options: question.options ?? [],
      })),
    };
    const quiz = await createQuizInline(body.lessonId, body, user.id);
    return NextResponse.json(quiz, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
