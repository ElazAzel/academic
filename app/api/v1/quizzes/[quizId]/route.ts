import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getQuizForActor } from "@/server/modules/quizzes/service";
import { assertInstructorOfCourse } from "@/server/modules/courses/service";
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
    const user = await requireUser("courses:read");
    const { quizId } = await context.params;
    return ok(await getQuizForActor(user, quizId));
  } catch (error) {
    return errorResponse(error);
  }
}

async function getQuizCourseId(quizId: string) {
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
  return quiz.courseId ?? quiz.lesson?.module.courseId ?? null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("quizzes:write");
    const { quizId } = await context.params;
    const input = await parseJson(request, updateQuizSchema);
    
    const courseId = await getQuizCourseId(quizId);
    if (!courseId) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: input
    });
    
    return ok(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("quizzes:write");
    const { quizId } = await context.params;

    const courseId = await getQuizCourseId(quizId);
    if (!courseId) throw new ApiError("bad_request", "Тест не привязан к курсу", 400);
    await assertInstructorOfCourse(user.id, courseId);

    await prisma.quiz.delete({ where: { id: quizId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
