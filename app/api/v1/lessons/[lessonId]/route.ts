import { errorResponse, ok, parseJson, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { lessonSchema } from "@/lib/validation";
import { updateLesson, deleteLesson, getLesson } from "@/server/modules/courses/service";
import { assertLearningContentAccess } from "@/server/modules/courses/access";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

type Context = { params: Promise<{ lessonId: string }> };

const updateLessonSchema = lessonSchema.partial();

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, module: { select: { courseId: true } } },
    });

    if (!lesson) {
      return errorResponse(new ApiError("not_found", "Урок не найден", 404));
    }

    await assertLearningContentAccess(user, lesson.module.courseId);

    return ok(await getLesson(lessonId, true));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    const input = await parseJson(request, updateLessonSchema);
    return ok(await updateLesson(lessonId, input, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:write");
    const { lessonId } = await context.params;
    return ok(await deleteLesson(lessonId, user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
