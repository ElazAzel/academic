import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getLesson } from "@/server/modules/courses/service";

type Context = { params: Promise<{ lessonId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireUser("courses:read");
    const { lessonId } = await context.params;
    return ok(await getLesson(lessonId));
  } catch (error) {
    return errorResponse(error);
  }
}

