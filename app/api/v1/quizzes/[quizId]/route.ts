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
    const { quizId } = await context.params;
    const input = await parseJson(request, updateQuizSchema);
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { courseId: true }
    });
    if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);
    if (quiz.courseId) await assertCourseInstructor(user.id, quiz.courseId);

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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { courseId: true }
    });
    if (!quiz) throw new ApiError("not_found", "Тест не найден", 404);
    if (quiz.courseId) await assertCourseInstructor(user.id, quiz.courseId);

    await prisma.quiz.delete({ where: { id: quizId } });
    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
