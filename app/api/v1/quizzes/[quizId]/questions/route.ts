import { errorResponse, created, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, QuestionType } from "@prisma/client";

type Context = { params: Promise<{ quizId: string }> };

const prisma = getPrisma();

const createQuestionSchema = z.object({
  prompt: z.string().min(1),
  type: z.nativeEnum(QuestionType).default("SINGLE_CHOICE"),
  points: z.number().int().min(1).default(1),
  options: z.array(z.unknown()).default([]),
  correctAnswer: z.unknown().default({}),
});

export async function POST(request: Request, context: Context) {
  try {
    await requireUser("quizzes:write");
    const { quizId } = await context.params;
    const input = await parseJson(request, createQuestionSchema);
    
    const count = await prisma.quizQuestion.count({ where: { quizId } });
    
    const question = await prisma.quizQuestion.create({
      data: {
        prompt: input.prompt,
        type: (input.type || "SINGLE_CHOICE") as QuestionType,
        points: input.points || 1,
        options: (input.options || []) as Prisma.InputJsonValue,
        correctAnswer: (input.correctAnswer || {}) as Prisma.InputJsonValue,
        quizId,
        order: count
      }
    });
    
    return created(question);
  } catch (error) {
    return errorResponse(error);
  }
}
