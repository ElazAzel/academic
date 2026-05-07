import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, QuestionType } from "@prisma/client";

type Context = { params: Promise<{ quizId: string, questionId: string }> };

const prisma = getPrisma();

const updateQuestionSchema = z.object({
  prompt: z.string().min(1).optional(),
  type: z.nativeEnum(QuestionType).optional(),
  points: z.number().int().min(1).optional(),
  options: z.array(z.unknown()).optional(),
  correctAnswer: z.unknown().optional(),
});

export async function PATCH(request: Request, context: Context) {
  try {
    await requireUser("quizzes:write");
    const { questionId } = await context.params;
    const input = await parseJson(request, updateQuestionSchema);
    
    const question = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...input,
        options: input.options as Prisma.InputJsonValue,
        correctAnswer: input.correctAnswer as Prisma.InputJsonValue
      }
    });
    
    return ok(question);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireUser("quizzes:write");
    const { questionId } = await context.params;
    await prisma.quizQuestion.delete({ where: { id: questionId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
