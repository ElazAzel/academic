import { errorResponse, created, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { assertInstructorOfCourse } from "@/server/modules/courses/service";
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
    const user = await requireUser("quizzes:write");
    const { quizId } = await context.params;
    const input = await parseJson(request, createQuestionSchema);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        courseId: true,
        lesson: {
          select: {
            module: { select: { courseId: true } },
          },
        },
      },
    });
    if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);
    const courseId = quiz.courseId ?? quiz.lesson?.module.courseId;
    if (!courseId) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);
    
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
