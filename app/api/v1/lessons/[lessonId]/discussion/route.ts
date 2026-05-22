import { errorResponse, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getLessonDiscussion } from "@/server/modules/discussion/service";

type Context = { params: Promise<{ lessonId: string }> };

/**
 * GET /api/v1/lessons/:lessonId/discussion
 *
 * Возвращает все посты обсуждения урока.
 */
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser("courses:read");
    const { lessonId } = await context.params;
    return ok(await getLessonDiscussion(user.id, lessonId));
  } catch (error) {
    return errorResponse(error);
  }
}
