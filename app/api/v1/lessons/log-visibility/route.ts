import { ApiError, errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { assertLearningContentAccess } from "@/server/modules/courses/access";
import { logVisibilityChange } from "@/server/modules/security/content-protection-server";
import { z } from "zod";

const prisma = getPrisma();

const schema = z.object({
  lessonId: z.string().min(1),
  state: z.enum(["hidden", "visible"]),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser("courses:read");
    const input = await parseJson(request, schema);

    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      select: { module: { select: { courseId: true } } },
    });
    if (!lesson) throw new ApiError("not_found", "Урок не найден", 404);

    await assertLearningContentAccess(user, lesson.module.courseId);

    await logVisibilityChange({
      userId: user.id,
      lessonId: input.lessonId,
      state: input.state,
    });

    return ok({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
