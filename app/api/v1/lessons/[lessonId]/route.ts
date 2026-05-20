import { errorResponse, ok, parseJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { lessonSchema } from "@/lib/validation";
import { updateLesson, deleteLesson, getLesson } from "@/server/modules/courses/service";

type Context = { params: Promise<{ lessonId: string }> };

const updateLessonSchema = lessonSchema.partial();

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;
    const userRoles = user.roles as string[];
    const isElevated = userRoles.some((r) => ["admin", "super_curator", "curator", "instructor"].includes(r));
    // C2: Студенты получают урок без correctAnswer; elevated роли — с ответами
    return ok(await getLesson(lessonId, !isElevated));
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
