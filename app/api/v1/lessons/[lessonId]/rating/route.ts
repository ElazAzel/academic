import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";

const prisma = getPrisma();

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(4),
  comment: z.string().max(2000).optional(),
});

type Context = { params: Promise<{ lessonId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { lessonId } = await context.params;
    const input = await parseJson(request, ratingSchema);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    });

    if (!lesson) {
      return errorResponse(new ApiError("not_found", "Урок не найден", 404));
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: lesson.module.courseId },
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      return errorResponse(new ApiError("forbidden", "Нет доступа: вы не зачислены на курс", 403));
    }

    const rating = await prisma.lessonRating.upsert({
      where: {
        lessonId_userId: {
          lessonId,
          userId: user.id,
        },
      },
      update: {
        score: input.rating,
        comment: input.comment,
      },
      create: {
        lessonId,
        userId: user.id,
        score: input.rating,
        comment: input.comment,
      },
    });

    return ok(rating);
  } catch (error) {
    return errorResponse(error);
  }
}