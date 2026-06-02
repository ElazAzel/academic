import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { assertInstructorOfCourse } from "@/server/modules/courses/service";
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
    const user = await requireUser("quizzes:write");
    const { quizId, questionId } = await context.params;
    const input = await parseJson(request, updateQuestionSchema);

    const question = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
      include: {
        quiz: {
          select: {
            courseId: true,
            lesson: {
              select: {
                module: { select: { courseId: true } },
              },
            },
          },
        },
      },
    });
    if (!question) throw new ApiError("not_found", "Вопрос не найден", 404);
    const courseId = question.quiz.courseId ?? question.quiz.lesson?.module.courseId;
    if (!courseId) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);
    
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
    const { quizId, questionId } = await context.params;

    const question = await prisma.quizQuestion.findFirst({
      where: { id: questionId, quizId },
      include: {
        quiz: {
          select: {
            courseId: true,
            lesson: {
              select: {
                module: { select: { courseId: true } },
              },
            },
          },
        },
      },
    });
    if (!question) throw new ApiError("not_found", "Вопрос не найден", 404);
    const courseId = question.quiz.courseId ?? question.quiz.lesson?.module.courseId;
    if (!courseId) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);

    await prisma.quizQuestion.delete({ where: { id: questionId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
