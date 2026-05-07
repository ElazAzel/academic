import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { z } from "zod";

type Context = { params: Promise<{ quizId: string }> };

const prisma = getPrisma();

const updateQuizSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  passThreshold: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
});

export async function GET(_request: Request, context: Context) {
  try {
    await requireUser("courses:read");
    const { quizId } = await context.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: "asc" } } }
    });
    if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);
    return ok(quiz);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("quizzes:write");
    const { quizId } = await context.params;
    const input = await parseJson(request, updateQuizSchema);
    
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: input
    });
    
    return ok(quiz);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await requireUser("quizzes:write");
    const { quizId } = await context.params;
    await prisma.quiz.delete({ where: { id: quizId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
