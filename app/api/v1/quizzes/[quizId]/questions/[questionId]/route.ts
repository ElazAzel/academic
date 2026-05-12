import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
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

async function assertCourseInstructor(userId: string, courseId: string | null) {
  if (!courseId) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: { select: { key: true } } } } }
  });
  if (!user) throw new ApiError("forbidden", "Пользователь не найден", 403);
  const roleKeys = user.roles.map((r) => r.role.key);
  if (roleKeys.includes("admin")) return;
  const instructor = await prisma.courseInstructor.findUnique({
    where: { courseId_userId: { courseId, userId } }
  });
  if (!instructor) throw new ApiError("forbidden", "Вы не являетесь преподавателем этого курса", 403);
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("quizzes:write");
    const { questionId } = await context.params;
    const input = await parseJson(request, updateQuestionSchema);

    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { quiz: { select: { courseId: true } } }
    });
    if (!question) throw new ApiError("not_found", "Вопрос не найден", 404);
    await assertCourseInstructor(user.id, question.quiz.courseId);
    
    const updated = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...input,
        options: input.options as Prisma.InputJsonValue,
        correctAnswer: input.correctAnswer as Prisma.InputJsonValue
      }
    });
    
    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("quizzes:write");
    const { questionId } = await context.params;

    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { quiz: { select: { courseId: true } } }
    });
    if (!question) throw new ApiError("not_found", "Вопрос не найден", 404);
    await assertCourseInstructor(user.id, question.quiz.courseId);

    await prisma.quizQuestion.delete({ where: { id: questionId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
